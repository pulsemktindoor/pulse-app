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
  // Verifica se é chamada legítima do Vercel Cron
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hoje = startOfDay(new Date())
  const diaHoje = hoje.getDate()
  const alertas: string[] = []

  // 1. Contratos expirando (clientes)
  const { data: contratos } = await supabase
    .from('contratos')
    .select('nome_empresa, data_fim, status')
    .neq('status', 'encerrado')

  if (contratos) {
    const expirando = contratos.filter((c) => {
      const dias = differenceInDays(parseISO(c.data_fim), hoje)
      return dias >= 0 && dias <= 30
    })
    if (expirando.length > 0) {
      alertas.push(`⚠️ <b>Contratos expirando em breve:</b>`)
      for (const c of expirando) {
        const dias = differenceInDays(parseISO(c.data_fim), hoje)
        const dataFmt = format(parseISO(c.data_fim), 'dd/MM/yyyy')
        alertas.push(
          dias === 0
            ? `  • ${c.nome_empresa} — <b>vence HOJE</b>`
            : dias <= 7
            ? `  • ${c.nome_empresa} — vence em <b>${dias} dias</b> (${dataFmt})`
            : `  • ${c.nome_empresa} — vence em ${dias} dias (${dataFmt})`
        )
      }
    }
  }

  // 2. Relatórios de locais para enviar hoje
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: locais } = await (supabase as any)
    .from('locais')
    .select('nome_local, dia_envio_relatorio, nome_responsavel')
    .eq('ativo', true)
    .eq('dia_envio_relatorio', diaHoje)

  if (locais && locais.length > 0) {
    alertas.push(`\n📊 <b>Relatórios para enviar hoje (dia ${diaHoje}):</b>`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const l of locais as any[]) {
      alertas.push(`  • ${l.nome_local}${l.nome_responsavel ? ` (${l.nome_responsavel})` : ''}`)
    }
  }

  // 3. Relatórios de parceiros para enviar hoje
  const { data: parceiros } = await supabase
    .from('parceiros')
    .select('nome_local, dia_envio_relatorio, nome_responsavel')
    .eq('dia_envio_relatorio', diaHoje)

  if (parceiros && parceiros.length > 0) {
    if (!locais || locais.length === 0) {
      alertas.push(`\n📊 <b>Relatórios para enviar hoje (dia ${diaHoje}):</b>`)
    }
    for (const p of parceiros) {
      alertas.push(`  • ${p.nome_local}${p.nome_responsavel ? ` (${p.nome_responsavel})` : ''}`)
    }
  }

  // 4. Clientes com relatórios pendentes de envio
  const { data: relatoriosPendentes } = await supabase
    .from('relatorios')
    .select('mes_referencia')
    .eq('enviado', false)

  if (relatoriosPendentes && relatoriosPendentes.length > 0) {
    alertas.push(`\n📬 <b>${relatoriosPendentes.length} relatório(s) gerado(s) e não enviado(s)</b>`)
  }

  if (alertas.length === 0) {
    // Nada urgente hoje, não manda mensagem
    return NextResponse.json({ ok: true, message: 'Sem alertas hoje' })
  }

  const dataFormatada = format(hoje, "EEEE, dd 'de' MMMM", { locale: ptBR })
  const mensagem = [
    `🔔 <b>Pulse — Alertas do dia</b>`,
    `📅 ${dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1)}`,
    ``,
    ...alertas,
    ``,
    `<i>Acesse pulse-app-snowy-five.vercel.app para mais detalhes.</i>`,
  ].join('\n')

  await sendTelegram(mensagem)
  return NextResponse.json({ ok: true, alertas: alertas.length })
}
