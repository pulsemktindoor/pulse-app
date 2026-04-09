'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Cliente } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Printer, Monitor, Save } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { format, startOfMonth, subMonths } from 'date-fns'

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
    datas = dateMatches.map(m => {
      const parts = m[0].trim().split(/\s+de\s+/i)
      return `${parts[0]}/${parts[1]?.slice(0, 3) || ''}`
    })
    const lastDateMatch = dateMatches[dateMatches.length - 1]
    blocoTelas = bloco.slice(lastDateMatch.index! + lastDateMatch[0].length)
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

  // Linhas com nome = telas; linha sem nome = totais
  const telaRows = rows.filter(r => r.nome !== '')
  const totalsRow = rows.find(r => r.nome === '')

  const telasDados: TelaDado[] = telaRows
    .map(r => ({
      nome: nomeLimpoTela(r.nome),
      total: r.nums[r.nums.length - 1] || 0,
      dailyValues: r.nums.slice(0, nDias),
    }))
    .sort((a, b) => (ORDEM_TELAS[a.nome] ?? 99) - (ORDEM_TELAS[b.nome] ?? 99))

  const totaisDiarios = totalsRow
    ? totalsRow.nums.slice(0, nDias)
    : telasDados.reduce(
        (acc, t) => t.dailyValues.map((v, i) => (acc[i] || 0) + v),
        [] as number[]
      )
  const totalPeriodo = totalsRow
    ? totalsRow.nums[totalsRow.nums.length - 1] || 0
    : telasDados.reduce((a, t) => a + t.total, 0)
  const mediaDiaria = nDias > 0 ? Math.round(totalPeriodo / nDias) : 0

  return { cliente, periodoLabel, dataGeracao, datas, nDias, telasDados, totaisDiarios, totalPeriodo, mediaDiaria }
}

const CORES = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626']

export default function GerarRelatorioPage() {
  const [dados, setDados] = useState<DadosRelatorio | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [parceiros, setParceiros] = useState<{ id: string; nome_local: string }[]>([])
  const [vinculo, setVinculo] = useState('')
  const [salvando, setSalvando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('clientes').select('id, nome_empresa').order('nome_empresa'),
      supabase.from('parceiros').select('id, nome_local').order('nome_local'),
    ]).then(([{ data: cliData }, { data: parData }]) => {
      if (cliData) setClientes(cliData as Cliente[])
      if (parData) setParceiros(parData)
    })
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setErro('')
    setDados(null)
    try {
      const resultado = await parsePdfCliente(file)
      setDados(resultado)
    } catch (err) {
      console.error('Erro ao processar PDF:', err)
      setErro('Erro: ' + (err instanceof Error ? err.message : String(err)))
    }
    setLoading(false)
  }

  async function salvarRelatorio() {
    if (!vinculo) { toast.error('Selecione o cliente ou parceiro antes de salvar'); return }
    if (!dados) return
    setSalvando(true)
    const mesRef = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd')
    const isParceiro = vinculo.startsWith('parceiro:')
    const parceiroId = isParceiro ? vinculo.replace('parceiro:', '') : null
    const clienteId = isParceiro ? null : vinculo
    const { error } = await supabase.from('relatorios').insert({
      cliente_id: clienteId,
      parceiro_id: parceiroId,
      mes_referencia: mesRef,
      total_exibicoes: dados.totalPeriodo,
      media_diaria: dados.mediaDiaria,
      enviado: false,
    })
    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success('Relatório salvo! Aparece na aba Relatórios.')
    }
    setSalvando(false)
  }

  const isParceiro = vinculo.startsWith('parceiro:')

  const dadosGrafico = dados?.totaisDiarios.map((v, i) => ({
    dia: dados.datas[i] || `${i + 1}`,
    exibicoes: v,
  })) || []

  return (
    <>
      <div className="p-8 print:hidden">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">Gerar relatório</h1>
          <p className="text-zinc-500 text-sm mt-1">
            Faça upload do PDF do app e gere um relatório bonito para o cliente
          </p>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-zinc-300 rounded-2xl p-12 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
        >
          <Upload className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
          <p className="font-medium text-zinc-700">Clique para selecionar o PDF</p>
          <p className="text-sm text-zinc-400 mt-1">Relatório exportado pelo app de marketing indoor</p>
          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
        </div>

        {loading && <p className="mt-4 text-center text-zinc-500 text-sm">Lendo o PDF...</p>}
        {erro && <p className="mt-4 text-center text-red-500 text-sm">{erro}</p>}

        {dados && (
          <div className="mt-6 space-y-4">
            {/* Status + imprimir */}
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-green-700">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">PDF lido — {dados.cliente}</span>
                <span className="text-xs text-green-600 opacity-70">
                  · {dados.telasDados.length} tela(s) · {dados.nDias} dias
                </span>
              </div>
              <Button
                onClick={() => {
                  if (!dados) return
                  const titulo = document.title
                  document.title = `Pulse - ${dados.cliente} - ${dados.dataGeracao.replace(/\//g, '-')}`
                  window.onafterprint = () => { document.title = titulo }
                  window.print()
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir / Baixar PDF
              </Button>
            </div>

            {/* Vincular + salvar */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-4 space-y-3">
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Vincular este relatório a</Label>
                  <Select onValueChange={(v) => setVinculo(v as string)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente ou local parceiro" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Clientes pagantes */}
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
                      {/* Locais parceiros */}
                      {parceiros.length > 0 && (
                        <>
                          <div className="px-2 py-1.5 mt-1 text-xs font-semibold text-zinc-400 uppercase tracking-wide border-t border-zinc-100">
                            Locais parceiros
                          </div>
                          {parceiros.map(p => (
                            <SelectItem key={p.id} value={`parceiro:${p.id}`}>{p.nome_local}</SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={salvarRelatorio}
                  disabled={salvando}
                  variant="outline"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {salvando ? 'Salvando...' : 'Salvar no sistema'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RELATÓRIO PARA IMPRESSÃO */}
      {dados && (
        <div id="relatorio" className="bg-white print:p-0" style={{ fontFamily: 'Inter, sans-serif' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)', padding: '36px 48px', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Logo + título do cliente */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                {/* Logo Pulse */}
                <div style={{ width: 90, height: 90, borderRadius: 16, overflow: 'hidden', flexShrink: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/pulse-logo.png?v=2" alt="Pulse" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <p style={{ fontSize: 12, opacity: 0.75, margin: '0 0 4px', letterSpacing: 1, textTransform: 'uppercase' }}>
                    Relatório de Exibições
                  </p>
                  <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, lineHeight: 1.1 }}>{dados.cliente}</h1>
                  <p style={{ fontSize: 13, opacity: 0.75, margin: '6px 0 0' }}>{dados.periodoLabel}</p>
                </div>
              </div>
              {/* Data */}
              <div style={{ textAlign: 'right', opacity: 0.85 }}>
                <p style={{ margin: 0, fontSize: 12, opacity: 0.7, letterSpacing: 1, textTransform: 'uppercase' }}>Gerado em</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{dados.dataGeracao}</p>
              </div>
            </div>
          </div>

          <div style={{ padding: '40px 48px' }}>
            {/* Métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 40 }}>
              {[
                { label: 'Total do período', value: dados.totalPeriodo.toLocaleString('pt-BR'), color: '#7c3aed' },
                { label: 'Média diária', value: dados.mediaDiaria.toLocaleString('pt-BR'), color: '#2563eb' },
                { label: 'Telas ativas', value: String(dados.telasDados.filter(t => t.total > 0).length || dados.telasDados.length), color: '#059669' },
              ].map(card => (
                <div key={card.label} style={{ background: '#f8f7ff', borderRadius: 16, padding: '20px 24px', borderTop: `4px solid ${card.color}` }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1 }}>{card.label}</p>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Gráfico diário */}
            {dadosGrafico.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ marginBottom: 12 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>
                    Exibições por dia
                  </h2>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
                    Total combinado de todas as telas · {dados.periodoLabel}
                  </p>
                </div>
                <div style={{ background: '#f9fafb', borderRadius: 16, padding: '24px 16px' }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dadosGrafico} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#9ca3af' }} interval={Math.floor(dadosGrafico.length / 10)} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => [Number(v).toLocaleString('pt-BR'), 'Exibições no dia']}
                      />
                      <Bar dataKey="exibicoes" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Por tela */}
            {dados.telasDados.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
                  Exibições por tela — {dados.periodoLabel}
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
                  {dados.telasDados.map((tela, i) => (
                    <div
                      key={tela.nome}
                      style={{
                        background: 'white',
                        border: '1px solid #e5e7eb',
                        borderLeft: `4px solid ${CORES[i % CORES.length]}`,
                        borderRadius: 12,
                        padding: '16px 20px',
                        opacity: tela.total === 0 ? 0.5 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Monitor style={{ width: 14, height: 14, color: CORES[i % CORES.length] }} />
                        <p style={{ margin: 0, fontSize: 11, color: '#6b7280', lineHeight: 1.3 }}>
                          {tela.nome}
                        </p>
                      </div>
                      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: CORES[i % CORES.length] }}>
                        {tela.total.toLocaleString('pt-BR')}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>exibições</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rodapé */}
            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/pulse-logo.png?v=2" alt="Pulse" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' }}>Pulse Marketing Indoor</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Quem é visto é lembrado.</p>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Relatório gerado em {dados.dataGeracao}</p>
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
