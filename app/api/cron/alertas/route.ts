import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns'
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

  const hoje = startOfDay(new Date())
  const diaHoje = hoje.getDate()
  const secoes: string[] = []

  // 1. Contratos vencendo HOJE ou AMANHÃ
  const { data: contratos } = await supabase
    .from('contratos')
    .select('nome_empresa, data_fim, status')
    .neq('status', 'encerrado')

  if (contratos) {
    const urgentes = contratos.filter((c) => {
      const dias = differenceInDays(parseISO(c.data_fim), hoje)
      return dias === 0 || dias === 1
    })
    if (urgentes.length > 0) {
      const linhas = urgentes.map((c) => {
        const dias = differenceInDays(parseISO(c.data_fim), hoje)
        return dias === 0
          ? `🔴 ${c.nome_empresa} — vence HOJE`
          : `🟠 ${c.nome_empresa} — vence AMANHA`
      })
      secoes.push(`⚠️ <b>CONTRATOS</b>\n${linhas.join('\n')}`)
    }
  }

  // 2. Relatórios para enviar hoje (locais + parceiros)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: locais } = await (supabase as any)
    .from('locais')
    .select('nome_local, nome_responsavel')
    .eq('ativo', true)
    .eq('dia_envio_relatorio', diaHoje)

  const { data: parceiros } = await supabase
    .from('parceiros')
    .select('nome_local, nome_responsavel')
    .eq('dia_envio_relatorio', diaHoje)

  const relHoje = [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...((locais as any[]) || []),
    ...(parceiros || []),
  ]

  if (relHoje.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linhas = relHoje.map((r: any) => `• ${r.nome_local}`)
    secoes.push(`📋 <b>RELATORIOS — ENVIAR HOJE</b>\n${linhas.join('\n')}`)
  }

  // 3. Relatórios gerados e não enviados
  const { data: pendentes } = await supabase
    .from('relatorios')
    .select('id')
    .eq('enviado', false)

  if (pendentes && pendentes.length > 0) {
    secoes.push(`📬 <b>${pendentes.length} relatorio(s) aguardando envio</b>`)
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
}
