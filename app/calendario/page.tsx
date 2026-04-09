'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Cliente, Relatorio } from '@/lib/supabase/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, ChevronLeft, ChevronRight, AlertTriangle, Check, Clock } from 'lucide-react'
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Evento = {
  dia: number
  tipo: 'relatorio' | 'vencimento'
  cliente: string
  info: string
  cor: string
}

export default function CalendarioPage() {
  const [mesAtual, setMesAtual] = useState(new Date())
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [relatorios, setRelatorios] = useState<Relatorio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: cliData }, { data: relData }] = await Promise.all([
      supabase.from('clientes').select('*').order('nome_empresa'),
      supabase.from('relatorios').select('*'),
    ])
    if (cliData) setClientes(cliData)
    if (relData) setRelatorios(relData)
    setLoading(false)
  }

  // Monta eventos para o mês exibido
  function getEventos(): Record<number, Evento[]> {
    const map: Record<number, Evento[]> = {}

    function add(dia: number, ev: Evento) {
      if (!map[dia]) map[dia] = []
      map[dia].push(ev)
    }

    const ano = mesAtual.getFullYear()
    const mes = mesAtual.getMonth() + 1

    clientes.forEach((c) => {
      // Dia de envio do relatório
      if (c.dia_envio_relatorio) {
        const dia = c.dia_envio_relatorio
        // Verifica se já foi enviado neste mês
        const mesRef = `${ano}-${String(mes).padStart(2, '0')}-01`
        const enviado = relatorios.some(
          (r) => r.cliente_id === c.id && r.mes_referencia === mesRef && r.enviado
        )
        const pendente = relatorios.some(
          (r) => r.cliente_id === c.id && r.mes_referencia === mesRef && !r.enviado
        )
        add(dia, {
          dia,
          tipo: 'relatorio',
          cliente: c.nome_empresa,
          info: enviado ? 'Enviado' : pendente ? 'Pendente' : 'A enviar',
          cor: enviado ? 'green' : pendente ? 'orange' : 'purple',
        })
      }

      // Vencimento de contrato neste mês
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

    return map
  }

  // Vencimentos próximos (global — qualquer mês)
  const vencimentosProximos = clientes
    .filter((c) => {
      if (!c.data_fim_contrato) return false
      const dias = differenceInDays(parseISO(c.data_fim_contrato), new Date())
      return dias >= 0 && dias <= 60
    })
    .sort((a, b) => {
      const da = differenceInDays(parseISO(a.data_fim_contrato!), new Date())
      const db = differenceInDays(parseISO(b.data_fim_contrato!), new Date())
      return da - db
    })

  const dias = eachDayOfInterval({ start: startOfMonth(mesAtual), end: endOfMonth(mesAtual) })
  const primeiroDiaSemana = startOfMonth(mesAtual).getDay() // 0=Dom
  const eventos = getEventos()
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const corClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    orange: 'bg-orange-100 text-orange-800',
    purple: 'bg-purple-100 text-purple-800',
    red: 'bg-red-100 text-red-800',
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Calendário</h1>
          <p className="text-zinc-500 text-sm mt-1">Datas de relatórios e vencimentos de contratos</p>
        </div>
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
              {/* Navegação de mês */}
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

              {/* Grid do calendário */}
              <div className="grid grid-cols-7 gap-1">
                {/* Cabeçalho */}
                {diasSemana.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-zinc-400 py-1">
                    {d}
                  </div>
                ))}

                {/* Células vazias antes do dia 1 */}
                {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}

                {/* Dias */}
                {dias.map((dia) => {
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
                            {ev.cliente.split(' ')[0]}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legenda */}
              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-zinc-100">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="w-3 h-3 rounded bg-green-200 inline-block" /> Enviado
                </span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="w-3 h-3 rounded bg-orange-200 inline-block" /> Pendente
                </span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="w-3 h-3 rounded bg-purple-200 inline-block" /> A enviar
                </span>
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="w-3 h-3 rounded bg-red-200 inline-block" /> Contrato vence
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista lateral — eventos do mês */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Este mês
          </h3>
          {loading ? (
            <p className="text-zinc-400 text-sm">Carregando...</p>
          ) : (
            <div className="space-y-2">
              {clientes.length === 0 && (
                <p className="text-zinc-400 text-sm">Nenhum cliente cadastrado.</p>
              )}
              {clientes.map((c) => {
                const diaRel = c.dia_envio_relatorio
                const ano = mesAtual.getFullYear()
                const mes = mesAtual.getMonth() + 1
                const mesRef = `${ano}-${String(mes).padStart(2, '0')}-01`
                const relMes = relatorios.find((r) => r.cliente_id === c.id && r.mes_referencia === mesRef)

                if (!diaRel) return null
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-zinc-100">
                    <div>
                      <p className="text-sm font-medium text-zinc-800 leading-none">{c.nome_empresa}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Relatório dia {diaRel}</p>
                    </div>
                    {relMes ? (
                      relMes.enviado ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                          <Check className="w-3 h-3 mr-1" /> Enviado
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 text-xs">
                          <Clock className="w-3 h-3 mr-1" /> Pendente
                        </Badge>
                      )
                    ) : (
                      <Badge className="bg-zinc-100 text-zinc-500 hover:bg-zinc-100 text-xs">A criar</Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
