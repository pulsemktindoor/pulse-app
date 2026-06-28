import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format, parseISO, differenceInDays, startOfDay, startOfMonth, subMonths, getDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
  })
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const hoje = startOfDay(new Date())
    const diaHoje = getDate(hoje)
    const mesAtualInicio = startOfMonth(hoje)
    const cutoff = subMonths(mesAtualInicio, 1)
    const secoes: string[] = []

    // Buscar tudo igual ao dashboard
    const [
      { data: clientes, error: errClientes },
      { data: parceiros, error: errParceiros },
      { data: locais, error: errLocais },
      { data: todosRels, error: errRels },
    ] = await Promise.all([
      supabase.from('clientes').select('id, nome_empresa, dia_envio_relatorio, data_fim_contrato, data_inicio_contrato, created_at').eq('ativo', true),
      supabase.from('parceiros').select('id, nome_local, dia_envio_relatorio, data_fim_contrato'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from('locais').select('id, nome_local, dia_envio_relatorio, data_fim_contrato').eq('ativo', true),
      supabase.from('relatorios').select('id, cliente_id, parceiro_id, local_id, mes_referencia, enviado, created_at'),
    ])

    if (errClientes || errParceiros || errLocais || errRels) {
      const erros = [errClientes, errParceiros, errLocais, errRels]
        .filter(Boolean)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((e: any) => e.message)
        .join(', ')
      await sendTelegram(`⚠️ <b>Pulse • Erro no cron de alertas</b>\n\nErro ao buscar dados:\n${erros}`)
      return NextResponse.json({ error: erros }, { status: 500 })
    }

    // 1. Contratos/parcerias vencendo nos próximos 30 dias ou já vencidos
    const todosContratos = [
      ...(clientes || []).filter(c => c.data_fim_contrato).map(c => ({ nome: c.nome_empresa, dias: differenceInDays(parseISO(c.data_fim_contrato!), hoje) })),
      ...(parceiros || []).filter(p => p.data_fim_contrato).map(p => ({ nome: p.nome_local, dias: differenceInDays(parseISO(p.data_fim_contrato!), hoje) })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...((locais as any[]) || []).filter((l: any) => l.data_fim_contrato).map((l: any) => ({ nome: l.nome_local, dias: differenceInDays(parseISO(l.data_fim_contrato), hoje) })),
    ].filter(c => c.dias <= 30).sort((a, b) => a.dias - b.dias)

    if (todosContratos.length > 0) {
      const linhas = todosContratos.map(c => {
        if (c.dias < 0) return `🔴 ${c.nome} — vencido há ${Math.abs(c.dias)}d`
        if (c.dias === 0) return `🔴 ${c.nome} — vence HOJE`
        if (c.dias <= 7) return `🟠 ${c.nome} — vence em ${c.dias}d`
        return `🟡 ${c.nome} — vence em ${c.dias}d`
      })
      secoes.push(`⚠️ <b>CONTRATOS/PARCERIAS</b>\n${linhas.join('\n')}`)
    }

    // 2. Relatórios para enviar — lógica idêntica ao dashboard
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locaisComRelatorio = ((locais as any[]) || []).filter((l: any) => {
      if (!l.dia_envio_relatorio) return false
      if (diaHoje < l.dia_envio_relatorio) return false
      const jaTemRelatorio = (todosRels || []).some(r => {
        if (r.local_id !== l.id) return false
        if (!r.enviado) return false
        if (r.mes_referencia) return parseISO(r.mes_referencia) >= cutoff
        return new Date(r.created_at) >= cutoff
      })
      return !jaTemRelatorio
    })

    const clientesComRelatorio = (clientes || []).filter(c => {
      if (!c.dia_envio_relatorio) return false
      if (c.data_fim_contrato && differenceInDays(parseISO(c.data_fim_contrato), hoje) < 0) return false
      const iniciou = c.data_inicio_contrato ? parseISO(c.data_inicio_contrato) : new Date(c.created_at)
      if (iniciou >= mesAtualInicio && getDate(iniciou) > (c.dia_envio_relatorio ?? 0)) return false
      if (diaHoje < c.dia_envio_relatorio) return false
      const jaTemRelatorio = (todosRels || []).some(r => {
        if (r.cliente_id !== c.id) return false
        if (!r.enviado) return false
        if (r.mes_referencia) return parseISO(r.mes_referencia) >= cutoff
        return new Date(r.created_at) >= cutoff
      })
      return !jaTemRelatorio
    })

    const parceirosComRelatorio = (parceiros || []).filter(p => {
      if (!p.dia_envio_relatorio) return false
      if (p.data_fim_contrato && differenceInDays(parseISO(p.data_fim_contrato), hoje) < 0) return false
      if (diaHoje < p.dia_envio_relatorio) return false
      const jaTemRelatorio = (todosRels || []).some(r => {
        if (r.parceiro_id !== p.id) return false
        if (!r.enviado) return false
        if (r.mes_referencia) return parseISO(r.mes_referencia) >= cutoff
        return new Date(r.created_at) >= cutoff
      })
      return !jaTemRelatorio
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const relHoje = [
      ...clientesComRelatorio.map(c => c.nome_empresa),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...locaisComRelatorio.map((l: any) => l.nome_local),
      ...parceirosComRelatorio.map(p => p.nome_local),
    ]

    if (relHoje.length > 0) {
      const linhas = relHoje.map(nome => `• ${nome}`)
      secoes.push(`📋 <b>RELATÓRIOS — ENVIAR HOJE</b>\n${linhas.join('\n')}`)
    }

    if (secoes.length === 0) {
      return NextResponse.json({ ok: true, message: 'Sem alertas hoje' })
    }

    const dataFormatada = format(hoje, "EEEE, dd 'de' MMMM", { locale: ptBR })
    const dataLabel = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1)

    const mensagem = [
      `🔔 <b>Pulse • Alertas de hoje</b>`,
      `📅 ${dataLabel}`,
      ``,
      `━━━━━━━━━━━━━━━━━━`,
      secoes.join('\n\n━━━━━━━━━━━━━━━━━━\n'),
    ].join('\n')

    await sendTelegram(mensagem)
    return NextResponse.json({ ok: true, alertas: secoes.length })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await sendTelegram(`⚠️ <b>Pulse • Erro crítico no cron</b>\n\n${msg}`)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
