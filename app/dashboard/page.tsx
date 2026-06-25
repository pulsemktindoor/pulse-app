'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Cliente } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, FileText, Bell, DollarSign, AlertTriangle, Clock, Send, CalendarCheck, Handshake, User, CheckCheck, MapPin } from 'lucide-react'
import { format, differenceInDays, parseISO, startOfMonth, startOfDay, subMonths, getDate } from 'date-fns'
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

type ParceiroSimples = {
  id: string
  nome_local: string
  dia_envio_relatorio: number | null
  data_inicio: string | null
  data_fim_contrato: string | null
}

type LocalSimples = {
  id: string
  nome_local: string
  dia_envio_relatorio: number | null
  data_fim_contrato: string | null
}

export default function Dashboard() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [parceiros, setParceiros] = useState<ParceiroSimples[]>([])
  const [locais, setLocais] = useState<LocalSimples[]>([])
  const [tvCorporativa, setTvCorporativa] = useState<{ valor_mensal: number }[]>([])
  const [relatoriosPendentes, setRelatoriosPendentes] = useState<RelatorioComCliente[]>([])
  const [relatoriosRecentes, setRelatoriosRecentes] = useState<{ id: string; cliente_id: string | null; parceiro_id: string | null; local_id: string | null; mes_referencia: string; enviado: boolean; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)

  const hoje = startOfDay(new Date())
  const diaHoje = getDate(hoje)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: cliData }, { data: parData }, { data: relPendentes }, { data: todosRels }] = await Promise.all([
      supabase.from('clientes').select('*').eq('ativo', true).order('nome_empresa'),
      supabase.from('parceiros').select('id, nome_local, dia_envio_relatorio, data_inicio, data_fim_contrato').order('nome_local'),
      supabase
        .from('relatorios')
        .select('id, mes_referencia, enviado, cliente_id, clientes(nome_empresa, nome_responsavel, whatsapp)')
        .eq('enviado', false),
      supabase.from('relatorios').select('id, cliente_id, parceiro_id, local_id, mes_referencia, enviado, created_at'),
    ])

    const { data: tvData } = await supabase.from('tv_corporativa').select('valor_mensal')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: locaisData } = await (supabase as any)
      .from('locais')
      .select('id, nome_local, dia_envio_relatorio, data_fim_contrato')
      .eq('ativo', true)
      .order('nome_local')

    if (cliData) setClientes(cliData)
    if (parData) setParceiros(parData)
    if (locaisData) setLocais(locaisData as LocalSimples[])
    if (tvData) setTvCorporativa(tvData)
    if (relPendentes) setRelatoriosPendentes(relPendentes as RelatorioComCliente[])
    if (todosRels) setRelatoriosRecentes(todosRels)
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

  async function pularMes(clienteId: string | null, parceiroId: string | null, localId: string | null = null) {
    const mesRef = format(startOfMonth(subMonths(hoje, 1)), 'yyyy-MM-dd')
    const { error } = await supabase.from('relatorios').insert({
      cliente_id: clienteId,
      parceiro_id: parceiroId,
      local_id: localId,
      mes_referencia: mesRef,
      total_exibicoes: null,
      media_diaria: null,
      enviado: true,
      data_envio: new Date().toISOString(),
    })
    if (error) toast.error('Erro ao registrar')
    else { toast.success('Relatório marcado como enviado!'); loadData() }
  }

  const contratosAlerta = clientes
    .filter((c) => c.data_fim_contrato)
    .map((c) => ({
      ...c,
      dias: differenceInDays(parseISO(c.data_fim_contrato!), hoje),
    }))
    .filter((c) => c.dias <= 30)
    .sort((a, b) => a.dias - b.dias)

  const parceriasAlerta = parceiros
    .filter((p) => p.data_fim_contrato)
    .map((p) => ({
      ...p,
      dias: differenceInDays(parseISO(p.data_fim_contrato!), hoje),
    }))
    .filter((p) => p.dias <= 30)
    .sort((a, b) => a.dias - b.dias)

  const locaisAlerta = locais
    .filter((l) => l.data_fim_contrato)
    .map((l) => ({
      ...l,
      dias: differenceInDays(parseISO(l.data_fim_contrato!), hoje),
    }))
    .filter((l) => l.dias <= 30)
    .sort((a, b) => a.dias - b.dias)

  const mesAtualInicio = startOfMonth(hoje)

  const locaisComRelatorioHoje = locais.filter((l) => {
    if (!l.dia_envio_relatorio) return false
    if (diaHoje < l.dia_envio_relatorio) return false
    const cutoff = subMonths(mesAtualInicio, 1)
    const jaTemRelatorio = relatoriosRecentes.some((r) => {
      if (r.local_id !== l.id) return false
      if (!r.enviado) return false
      if (r.mes_referencia) return parseISO(r.mes_referencia) >= cutoff
      return new Date(r.created_at) >= cutoff
    })
    return !jaTemRelatorio
  })

  const clientesComRelatorioHoje = clientes.filter((c) => {
    if (!c.dia_envio_relatorio) return false
    if (c.data_fim_contrato && differenceInDays(parseISO(c.data_fim_contrato), hoje) < 0) return false
    const iniciou = c.data_inicio_contrato
      ? parseISO(c.data_inicio_contrato)
      : new Date(c.created_at)
    if (iniciou >= mesAtualInicio && getDate(iniciou) > (c.dia_envio_relatorio ?? 0)) return false
    const diaEnvio = c.dia_envio_relatorio
    if (diaHoje < diaEnvio) return false
    const cutoff = subMonths(mesAtualInicio, 1)
    const jaTemRelatorio = relatoriosRecentes.some((r) => {
      if (r.cliente_id !== c.id) return false
      if (!r.enviado) return false
      if (r.mes_referencia) return parseISO(r.mes_referencia) >= cutoff
      return new Date(r.created_at) >= cutoff
    })
    return !jaTemRelatorio
  })

  const parceirosComRelatorioHoje = parceiros.filter((p) => {
    if (!p.dia_envio_relatorio) return false
    if (p.data_fim_contrato && differenceInDays(parseISO(p.data_fim_contrato), hoje) < 0) return false
    if (diaHoje < p.dia_envio_relatorio) return false
    const cutoff = subMonths(mesAtualInicio, 1)
    const jaTemRelatorio = relatoriosRecentes.some((r) => {
      if (r.parceiro_id !== p.id) return false
      if (!r.enviado) return false
      if (r.mes_referencia) return parseISO(r.mes_referencia) >= cutoff
      return new Date(r.created_at) >= cutoff
    })
    return !jaTemRelatorio
  })

  type ProximoItem = { id: string; nome: string; dia: number; tipo: 'cliente' | 'parceiro' | 'local' }
  const proximosItens: ProximoItem[] = [
    ...clientes
      .filter((c) => c.dia_envio_relatorio && c.dia_envio_relatorio > diaHoje && c.dia_envio_relatorio <= diaHoje + 7)
      .map((c) => ({ id: c.id, nome: c.nome_empresa, dia: c.dia_envio_relatorio!, tipo: 'cliente' as const })),
    ...parceiros
      .filter((p) => p.dia_envio_relatorio && p.dia_envio_relatorio > diaHoje && p.dia_envio_relatorio <= diaHoje + 7)
      .map((p) => ({ id: p.id, nome: p.nome_local, dia: p.dia_envio_relatorio!, tipo: 'parceiro' as const })),
    ...locais
      .filter((l) => l.dia_envio_relatorio && l.dia_envio_relatorio > diaHoje && l.dia_envio_relatorio <= diaHoje + 7)
      .map((l) => ({ id: l.id, nome: l.nome_local, dia: l.dia_envio_relatorio!, tipo: 'local' as const })),
  ].sort((a, b) => a.dia - b.dia)

  const receitaMensal = clientes.reduce((acc, c) => acc + (c.valor_mensal || 0), 0)
    + tvCorporativa.reduce((acc, tv) => acc + (tv.valor_mensal || 0), 0)

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
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {format(hoje, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Alertas do dia */}
      {(clientesComRelatorioHoje.length > 0 || parceirosComRelatorioHoje.length > 0 || locaisComRelatorioHoje.length > 0 || contratosAlerta.filter(c => c.dias <= 0).length > 0 || parceriasAlerta.filter(p => p.dias <= 0).length > 0 || locaisAlerta.filter(l => l.dias <= 0).length > 0) && (() => {
        const temAtrasado =
          clientesComRelatorioHoje.some(c => (c.dia_envio_relatorio ?? 0) < diaHoje) ||
          parceirosComRelatorioHoje.some(p => (p.dia_envio_relatorio ?? 0) < diaHoje) ||
          locaisComRelatorioHoje.some(l => (l.dia_envio_relatorio ?? 0) < diaHoje) ||
          contratosAlerta.some(c => c.dias <= 0) ||
          parceriasAlerta.some(p => p.dias <= 0) ||
          locaisAlerta.some(l => l.dias <= 0)
        const boxCls = temAtrasado
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-amber-500/10 border-amber-500/30'
        const iconCls = temAtrasado ? 'text-red-400' : 'text-amber-400'
        const titleCls = temAtrasado ? 'text-red-300' : 'text-amber-300'
        return (
          <div className={`mb-6 border rounded-xl p-4 ${boxCls}`}>
            <div className="flex items-center gap-2 mb-3">
              <Bell className={`w-4 h-4 ${iconCls}`} />
              <p className={`font-semibold text-sm ${titleCls}`}>Ação necessária hoje</p>
            </div>
            <div className="space-y-2">
              {clientesComRelatorioHoje.map((c) => {
                const atraso = diaHoje - (c.dia_envio_relatorio ?? 0)
                const atrasado = atraso > 0
                return (
                  <div key={c.id} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${atrasado ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-zinc-100">{c.nome_empresa}</p>
                        {atrasado
                          ? <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">{atraso}d atrasado</span>
                          : <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-medium">Hoje</span>
                        }
                      </div>
                      <p className="text-xs text-zinc-500">Relatório de {format(subMonths(hoje, 1), 'MMMM/yyyy', { locale: ptBR })}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline"
                        className="text-xs h-7 px-2 text-zinc-400 border-white/[0.10] hover:bg-white/[0.05]"
                        onClick={() => pularMes(c.id, null)}>
                        <CheckCheck className="w-3 h-3 mr-1" />Já enviado
                      </Button>
                      <Link href="/relatorios">
                        <Button size="sm" className={`text-xs h-7 ${atrasado ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                          <Send className="w-3 h-3 mr-1" />Enviar
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
              {parceirosComRelatorioHoje.map((p) => {
                const atraso = diaHoje - (p.dia_envio_relatorio ?? 0)
                const atrasado = atraso > 0
                return (
                  <div key={p.id} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${atrasado ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                    <div className="flex items-center gap-2">
                      <Handshake className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-zinc-100">{p.nome_local}</p>
                          {atrasado
                            ? <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">{atraso}d atrasado</span>
                            : <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-medium">Hoje</span>
                          }
                        </div>
                        <p className="text-xs text-zinc-500">Relatório de {format(subMonths(hoje, 1), 'MMMM/yyyy', { locale: ptBR })}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline"
                        className="text-xs h-7 px-2 text-zinc-400 border-white/[0.10] hover:bg-white/[0.05]"
                        onClick={() => pularMes(null, p.id)}>
                        <CheckCheck className="w-3 h-3 mr-1" />Já enviado
                      </Button>
                      <Link href="/relatorios/gerar">
                        <Button size="sm" className={`text-xs h-7 ${atrasado ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                          <FileText className="w-3 h-3 mr-1" />Gerar
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
              {locaisComRelatorioHoje.map((l) => {
                const atraso = diaHoje - (l.dia_envio_relatorio ?? 0)
                const atrasado = atraso > 0
                return (
                  <div key={l.id} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${atrasado ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-zinc-100">{l.nome_local}</p>
                          {atrasado
                            ? <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">{atraso}d atrasado</span>
                            : <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-medium">Hoje</span>
                          }
                        </div>
                        <p className="text-xs text-zinc-500">Relatório de {format(subMonths(hoje, 1), 'MMMM/yyyy', { locale: ptBR })}</p>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline"
                        className="text-xs h-7 px-2 text-zinc-400 border-white/[0.10] hover:bg-white/[0.05]"
                        onClick={() => pularMes(null, null, l.id)}>
                        <CheckCheck className="w-3 h-3 mr-1" />Já enviado
                      </Button>
                      <Link href="/relatorios/gerar">
                        <Button size="sm" className={`text-xs h-7 ${atrasado ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                          <FileText className="w-3 h-3 mr-1" />Gerar
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
              {contratosAlerta.filter(c => c.dias <= 0).map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                  <div>
                    <p className="text-sm font-medium text-zinc-100">{c.nome_empresa}</p>
                    <p className="text-xs text-zinc-500">Contrato vencido há {Math.abs(c.dias)} dia(s)</p>
                  </div>
                  <Link href="/clientes">
                    <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 text-xs">
                      Renovar
                    </Button>
                  </Link>
                </div>
              ))}
              {parceriasAlerta.filter(p => p.dias <= 0).map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                  <div className="flex items-center gap-2">
                    <Handshake className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{p.nome_local}</p>
                      <p className="text-xs text-zinc-500">Parceria vencida há {Math.abs(p.dias)} dia(s)</p>
                    </div>
                  </div>
                  <Link href="/parceiros">
                    <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 text-xs">
                      Renovar
                    </Button>
                  </Link>
                </div>
              ))}
              {locaisAlerta.filter(l => l.dias <= 0).map((l) => (
                <div key={l.id} className="flex items-center justify-between bg-red-500/10 rounded-lg px-3 py-2 border border-red-500/20">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{l.nome_local}</p>
                      <p className="text-xs text-zinc-500">Contrato vencido há {Math.abs(l.dias)} dia(s)</p>
                    </div>
                  </div>
                  <Link href="/locais">
                    <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 text-xs">
                      Renovar
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Clientes ativos</p>
                <p className="text-3xl font-bold text-zinc-100 mt-1">{clientes.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Receita mensal</p>
                <p className="text-3xl font-bold text-zinc-100 mt-1">
                  R$ {receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={contratosAlerta.length + parceriasAlerta.length + locaisAlerta.length > 0 ? 'border-yellow-500/40' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Encerramentos</p>
                <p className="text-3xl font-bold text-yellow-400 mt-1">{contratosAlerta.length + parceriasAlerta.length + locaisAlerta.length}</p>
                <p className="text-xs text-zinc-500 mt-1">vencendo ou vencidos</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={relatoriosPendentes.length > 0 ? 'border-red-500/40' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Relatórios pendentes</p>
                <p className="text-3xl font-bold text-red-400 mt-1">{relatoriosPendentes.length}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-red-400" />
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
              Encerramentos próximos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contratosAlerta.length === 0 && parceriasAlerta.length === 0 && locaisAlerta.length === 0 ? (
              <p className="text-zinc-500 text-sm">Nenhum contrato ou parceria vencendo. Tudo certo!</p>
            ) : (
              <div className="space-y-3">
                {contratosAlerta.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b border-white/[0.08] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{c.nome_empresa}</p>
                      <p className="text-xs text-zinc-500">
                        Contrato até {format(parseISO(c.data_fim_contrato!), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    {c.dias < 0 ? (
                      <Badge variant="destructive">Vencido há {Math.abs(c.dias)}d</Badge>
                    ) : c.dias === 0 ? (
                      <Badge variant="destructive">Vence hoje</Badge>
                    ) : (
                      <Badge className="bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20">{c.dias}d restantes</Badge>
                    )}
                  </div>
                ))}
                {parceriasAlerta.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/[0.08] last:border-0">
                    <div className="flex items-center gap-2">
                      <Handshake className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{p.nome_local}</p>
                        <p className="text-xs text-zinc-500">
                          Parceria até {format(parseISO(p.data_fim_contrato!), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    {p.dias < 0 ? (
                      <Badge variant="destructive">Vencida há {Math.abs(p.dias)}d</Badge>
                    ) : p.dias === 0 ? (
                      <Badge variant="destructive">Vence hoje</Badge>
                    ) : (
                      <Badge className="bg-orange-500/20 text-orange-300 hover:bg-orange-500/20">{p.dias}d restantes</Badge>
                    )}
                  </div>
                ))}
                {locaisAlerta.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-2 border-b border-white/[0.08] last:border-0">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{l.nome_local}</p>
                        <p className="text-xs text-zinc-500">
                          Contrato até {format(parseISO(l.data_fim_contrato!), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                    {l.dias < 0 ? (
                      <Badge variant="destructive">Vencido há {Math.abs(l.dias)}d</Badge>
                    ) : l.dias === 0 ? (
                      <Badge variant="destructive">Vence hoje</Badge>
                    ) : (
                      <Badge className="bg-orange-500/20 text-orange-300 hover:bg-orange-500/20">{l.dias}d restantes</Badge>
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
              <CalendarCheck className="w-4 h-4 text-blue-500" />
              Próximos relatórios (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximosItens.length === 0 && relatoriosPendentes.length === 0 ? (
              <p className="text-zinc-500 text-sm">Nenhum relatório nos próximos 7 dias.</p>
            ) : (
              <div className="space-y-3">
                {proximosItens.map((item) => (
                  <div key={`${item.tipo}-${item.id}`} className="flex items-center justify-between py-2 border-b border-white/[0.08] last:border-0">
                    <div className="flex items-center gap-1.5">
                      {item.tipo === 'parceiro'
                        ? <Handshake className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        : item.tipo === 'local'
                          ? <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          : <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                      <div>
                        <p className="text-sm font-medium text-zinc-100">{item.nome}</p>
                        <p className="text-xs text-zinc-500">
                          Dia {item.dia} de {format(hoje, 'MMMM', { locale: ptBR })}
                          {item.tipo === 'parceiro' && ' · Parceiro'}
                          {item.tipo === 'local' && ' · Local'}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/20">
                      em {item.dia - diaHoje}d
                    </Badge>
                  </div>
                ))}
                {relatoriosPendentes.map((r) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/[0.08] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-zinc-100">{r.clientes?.nome_empresa}</p>
                      <p className="text-xs text-zinc-500">
                        Ref: {format(parseISO(r.mes_referencia), 'MMMM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => marcarEnviado(r.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-xs h-7"
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
