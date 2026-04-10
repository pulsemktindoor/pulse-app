'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Cliente, Relatorio } from '@/lib/supabase/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, ChevronLeft, ChevronRight, AlertTriangle, Check, Clock, FileText, Handshake, User } from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

type Parceiro = {
  id: string
  nome_local: string
  dia_envio_relatorio: number | null
}

type Evento = {
  dia: number
  tipo: 'relatorio' | 'vencimento'
  cliente: string
  info: string
  cor: string
}

type ItemLateral = {
  id: string
  nome: string
  dia: number
  tipo: 'cliente' | 'parceiro'
  status: 'enviado' | 'pendente' | 'a_criar'
  relatorioId?: string
}

export default function CalendarioPage() {
  const [mesAtual, setMesAtual] = useState(new Date())
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [relatorios, setRelatorios] = useState<Relatorio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: cliData }, { data: parData }, { data: relData }] = await Promise.all([
      supabase.from('clientes').select('*').order('nome_empresa'),
      supabase.from('parceiros').select('id, nome_local, dia_envio_relatorio').order('nome_local'),
      supabase.from('relatorios').select('*'),
    ])
    if (cliData) setClientes(cliData)
    if (parData) setParceiros(parData)
    if (relData) setRelatorios(relData)
    setLoading(false)
  }

  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth() + 1
  // Os relatórios do mês exibido são gerados neste mês mas referem-se ao mês ANTERIOR
  // (o app salva sempre subMonths(now, 1)), então buscamos pelo mês anterior
  const mesRef = format(startOfMonth(subMonths(mesAtual, 1)), 'yyyy-MM-dd')

  function getEventos(): Record<number, Evento[]> {
    const map: Record<number, Evento[]> = {}
    function add(dia: number, ev: Evento) {
      if (!map[dia]) map[dia] = []
      map[dia].push(ev)
    }

    // Clientes
    clientes.forEach((c) => {
      if (c.dia_envio_relatorio) {
        const fimContrato = c.data_fim_contrato ? parseISO(c.data_fim_contrato) : null
        if (fimContrato && fimContrato < startOfMonth(mesAtual)) return
        const inicioContrato = c.data_inicio_contrato ? parseISO(c.data_inicio_contrato) : null
        if (inicioContrato && inicioContrato >= startOfMonth(mesAtual)) return

        const enviado = relatorios.some(r => r.cliente_id === c.id && r.mes_referencia === mesRef && r.enviado)
        const pendente = relatorios.some(r => r.cliente_id === c.id && r.mes_referencia === mesRef && !r.enviado)
        add(c.dia_envio_relatorio, {
          dia: c.dia_envio_relatorio,
          tipo: 'relatorio',
          cliente: c.nome_empresa,
          info: enviado ? 'Enviado' : pendente ? 'Pendente' : 'A enviar',
          cor: enviado ? 'green' : pendente ? 'orange' : 'purple',
        })
      }

      if (c.data_fim_contrato) {
        const fim = parseISO(c.data_fim_contrato)
        if (fim.getFullYear() === ano && fim.getMonth() + 1 === mes) {
          add(fim.getDate(), {
            dia: fim.getDate(),
            tipo: 'vencimento',
            cliente: c.nome_empresa,
            info: 'Contrato vence',
            cor: 'red',
          })
        }
      }
    })

    // Parceiros
    parceiros.forEach((p) => {
      if (!p.dia_envio_relatorio) return
      const enviado = relatorios.some(r => r.parceiro_id === p.id && r.mes_referencia === mesRef && r.enviado)
      const pendente = relatorios.some(r => r.parceiro_id === p.id && r.mes_referencia === mesRef && !r.enviado)
      add(p.dia_envio_relatorio, {
        dia: p.dia_envio_relatorio,
        tipo: 'relatorio',
        cliente: p.nome_local,
        info: enviado ? 'Enviado' : pendente ? 'Pendente' : 'A enviar',
        cor: enviado ? 'green' : pendente ? 'orange' : 'purple',
      })
    })

    return map
  }

  // Lista lateral: clientes + parceiros, ordenados por dia do mês
  function getItensLaterais(): ItemLateral[] {
    const itens: ItemLateral[] = []

    clientes.forEach((c) => {
      if (!c.dia_envio_relatorio) return
      const fimContrato = c.data_fim_contrato ? parseISO(c.data_fim_contrato) : null
      if (fimContrato && fimContrato < startOfMonth(mesAtual)) return
      const inicioContrato = c.data_inicio_contrato ? parseISO(c.data_inicio_contrato) : null
      if (inicioContrato && inicioContrato >= startOfMonth(mesAtual)) return

      const rel = relatorios.find(r => r.cliente_id === c.id && r.mes_referencia === mesRef)
      itens.push({
        id: c.id,
        nome: c.nome_empresa,
        dia: c.dia_envio_relatorio,
        tipo: 'cliente',
        status: rel ? (rel.enviado ? 'enviado' : 'pendente') : 'a_criar',
        relatorioId: rel?.id,
      })
    })

    parceiros.forEach((p) => {
      if (!p.dia_envio_relatorio) return
      const rel = relatorios.find(r => r.parceiro_id === p.id && r.mes_referencia === mesRef)
      itens.push({
        id: p.id,
        nome: p.nome_local,
        dia: p.dia_envio_relatorio,
        tipo: 'parceiro',
        status: rel ? (rel.enviado ? 'enviado' : 'pendente') : 'a_criar',
        relatorioId: rel?.id,
      })
    })

    return itens.sort((a, b) => a.dia - b.dia)
  }

  const vencimentosProximos = clientes
    .filter((c) => {
      if (!c.data_fim_contrato) return false
      const dias = differenceInDays(parseISO(c.data_fim_contrato), new Date())
      return dias >= 0 && dias <= 60
    })
    .sort((a, b) =>
      differenceInDays(parseISO(a.data_fim_contrato!), new Date()) -
      differenceInDays(parseISO(b.data_fim_contrato!), new Date())
    )

  const diasDoMes = eachDayOfInterval({ start: startOfMonth(mesAtual), end: endOfMonth(mesAtual) })
  const primeiroDiaSemana = startOfMonth(mesAtual).getDay()
  const eventos = getEventos()
  const itensLaterais = getItensLaterais()
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const corClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    orange: 'bg-orange-100 text-orange-800',
    purple: 'bg-purple-100 text-purple-800',
    red: 'bg-red-100 text-red-800',
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Calendário</h1>
        <p className="text-zinc-500 text-sm mt-1">Relatórios e vencimentos de contratos</p>
      </div>

      {/* Alertas de vencimento */}
      {vencimentosProximos.length > 0 && (
        <div className="mb-6 space-y-2">
          {vencimentosProximos.map((c) => {
            const dias = differenceInDays(parseISO(c.data_fim_contrato!), new Date())
            return (
              <div
                key={c.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${dias <= 15 ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-yellow-50 text-yellow-800 border border-yellow-200'}`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{c.nome_empresa}</strong> — contrato vence em{' '}
                  {dias === 0 ? 'hoje' : `${dias} dia${dias !== 1 ? 's' : ''}`}
                  {' '}({format(parseISO(c.data_fim_contrato!), 'dd/MM/yyyy')})
                </span>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setMesAtual(subMonths(mesAtual, 1))}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-zinc-600" />
                </button>
                <h2 className="font-semibold text-zinc-800 capitalize">
                  {format(mesAtual, 'MMMM yyyy', { locale: ptBR })}
                </h2>
                <button
                  onClick={() => setMesAtual(addMonths(mesAtual, 1))}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-zinc-600" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {diasSemana.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-zinc-400 py-1">{d}</div>
                ))}
                {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {diasDoMes.map((dia) => {
                  const d = dia.getDate()
                  const evs = eventos[d] || []
                  const hoje = isToday(dia)
                  return (
                    <div
                      key={d}
                      className={`min-h-[56px] rounded-lg p-1 ${hoje ? 'bg-purple-50 ring-1 ring-purple-300' : 'hover:bg-zinc-50'}`}
                    >
                      <p className={`text-xs font-medium text-right mb-1 ${hoje ? 'text-purple-700' : 'text-zinc-500'}`}>
                        {d}
                      </p>
                      <div className="space-y-0.5">
                        {evs.map((ev, i) => (
                          <div
                            key={i}
                            title={`${ev.cliente} — ${ev.info}`}
                            className={`text-[9px] leading-tight px-1 py-0.5 rounded truncate ${corClasses[ev.cor]}`}
                          >
                            {ev.cliente.length > 12 ? ev.cliente.slice(0, 11) + '…' : ev.cliente}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-zinc-100">
                {[
                  { cor: 'bg-green-200', label: 'Enviado' },
                  { cor: 'bg-orange-200', label: 'Pendente' },
                  { cor: 'bg-purple-200', label: 'A enviar' },
                  { cor: 'bg-red-200', label: 'Contrato vence' },
                ].map(({ cor, label }) => (
                  <span key={label} className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <span className={`w-3 h-3 rounded ${cor} inline-block`} /> {label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista lateral */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
              Relatórios de {format(mesAtual, 'MMMM', { locale: ptBR })}
            </h3>
            <span className="text-xs text-zinc-400">
              {itensLaterais.filter(i => i.status === 'enviado').length}/{itensLaterais.length} enviados
            </span>
          </div>

          {loading ? (
            <p className="text-zinc-400 text-sm">Carregando...</p>
          ) : itensLaterais.length === 0 ? (
            <p className="text-zinc-400 text-sm">Nenhum relatório neste mês.</p>
          ) : (
            <div className="space-y-2">
              {itensLaterais.map((item) => (
                <div key={`${item.tipo}-${item.id}`} className="flex items-center justify-between p-3 bg-white rounded-lg border border-zinc-100 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {item.tipo === 'parceiro'
                        ? <Handshake className="w-3 h-3 text-zinc-400 shrink-0" />
                        : <User className="w-3 h-3 text-zinc-400 shrink-0" />
                      }
                      <p className="text-sm font-medium text-zinc-800 truncate">{item.nome}</p>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Dia {item.dia} · {item.tipo === 'parceiro' ? 'Parceiro' : 'Cliente'}
                    </p>
                  </div>
                  {item.status === 'enviado' ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs shrink-0">
                      <Check className="w-3 h-3 mr-1" /> Enviado
                    </Badge>
                  ) : item.status === 'pendente' ? (
                    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs shrink-0">
                      <Clock className="w-3 h-3 mr-1" /> Pendente
                    </Badge>
                  ) : (
                    <Link href="/relatorios/gerar">
                      <Badge className="bg-zinc-100 text-zinc-600 hover:bg-purple-100 hover:text-purple-700 cursor-pointer text-xs shrink-0 transition-colors">
                        <FileText className="w-3 h-3 mr-1" /> Gerar
                      </Badge>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
