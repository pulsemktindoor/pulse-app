import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse')

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const data = await pdfParse(buffer)
    const text: string = data.text

    // Cliente — linha após "➜ "
    const clienteMatch = text.match(/[➜→]\s*(.+?)(?:\n|Relatório gerado)/s)
    const cliente = clienteMatch?.[1]?.trim().replace(/\s+/g, ' ') || 'Cliente'

    // Total de exibições
    const totalMatch = text.match(/Total de exibições:\s*([\d.,]+)/)
    const totalExibicoes = parseInt(totalMatch?.[1]?.replace(/\./g, '').replace(',', '') || '0')

    // Telas
    const telasMatch = text.match(/Telas:\s*(\d+)/)
    const telas = parseInt(telasMatch?.[1] || '0')

    // Dias em exibição
    const diasMatch = text.match(/Dias em exibição[^:]*:\s*(\d+)/)
    const dias = parseInt(diasMatch?.[1] || '0')

    // Data de geração
    const dataMatch = text.match(/Gerado em:\s*(\d{2}\/\d{2}\/\d{4})/)
    const dataGeracao = dataMatch?.[1] || ''

    // Bloco da tabela
    const tabelaBloco = text.split('Detalhes dos últimos 30 dias')[1] || ''

    // Datas da tabela
    const datasRaw: string[] = []
    const dataRegex = /(\d{1,2})\s*de\s*(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/gi
    let match
    while ((match = dataRegex.exec(tabelaBloco)) !== null) {
      datasRaw.push(`${match[1]}/${match[2]}`)
    }
    const datas = datasRaw.slice(0, 31)

    // Dados por tela
    const telasDados: { nome: string; valores: number[]; total: number }[] = []
    const nomesTelasPossiveis = [
      "Bistrô Pai D'égua - Camarote",
      "Bistrô Pai D'égua - Mesas",
      'Quality Body - Halteres',
      'Quality Body - Saída',
      'SB Carnes',
    ]

    for (const nomeTela of nomesTelasPossiveis) {
      const nomeEscapado = nomeTela.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
      const re = new RegExp(nomeEscapado + '[\\s\\S]*?([\\d\\s.,]+?)(?=[A-Za-záéíóúãõçÁÉÍÓÚÃÕÇ]|$)', 'm')
      const m = tabelaBloco.match(re)
      if (m) {
        const nums = m[1]
          .trim()
          .split(/\s+/)
          .map((n) => parseInt(n.replace(/\./g, '').replace(',', '')) || 0)
          .filter((n) => !isNaN(n))
        if (nums.length > 1) {
          telasDados.push({
            nome: nomeTela,
            valores: nums.slice(0, -1),
            total: nums[nums.length - 1],
          })
        }
      }
    }

    // Totais diários — última linha de números
    const todasLinhasNums = tabelaBloco.match(/(\d[\d\s.,]*\d)/gm) || []
    const ultimaLinha = todasLinhasNums[todasLinhasNums.length - 1] || ''
    const totaisDiarios = ultimaLinha
      .trim()
      .split(/\s+/)
      .map((n) => parseInt(n.replace(/\./g, '').replace(',', '')) || 0)
      .filter((n) => n > 0)
      .slice(0, 31)

    const total30dias = totaisDiarios.reduce((a, b) => a + b, 0)

    return NextResponse.json({
      cliente,
      totalExibicoes,
      telas,
      dias,
      dataGeracao,
      datas,
      telasDados,
      totaisDiarios,
      total30dias,
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro ao processar PDF' }, { status: 500 })
  }
}
