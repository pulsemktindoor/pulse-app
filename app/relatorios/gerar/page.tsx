'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Cliente } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, FileText, Printer, Monitor, Save, Pencil, Trash2, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { format, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Ordem fixa de exibição das telas no relatório
const ORDEM_TELAS: Record<string, number> = {
  "Bistrô Pai D'égua 1": 1,
  "Bistrô Pai D'égua 2": 2,
  'Quality Body 1':      3,
  'Quality Body 2':      4,
  'SB Carnes':           5,
}

// Mapeia nome bruto do PDF → nome limpo para o relatório do cliente
function nomeLimpoTela(nomePdf: string): string {
  const n = nomePdf.toLowerCase()
  if (n.includes('halteres'))                        return 'Quality Body 1'
  if (n.includes('saída') || n.includes('saida'))    return 'Quality Body 2'
  if (n.includes('camarote'))                        return "Bistrô Pai D'égua 2"
  if (n.includes('mesas'))                           return "Bistrô Pai D'égua 1"
  if (n.includes('sb') || n.includes('carnes'))      return 'SB Carnes'
  return nomePdf
}

// Locais com acordo de parceria (não são clientes pagantes)
const LOCAIS_PARCEIROS = [
  "Bistrô Pai D'égua",
  "Quality Body",
  "SB Carnes",
]

type TelaDado = { nome: string; total: number; dailyValues: number[] }

type DadosRelatorio = {
  cliente: string
  periodoLabel: string
  dataGeracao: string
  datas: string[]
  nDias: number
  telasDados: TelaDado[]
  totaisDiarios: number[]
  totalPeriodo: number
  mediaDiaria: number
}

function mesclarRelatorios(a: DadosRelatorio, b: DadosRelatorio): DadosRelatorio {
  const telasMap = new Map<string, TelaDado>()
  for (const tela of a.telasDados) telasMap.set(tela.nome, { ...tela, dailyValues: [...tela.dailyValues] })
  for (const tela of b.telasDados) {
    const existing = telasMap.get(tela.nome)
    if (existing) {
      existing.total += tela.total
      existing.dailyValues = existing.dailyValues.map((v, i) => v + (tela.dailyValues[i] || 0))
    } else {
      telasMap.set(tela.nome, { ...tela, dailyValues: [...tela.dailyValues] })
    }
  }
  const telasDados = [...telasMap.values()].sort(
    (x, y) => (ORDEM_TELAS[x.nome] ?? 99) - (ORDEM_TELAS[y.nome] ?? 99)
  )
  // Usa o array mais longo como base para não perder dias quando os PDFs têm períodos diferentes
  const [longerDaily, shorterDaily] = a.totaisDiarios.length >= b.totaisDiarios.length
    ? [a.totaisDiarios, b.totaisDiarios]
    : [b.totaisDiarios, a.totaisDiarios]
  const totaisDiarios = longerDaily.map((v, i) => v + (shorterDaily[i] || 0))
  const datas = a.datas.length >= b.datas.length ? a.datas : b.datas
  const nDias = Math.max(a.nDias, b.nDias)
  const totalPeriodo = a.totalPeriodo + b.totalPeriodo
  const mediaDiaria = nDias > 0 ? Math.round(totalPeriodo / nDias) : 0
  return { ...a, datas, nDias, telasDados, totaisDiarios, totalPeriodo, mediaDiaria }
}

async function parsePdfCliente(file: File): Promise<DadosRelatorio> {
  const pdfjsLib = await import('pdfjs-dist')

  const workerResp = await fetch('/pdf.worker.min.mjs')
  const workerText = await workerResp.text()
  const workerBlob = new Blob([workerText], { type: 'text/javascript' })
  pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(workerBlob)

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    text += content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ') + '\n'
  }

  // Nome do cliente (após ➜ ou →)
  const clienteMatch = text.match(/[➜→►]\s*(.+?)(?:\s{3,}|Relatório|Gerado|\n)/)
  const cliente = clienteMatch?.[1]?.trim() || 'Cliente'

  // Rótulo do período ("dos últimos 30 dias" ou "de DD/MM/YYYY a DD/MM/YYYY")
  const periodoMatch = text.match(/Detalhes\s+(dos\s+últimos\s+\d+\s+dias|de\s+\d{2}\/\d{2}\/\d{4}\s+a\s+\d{2}\/\d{2}\/\d{4})/i)
  const periodoLabel = periodoMatch?.[1]?.trim() || 'últimos 30 dias'

  // Data de geração
  const dataMatch = text.match(/Gerado em[:\s]+(\d{2}\/\d{2}\/\d{4})/)
  const dataGeracao = dataMatch?.[1] || new Date().toLocaleDateString('pt-BR')

  // Seção de dados: entre "Detalhes" e "Legenda:"
  const detalhesIdx = text.search(/Detalhes\s+(?:dos\s+últimos|de\s+\d{2}\/)/i)
  const legendaIdx = text.search(/Legenda\s*:/i)
  const bloco = detalhesIdx >= 0 && legendaIdx > detalhesIdx
    ? text.slice(detalhesIdx, legendaIdx)
    : text

  // Contar datas diárias (formato "dd de mon") para determinar nDias
  const dateRegex = /\d{1,2}\s+de\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/gi
  const dateMatches = [...bloco.matchAll(dateRegex)]
  let nDias = dateMatches.length
  let datas: string[]
  let blocoTelas: string

  if (nDias > 0) {
    // Formato diário: "18 de nov", "1 de dez", etc.
    // PDFs com múltiplas páginas repetem o cabeçalho de datas em cada página.
    // Identifica o maior grupo (run) de datas únicas e consecutivas = cabeçalho real.
    // Isso evita que o parser só leia a última página e ignore as demais.
    const runs: { start: number; len: number }[] = []
    let runStart = 0
    const runDates = new Set<string>()
    for (let i = 0; i < dateMatches.length; i++) {
      const norm = dateMatches[i][0].replace(/\s+/g, ' ').toLowerCase().trim()
      if (runDates.has(norm)) {
        runs.push({ start: runStart, len: i - runStart })
        runStart = i
        runDates.clear()
      }
      runDates.add(norm)
    }
    runs.push({ start: runStart, len: dateMatches.length - runStart })
    // Usa o maior run (em caso de empate, o primeiro = página 1)
    const bestRun = runs.reduce((best, r) => r.len > best.len ? r : best, { start: 0, len: 0 })
    nDias = bestRun.len
    datas = dateMatches.slice(bestRun.start, bestRun.start + nDias).map(m => {
      const parts = m[0].trim().split(/\s+de\s+/i)
      return `${parts[0]}/${parts[1]?.slice(0, 3) || ''}`
    })
    const firstRunLastMatch = dateMatches[bestRun.start + nDias - 1]
    // blocoTelas começa após o primeiro cabeçalho de datas (captura todas as páginas)
    blocoTelas = bloco.slice(firstRunLastMatch.index! + firstRunLastMatch[0].length)
    // Remove cabeçalhos de datas repetidos das páginas seguintes
    blocoTelas = blocoTelas.replace(/(?:\d{1,2}\s+de\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\s*){5,}/gi, ' ')
    // Remove cabeçalho repetido de página (ex: "Relatório de Exibições: ... 17:03 2 / 2")
    blocoTelas = blocoTelas.replace(/Relat[oó]rio\s+de\s+Exibi[\s\S]*?\d{1,2}:\d{2}(?:\s+\d+\s*\/\s*\d+)?/gi, ' ')
  } else {
    // Formato mensal: colunas por mês (ex: "março   abril")
    const monthRegex = /\b(janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/gi
    const monthMatches = [...bloco.matchAll(monthRegex)]
    nDias = monthMatches.length
    if (nDias === 0) throw new Error('Não foi possível ler o PDF. Verifique se é o relatório correto.')
    datas = monthMatches.map(m => m[0].charAt(0).toUpperCase() + m[0].slice(1))
    const lastMonthMatch = monthMatches[monthMatches.length - 1]
    blocoTelas = bloco.slice(lastMonthMatch.index! + lastMonthMatch[0].length)
  }

  // Tokenizar: números e palavras alternados
  const tokenRegex = /[\d.,]+|[^\d.,\s]+/g
  const tokens: string[] = blocoTelas.match(tokenRegex) || []

  const isNum = (s: string) => /^[\d.,]+$/.test(s)

  type Segment = { nome: string; nums: number[] }
  const segments: Segment[] = []
  let currentName = ''
  let currentNums: number[] = []
  let inNums = false

  for (const token of tokens) {
    if (isNum(token)) {
      inNums = true
      currentNums.push(parseInt(token.replace(/[.,]/g, '')) || 0)
    } else {
      if (inNums && currentNums.length > 0) {
        segments.push({ nome: currentName.trim(), nums: [...currentNums] })
        currentNums = []
        currentName = ''
        inNums = false
      }
      currentName += (currentName ? ' ' : '') + token
    }
  }
  if (currentNums.length > 0) {
    segments.push({ nome: currentName.trim(), nums: currentNums })
  }

  // Dividir segmentos com mais de rowSize números em chunks de rowSize
  // (ocorre quando a última tela e a linha de totais ficam juntas sem separador de texto)
  const rowSize = nDias + 1
  const rows: Segment[] = []
  for (const seg of segments) {
    if (seg.nums.length > rowSize) {
      let i = 0
      let firstChunk = true
      while (i + rowSize <= seg.nums.length) {
        rows.push({ nome: firstChunk ? seg.nome : '', nums: seg.nums.slice(i, i + rowSize) })
        firstChunk = false
        i += rowSize
      }
    } else if (seg.nums.length > 0) {
      rows.push(seg)
    }
  }

  // Inferir o rowSize real a partir do comprimento mais comum das linhas nomeadas.
  // Isso corrige casos onde nDias é contado a mais (ex: datas do cabeçalho "de 26/mai a 25/jun"
  // são incluídas na contagem junto com as colunas da tabela).
  const namedLens = rows.filter(r => r.nome !== '').map(r => r.nums.length)
  const lenFreq = new Map<number, number>()
  for (const l of namedLens) lenFreq.set(l, (lenFreq.get(l) || 0) + 1)
  const inferredRowSize = namedLens.length > 0
    ? [...lenFreq.entries()].sort((a, b) => b[1] - a[1])[0][0]
    : rowSize
  // Se encontrou linhas de dados, usa o tamanho real delas; senão mantém nDias original
  const inferredNDias = namedLens.length > 0 ? inferredRowSize - 1 : nDias

  // Linhas com nome = telas; linha sem nome = totais
  const telaRows = rows.filter(r => r.nome !== '' && r.nums.length === inferredRowSize)
  const totalsRow = rows.find(r => r.nome === '')

  const telasDados: TelaDado[] = telaRows
    .map(r => ({
      nome: nomeLimpoTela(r.nome),
      total: r.nums[r.nums.length - 1] || 0,
      dailyValues: r.nums.slice(0, inferredNDias),
    }))
    .sort((a, b) => (ORDEM_TELAS[a.nome] ?? 99) - (ORDEM_TELAS[b.nome] ?? 99))

  const totaisDiarios = totalsRow
    ? totalsRow.nums.slice(0, inferredNDias)
    : telasDados.reduce(
        (acc, t) => t.dailyValues.map((v, i) => (acc[i] || 0) + v),
        [] as number[]
      )
  const totalPeriodo = totalsRow
    ? totalsRow.nums[totalsRow.nums.length - 1] || 0
    : telasDados.reduce((a, t) => a + t.total, 0)
  const mediaDiaria = inferredNDias > 0 ? Math.round(totalPeriodo / inferredNDias) : 0

  // Ajustar datas para bater com inferredNDias caso nDias tenha sido contado a mais
  const adjustedDatas = inferredNDias < datas.length ? datas.slice(datas.length - inferredNDias) : datas

  return { cliente, periodoLabel, dataGeracao, datas: adjustedDatas, nDias: inferredNDias, telasDados, totaisDiarios, totalPeriodo, mediaDiaria }
}

const CORES = ['#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626']

// Gráfico SVG puro — escala 100% via viewBox, funciona perfeitamente no PDF
function GraficoBarras({ data }: { data: Array<{ dia: string; exibicoes: number }> }) {
  const W = 560, H = 160
  const pL = 44, pR = 8, pT = 8, pB = 28
  const cW = W - pL - pR
  const cH = H - pT - pB
  const maxVal = Math.max(...data.map(d => d.exibicoes), 1)
  const roundTo = maxVal > 100 ? 50 : maxVal > 20 ? 10 : 5
  const maxRounded = Math.ceil(maxVal / roundTo) * roundTo
  const yTicks = [0, 1, 2, 3, 4].map(i => Math.round(maxRounded * i / 4))
  const colW = cW / data.length
  const barW = colW * 0.72
  const labelInterval = Math.max(1, Math.floor(data.length / 8))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {yTicks.map((tick, i) => {
        const y = pT + cH - (tick / maxRounded) * cH
        return (
          <g key={i}>
            <line x1={pL} y1={y} x2={W - pR} y2={y} stroke="#e5e7eb" strokeWidth="0.8" strokeDasharray="3,2" />
            <text x={pL - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill="#9ca3af">{tick}</text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const barH = (d.exibicoes / maxRounded) * cH
        const x = pL + i * colW + (colW - barW) / 2
        const y = pT + cH - barH
        const showLabel = i % labelInterval === 0 || i === data.length - 1
        return (
          <g key={i}>
            {barH > 0 && <rect x={x} y={y} width={barW} height={barH} fill="#2563eb" rx="2" ry="2" />}
            {showLabel && (
              <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize="8.5" fill="#9ca3af">{d.dia}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default function GerarRelatorioPage() {
  const [dados, setDados] = useState<DadosRelatorio | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingExtra, setLoadingExtra] = useState(false)
  const [erro, setErro] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [parceiros, setParceiros] = useState<{ id: string; nome_local: string }[]>([])
  const [locaisLista, setLocaisLista] = useState<{ id: string; nome_local: string }[]>([])
  const [mapaTelaGlobal, setMapaTelaGlobal] = useState<Map<string, string>>(new Map())
  const [vinculo, setVinculo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [pdfCount, setPdfCount] = useState(0)
  const [editandoTelaIdx, setEditandoTelaIdx] = useState<number | null>(null)
  const [mapeamentoAplicado, setMapeamentoAplicado] = useState(false)
  const [mesRefSelecionado, setMesRefSelecionado] = useState(() => format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'))
  const inputRef = useRef<HTMLInputElement>(null)
  const extraInputRef = useRef<HTMLInputElement>(null)

  async function handleVinculoChange(value: string) {
    setVinculo(value)
    setMapeamentoAplicado(false)

    if (!value.startsWith('local:') || !dados) return
    const localId = value.replace('local:', '')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: telasLocal } = await (supabase as any)
      .from('telas')
      .select('nome, identificacao')
      .eq('local_id', localId)
      .eq('ativo', true)

    if (!telasLocal || telasLocal.length === 0) return

    // Mapeamento: identificacao (nome interno/PDF) → nome (exibição no relatório)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapa = new Map<string, string>(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (telasLocal as any[])
        .filter((t: any) => t.identificacao)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((t: any) => [t.identificacao.toLowerCase(), t.nome])
    )

    if (mapa.size === 0) return

    setDados(prev => {
      if (!prev) return prev
      return {
        ...prev,
        telasDados: prev.telasDados.map(tela => {
          const nomeLower = tela.nome.toLowerCase()
          for (const [identificacao, nomeDisplay] of mapa) {
            if (nomeLower.includes(identificacao)) {
              return { ...tela, nome: nomeDisplay }
            }
          }
          return tela
        }),
      }
    })
    setMapeamentoAplicado(true)
  }

  function renomearTela(idx: number, novoNome: string) {
    setDados(prev => {
      if (!prev) return prev
      return { ...prev, telasDados: prev.telasDados.map((t, i) => i === idx ? { ...t, nome: novoNome } : t) }
    })
  }

  function editarExibicoes(idx: number, novoTotal: number) {
    setDados(prev => {
      if (!prev) return prev
      const telasDados = prev.telasDados.map((t, i) => i === idx ? { ...t, total: novoTotal } : t)
      const totalPeriodo = telasDados.reduce((a, t) => a + t.total, 0)
      const mediaDiaria = prev.nDias > 0 ? Math.round(totalPeriodo / prev.nDias) : 0
      return { ...prev, telasDados, totalPeriodo, mediaDiaria }
    })
  }

  function removerTela(idx: number) {
    setDados(prev => {
      if (!prev) return prev
      const telasDados = prev.telasDados.filter((_, i) => i !== idx)
      const totalPeriodo = telasDados.reduce((a, t) => a + t.total, 0)
      const mediaDiaria = prev.nDias > 0 ? Math.round(totalPeriodo / prev.nDias) : 0
      const totaisDiarios = prev.totaisDiarios.map((_, di) =>
        telasDados.reduce((a, t) => a + (t.dailyValues[di] || 0), 0)
      )
      return { ...prev, telasDados, totalPeriodo, mediaDiaria, totaisDiarios }
    })
  }

  useEffect(() => {
    Promise.all([
      supabase.from('clientes').select('id, nome_empresa').eq('ativo', true).order('nome_empresa'),
      supabase.from('parceiros').select('id, nome_local').order('nome_local'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('locais').select('id, nome_local').eq('ativo', true).order('nome_local'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('telas').select('nome, identificacao').eq('ativo', true),
    ]).then(([{ data: cliData }, { data: parData }, { data: locData }, { data: telasData }]) => {
      if (cliData) setClientes(cliData as Cliente[])
      if (parData) setParceiros(parData)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (locData) setLocaisLista((locData as any[]).map((l: any) => ({ id: l.id, nome_local: l.nome_local })))
      if (telasData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapa = new Map<string, string>((telasData as any[])
          .filter((t: any) => t.identificacao)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((t: any) => [t.identificacao.toLowerCase(), t.nome]))
        setMapaTelaGlobal(mapa)
      }
    })
  }, [])

  function aplicarMapaTelas(resultado: DadosRelatorio): DadosRelatorio {
    if (mapaTelaGlobal.size === 0) return resultado
    const telasDados = resultado.telasDados.map(tela => {
      const nomeLower = tela.nome.toLowerCase()
      for (const [identificacao, nomeDisplay] of mapaTelaGlobal) {
        if (nomeLower.includes(identificacao)) return { ...tela, nome: nomeDisplay }
      }
      return tela
    }).sort((a, b) => {
      const oa = ORDEM_TELAS[a.nome] ?? 99
      const ob = ORDEM_TELAS[b.nome] ?? 99
      if (oa !== ob) return oa - ob
      return a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })
    })
    return { ...resultado, telasDados }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setErro('')
    setDados(null)
    setPdfCount(0)
    try {
      const resultado = aplicarMapaTelas(await parsePdfCliente(file))
      setDados(resultado)
      setPdfCount(1)
    } catch (err) {
      console.error('Erro ao processar PDF:', err)
      setErro('Erro: ' + (err instanceof Error ? err.message : String(err)))
    }
    setLoading(false)
  }

  async function handleUploadExtra(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !dados) return
    setLoadingExtra(true)
    setErro('')
    try {
      const resultado = aplicarMapaTelas(await parsePdfCliente(file))
      setDados(prev => prev ? mesclarRelatorios(prev, resultado) : resultado)
      setPdfCount(prev => prev + 1)
    } catch (err) {
      console.error('Erro ao processar PDF extra:', err)
      setErro('Erro no PDF extra: ' + (err instanceof Error ? err.message : String(err)))
    }
    setLoadingExtra(false)
    if (extraInputRef.current) extraInputRef.current.value = ''
  }

  async function salvarRelatorio() {
    if (!vinculo) { toast.error('Selecione o destino antes de salvar'); return }
    if (!dados) return
    setSalvando(true)
    const mesRef = mesRefSelecionado
    const isParceiro = vinculo.startsWith('parceiro:')
    const isLocal = vinculo.startsWith('local:')
    const parceiroId = isParceiro ? vinculo.replace('parceiro:', '') : null
    const localId = isLocal ? vinculo.replace('local:', '') : null
    const clienteId = (!isParceiro && !isLocal) ? vinculo : null
    const { error } = await supabase.from('relatorios').insert({
      cliente_id: clienteId,
      parceiro_id: parceiroId,
      local_id: localId,
      mes_referencia: mesRef,
      total_exibicoes: dados.totalPeriodo,
      media_diaria: dados.mediaDiaria,
      num_campanhas: pdfCount,
      enviado: false,
    })
    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success('Relatório salvo! Aparece na aba Relatórios.')
    }
    setSalvando(false)
  }

  const dadosGraficoCompleto = dados?.totaisDiarios.map((v, i) => ({
    dia: dados.datas[i] || `${i + 1}`,
    exibicoes: v,
  })) || []
  // Remove os dias sem exibição no início do período para o gráfico não ficar vazio à esquerda
  const primeiroComDados = dadosGraficoCompleto.findIndex(d => d.exibicoes > 0)
  const dadosGrafico = primeiroComDados > 0 ? dadosGraficoCompleto.slice(primeiroComDados) : dadosGraficoCompleto

  return (
    <>
      <div className="p-8 print:hidden">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-100">Gerar relatório</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Faça upload do PDF do app e gere um relatório bonito para o cliente
          </p>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-white/[0.15] rounded-2xl p-12 text-center cursor-pointer hover:border-purple-400 hover:bg-blue-500/[0.06] transition-colors"
        >
          <Upload className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <p className="font-medium text-zinc-300">Clique para selecionar o PDF</p>
          <p className="text-sm text-zinc-400 mt-1">Relatório exportado pelo app de marketing indoor</p>
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
        </div>

        {loading && <p className="mt-4 text-center text-zinc-500 text-sm">Lendo o PDF...</p>}
        {erro && <p className="mt-4 text-center text-red-500 text-sm">{erro}</p>}

        {dados && (
          <div className="mt-6 space-y-4">
            {/* Status + imprimir */}
            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-green-400">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {pdfCount > 1 ? `${pdfCount} PDFs mesclados` : 'PDF lido'} — {dados.cliente}
                </span>
                <span className="text-xs text-green-400 opacity-70">
                  · {dados.telasDados.length} tela(s) · {dados.nDias} dias
                  {pdfCount > 1 && ` · ${pdfCount} campanhas`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {pdfCount < 4 && (
                  <>
                    <Button
                      onClick={() => extraInputRef.current?.click()}
                      disabled={loadingExtra}
                      variant="outline"
                      className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {loadingExtra ? 'Lendo...' : `Adicionar ${pdfCount + 1}º PDF`}
                    </Button>
                    <input ref={extraInputRef} type="file" accept=".pdf" className="hidden" onChange={handleUploadExtra} />
                  </>
                )}
                <Button
                  onClick={() => {
                    if (!dados) return
                    const titulo = document.title
                    document.title = `Pulse - ${dados.cliente} - ${dados.dataGeracao.replace(/\//g, '-')}`
                    window.onafterprint = () => { document.title = titulo }
                    window.print()
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir / Baixar PDF
                </Button>
              </div>
            </div>

            {/* Editar dados */}
            <div className="bg-white/[0.03] border border-white/[0.10] rounded-xl px-4 py-4 space-y-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Editar dados do relatório</p>

              {/* Nome do cliente */}
              <div className="space-y-1">
                <Label className="text-xs">Nome exibido no relatório</Label>
                <Input
                  value={dados.cliente}
                  onChange={(e) => setDados(prev => prev ? { ...prev, cliente: e.target.value } : prev)}
                  className="h-8 text-sm"
                />
              </div>

              {/* Telas */}
              {dados.telasDados.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Telas ({dados.telasDados.length})</Label>
                    {mapeamentoAplicado && (
                      <span className="text-[11px] text-green-400">✓ Nomes aplicados do cadastro</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {dados.telasDados.map((tela, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
                        {editandoTelaIdx === idx ? (
                          <Input
                            autoFocus
                            value={tela.nome}
                            onChange={(e) => renomearTela(idx, e.target.value)}
                            onBlur={() => setEditandoTelaIdx(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditandoTelaIdx(null)}
                            className="h-7 text-sm flex-1"
                          />
                        ) : (
                          <span className="text-sm text-zinc-200 flex-1 truncate">{tela.nome}</span>
                        )}
                        <Input
                          type="number"
                          min={0}
                          value={tela.total}
                          onChange={(e) => editarExibicoes(idx, parseInt(e.target.value) || 0)}
                          className="h-7 text-xs w-24 shrink-0 text-right"
                          title="Exibições"
                        />
                        <button
                          onClick={() => setEditandoTelaIdx(editandoTelaIdx === idx ? null : idx)}
                          className="p-1.5 rounded hover:bg-white/[0.08] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                          title="Renomear"
                        >
                          {editandoTelaIdx === idx ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => removerTela(idx)}
                          className="p-1.5 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                          title="Remover tela"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Vincular + salvar */}
            <div className="bg-white/[0.03] border border-white/[0.10] rounded-xl px-4 py-4 space-y-3">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Mês de referência</Label>
                  <Select value={mesRefSelecionado} onValueChange={setMesRefSelecionado}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 6 }, (_, i) => {
                        const mes = startOfMonth(subMonths(new Date(), i))
                        return (
                          <SelectItem key={i} value={format(mes, 'yyyy-MM-dd')}>
                            {format(mes, 'MMMM/yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
                            {i === 1 && ' (mês anterior)'}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Vincular este relatório a</Label>
                  <Select onValueChange={handleVinculoChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o destino do relatório" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                            Clientes
                          </div>
                          {clientes.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.nome_empresa}</SelectItem>
                          ))}
                        </>
                      )}
                      {parceiros.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 mt-1 text-xs font-semibold text-zinc-400 uppercase tracking-wide border-t border-white/[0.08]">
                            Parceiros
                          </div>
                          {parceiros.map(p => (
                            <SelectItem key={p.id} value={`parceiro:${p.id}`}>{p.nome_local}</SelectItem>
                          ))}
                        </>
                      )}
                      {locaisLista.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 mt-1 text-xs font-semibold text-zinc-400 uppercase tracking-wide border-t border-white/[0.08]">
                            Locais
                          </div>
                          {locaisLista.map(l => (
                            <SelectItem key={l.id} value={`local:${l.id}`}>{l.nome_local}</SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={salvarRelatorio}
                disabled={salvando}
                variant="outline"
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {salvando ? 'Salvando...' : 'Salvar no sistema'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* RELATÓRIO PARA IMPRESSÃO */}
      {dados && (
        <div id="relatorio" className="bg-white print:p-0" style={{ fontFamily: 'Inter, sans-serif' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #0284c7 0%, #1d4ed8 100%)', padding: '24px 40px', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Logo + título do cliente */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Logo Pulse */}
                <div style={{ width: 72, height: 72, borderRadius: 14, overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/pulse-logo.png?v=2" alt="Pulse" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <p style={{ fontSize: 11, opacity: 0.75, margin: '0 0 3px', letterSpacing: 1, textTransform: 'uppercase' }}>
                    Relatório de Exibições
                  </p>
                  <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, lineHeight: 1.1 }}>{dados.cliente}</h1>
                  <p style={{ fontSize: 12, opacity: 0.75, margin: '4px 0 0' }}>{dados.periodoLabel}</p>
                </div>
              </div>
              {/* Data */}
              <div style={{ textAlign: 'right', opacity: 0.85 }}>
                <p style={{ margin: 0, fontSize: 11, opacity: 0.7, letterSpacing: 1, textTransform: 'uppercase' }}>Gerado em</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{dados.dataGeracao}</p>
              </div>
            </div>
          </div>

          <div style={{ padding: '28px 40px' }}>
            {/* Métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'Total do período', value: dados.totalPeriodo.toLocaleString('pt-BR'), color: '#2563eb' },
                { label: 'Média diária', value: dados.mediaDiaria.toLocaleString('pt-BR'), color: '#2563eb' },
                { label: 'Telas ativas', value: String(dados.telasDados.filter(t => t.total > 0).length || dados.telasDados.length), color: '#059669' },
              ].map(card => (
                <div key={card.label} style={{ background: '#f8f7ff', borderRadius: 14, padding: '16px 20px', borderTop: `4px solid ${card.color}` }}>
                  <p style={{ margin: '0 0 3px', fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>{card.label}</p>
                  <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: card.color }}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Gráfico diário */}
            {dadosGrafico.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ marginBottom: 8 }}>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
                    Exibições por dia
                  </h2>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>
                    Total combinado de todas as telas · {dados.periodoLabel}
                  </p>
                </div>
                <div style={{ background: '#f9fafb', borderRadius: 14, padding: '14px 12px' }}>
                  <GraficoBarras data={dadosGrafico} />
                </div>
              </div>
            )}

            {/* Por tela */}
            {dados.telasDados.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
                  Exibições por tela — {dados.periodoLabel}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                  {dados.telasDados.filter(t => t.total > 0).map((tela, i) => (
                    <div
                      key={tela.nome}
                      style={{
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderLeft: `4px solid ${CORES[i % CORES.length]}`,
                        borderRadius: 10,
                        padding: '12px 16px',
                        opacity: tela.total === 0 ? 0.5 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Monitor style={{ width: 12, height: 12, color: CORES[i % CORES.length] }} />
                        <p style={{ margin: 0, fontSize: 10, color: '#6b7280', lineHeight: 1.3 }}>
                          {tela.nome}
                        </p>
                      </div>
                      <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: CORES[i % CORES.length] }}>
                        {tela.total.toLocaleString('pt-BR')}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>exibições</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rodapé */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/pulse-logo.png?v=2" alt="Pulse" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#111827' }}>Pulse Marketing Indoor</p>
                  <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Quem é visto é lembrado.</p>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>Relatório gerado em {dados.dataGeracao}</p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #relatorio, #relatorio * { visibility: visible; }
          #relatorio { position: absolute; top: 0; left: 0; width: 100%; }
          @page { margin: 0; size: A4; }
        }
      `}</style>
    </>
  )
}
