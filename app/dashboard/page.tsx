'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Cliente } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, FileText, Bell, DollarSign, AlertTriangle, Clock, Send, CalendarCheck } from 'lucide-react'
import { format, differenceInDays, parseISO, startOfMonth, getDate, getDaysInMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import { toast } from 'sonner'

type RelatorioComCliente = {
  id: string
  mes_referencia: string
  enviado: boolean
  cliente_id: string
  clientes: { nome_empresa: string; nome_responsavel: string; whatsapp: string } | null
}

export default function Dashboard() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [relatoriosPendentes, setRelatoriosPendentes] = useState<RelatorioComCliente[]>([])
  const [relatoriosMesAtual, setRelatoriosMesAtual] = useState<{ id: string; cliente_id: string; mes_referencia: string; enviado: boolean }[]>([])
  const [loading, setLoading] = useState(true)

  const hoje = new Date()
  const diaHoje = getDate(hoje)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const mesAtualRef = format(startOfMonth(hoje), 'yyyy-MM-dd')
    const [{ data: cliData }, { data: relPendentes }, { data: relMesAtual }] = await Promise.all([
      supabase.from('clientes').select('*').order('nome_empresa'),
      supabase
        .from('relatorios')
        .select('id, mes_referencia, enviado, cliente_id, clientes(nome_empresa, nome_responsavel, whatsapp)')
        .eq('enviado', false),
      // Todos os relatórios do mês atual (incluindo enviados) para checar alertas corretamente
      supabase
        .from('relatorios')
        .select('id, cliente_id, mes_referencia, enviado')
        .eq('mes_referencia', mesAtualRef),
    ])
    if (cliData) setClientes(cliData)
    if (relPendentes) setRelatoriosPendentes(relPendentes as RelatorioComCliente[])
    if (relMesAtual) setRelatoriosMesAtual(relMesAtual)
    setLoading(false)
  }

  async function marcarEnviado(id: string) {
    const { error } = await supabase
      .from('relatorios')
      .update({ enviado: true, data_envio: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast.error('Erro ao atualizar')
    } else {
      toast.success('Marcado como enviado!')
      loadData()
    }
  }

  // Clientes com contrato vencendo nos próximos 30 dias ou já vencido
  const contratosAlerta = clientes
    .filter((c) => c.data_fim_contrato)
    .map((c) => ({
      ...c,
      dias: differenceInDays(parseISO(c.data_fim_contrato!), hoje),
    }))
    .filter((c) => c.dias <= 30)
    .sort((a, b) => a.dias - b.dias)

  // Clientes cujo dia de relatório é HOJE ou já passou este mês, mas o relatório não foi enviado ainda
  const mesAtualInicio = startOfMonth(hoje)
  const clientesComRelatorioHoje = clientes.filter((c) => {
    if (!c.dia_envio_relatorio) return false
    // Ignora clientes com contrato encerrado
    if (c.data_fim_contrato && differenceInDays(parseISO(c.data_fim_contrato), hoje) < 0) return false
    // Ignora clientes que começaram este mês (primeiro relatório é no mês seguinte)
    if (c.data_inicio_contrato && parseISO(c.data_inicio_contrato) >= mesAtualInicio) return false
    const diaEnvio = c.dia_envio_relatorio
    if (diaHoje < diaEnvio) return false
    // Verifica se já existe algum relatório (enviado ou não) para este mês
    const jaTemRelatorio = relatoriosMesAtual.some((r) => r.cliente_id === c.id)
    return !jaTemRelatorio
  })

  // Próximos relatórios a vencer (nos próximos 7 dias)
  const proximosRelatorios = clientes
    .filter((c) => {
      if (!c.dia_envio_relatorio) return false
      return c.dia_envio_relatorio > diaHoje && c.dia_envio_relatorio <= diaHoje + 7
    })
    .sort((a, b) => (a.dia_envio_relatorio ?? 0) - (b.dia_envio_relatorio ?? 0))

  const receitaMensal = clientes.reduce((acc, c) => acc + (c.valor_mensal || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-zinc-400">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {format(hoje, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Alertas do dia — destaque */}
      {(clientesComRelatorioHoje.length > 0 || contratosAlerta.filter(c => c.dias <= 0).length > 0) && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-red-600" />
            <p className="font-semibold text-red-800 text-sm">Ação necessária hoje</p>
          </div>
          <div className="space-y-2">
            {clientesComRelatorioHoje.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{c.nome_empresa}</p>
                  <p className="text-xs text-zinc-500">Enviar relatório de {format(hoje, 'MMMM/yyyy', { locale: ptBR })}</p>
                </div>
                <Link href="/relatorios">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-xs">
                    <Send className="w-3 h-3 mr-1" />
                    Enviar
                  </Button>
                </Link>
              </div>
            ))}
            {contratosAlerta.filter(c => c.dias <= 0).map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{c.nome_empresa}</p>
                  <p className="text-xs text-zinc-500">Contrato vencido há {Math.abs(c.dias)} dia(s)</p>
                </div>
                <Link href="/clientes">
                  <Button size="sm" variant="outline" className="text-red-700 border-red-200 text-xs">
                    Renovar
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Clientes ativos</p>
                <p className="text-3xl font-bold text-zinc-900 mt-1">{clientes.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Receita mensal</p>
                <p className="text-3xl font-bold text-zinc-900 mt-1">
                  R$ {receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={contratosAlerta.length > 0 ? 'border-yellow-300' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Contratos em alerta</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{contratosAlerta.length}</p>
                <p className="text-xs text-zinc-400 mt-1">vencendo ou vencidos</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={relatoriosPendentes.length > 0 ? 'border-red-300' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Relatórios pendentes</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{relatoriosPendentes.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contratos encerrando */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Contratos encerrando
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contratosAlerta.length === 0 ? (
              <p className="text-zinc-400 text-sm">Nenhum contrato vencendo. Tudo certo!</p>
            ) : (
              <div className="space-y-3">
                {contratosAlerta.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{c.nome_empresa}</p>
                      <p className="text-xs text-zinc-500">
                        Até {format(parseISO(c.data_fim_contrato!), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    {c.dias < 0 ? (
                      <Badge variant="destructive">Vencido há {Math.abs(c.dias)}d</Badge>
                    ) : c.dias === 0 ? (
                      <Badge variant="destructive">Vence hoje</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{c.dias}d restantes</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximos relatórios */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-purple-500" />
              Próximos relatórios (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximosRelatorios.length === 0 && relatoriosPendentes.length === 0 ? (
              <p className="text-zinc-400 text-sm">Nenhum relatório nos próximos 7 dias.</p>
            ) : (
              <div className="space-y-3">
                {proximosRelatorios.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{c.nome_empresa}</p>
                      <p className="text-xs text-zinc-500">
                        Dia {c.dia_envio_relatorio} de {format(hoje, 'MMMM', { locale: ptBR })}
                      </p>
                    </div>
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                      em {(c.dia_envio_relatorio ?? 0) - diaHoje}d
                    </Badge>
                  </div>
                ))}
                {relatoriosPendentes.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{r.clientes?.nome_empresa}</p>
                      <p className="text-xs text-zinc-500">
                        Ref: {format(parseISO(r.mes_referencia), 'MMMM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => marcarEnviado(r.id)}
                      className="bg-purple-600 hover:bg-purple-700 text-xs h-7"
                    >
                      Enviado
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
