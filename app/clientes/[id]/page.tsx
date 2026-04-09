'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Cliente, Relatorio } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Phone,
  Monitor,
  CalendarDays,
  TrendingUp,
  Check,
  Clock,
  DollarSign,
  Send,
  Trash2,
} from 'lucide-react'
import { format, parseISO, differenceInMonths, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

export default function ClientePerfilPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [relatorios, setRelatorios] = useState<Relatorio[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    const [{ data: cli }, { data: rels }] = await Promise.all([
      supabase.from('clientes').select('*').eq('id', id).single(),
      supabase
        .from('relatorios')
        .select('*')
        .eq('cliente_id', id)
        .order('mes_referencia', { ascending: false }),
    ])
    if (cli) setCliente(cli)
    if (rels) setRelatorios(rels)
    setLoading(false)
  }

  async function enviarWhatsApp(rel: Relatorio) {
    if (!cliente?.whatsapp) { toast.error('Cliente sem WhatsApp'); return }
    const numero = cliente.whatsapp.replace(/\D/g, '')
    const mes = format(parseISO(rel.mes_referencia), 'MMMM/yyyy', { locale: ptBR })
    const exibicoes = rel.total_exibicoes != null ? rel.total_exibicoes.toLocaleString('pt-BR') : '--'
    const media = rel.media_diaria != null ? rel.media_diaria.toLocaleString('pt-BR') : '--'
    const msg = encodeURIComponent(
      `Olá ${cliente.nome_responsavel}! 😊\n\nSegue o relatório de ${mes} da ${cliente.nome_empresa} na Pulse Marketing Indoor.\n\n📊 Total de exibições: ${exibicoes}\n📈 Média diária: ${media}\n\nQualquer dúvida, estou à disposição!`
    )
    window.open(`https://wa.me/55${numero}?text=${msg}`, '_blank')
    const { error } = await supabase
      .from('relatorios')
      .update({ enviado: true, data_envio: new Date().toISOString() })
      .eq('id', rel.id)
    if (!error) { toast.success('Marcado como enviado!'); loadData() }
  }

  async function excluirRelatorio(relId: string) {
    if (!confirm('Excluir este relatório?')) return
    const { error } = await supabase.from('relatorios').delete().eq('id', relId)
    if (error) { toast.error('Erro ao excluir') } else { toast.success('Excluído'); loadData() }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-zinc-400 text-sm">Carregando...</p>
      </div>
    )
  }

  if (!cliente) {
    return (
      <div className="p-8">
        <p className="text-zinc-400">Cliente não encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/clientes')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    )
  }

  // Métricas
  const mesesAtivo = cliente.data_inicio_contrato
    ? differenceInMonths(new Date(), parseISO(cliente.data_inicio_contrato))
    : null
  const totalPago = mesesAtivo != null ? mesesAtivo * cliente.valor_mensal : null
  const diasRestantes = cliente.data_fim_contrato
    ? differenceInDays(parseISO(cliente.data_fim_contrato), new Date())
    : null
  const enviados = relatorios.filter((r) => r.enviado)
  const pendentes = relatorios.filter((r) => !r.enviado)
  const totalExibicoes = relatorios.reduce((acc, r) => acc + (r.total_exibicoes ?? 0), 0)

  function statusContrato() {
    if (diasRestantes === null) return null
    if (diasRestantes < 0) return <Badge variant="destructive">Contrato vencido</Badge>
    if (diasRestantes <= 30) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Vence em {diasRestantes}d</Badge>
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/clientes')}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Clientes
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">{cliente.nome_empresa}</h1>
            <p className="text-zinc-500 text-sm mt-0.5">{cliente.nome_responsavel}</p>
          </div>
          {statusContrato()}
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Mensalidade
            </div>
            <p className="text-lg font-bold text-green-600">
              R$ {cliente.valor_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Total pago
            </div>
            <p className="text-lg font-bold text-zinc-800">
              {totalPago != null
                ? `R$ ${totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : '--'}
            </p>
            {mesesAtivo != null && (
              <p className="text-xs text-zinc-400">{mesesAtivo} meses</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <TrendingUp className="w-3.5 h-3.5" /> Exibições total
            </div>
            <p className="text-lg font-bold text-zinc-800">
              {totalExibicoes > 0 ? totalExibicoes.toLocaleString('pt-BR') : '--'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-zinc-400 text-xs mb-1">
              <Clock className="w-3.5 h-3.5" /> Relatórios
            </div>
            <p className="text-lg font-bold text-zinc-800">{relatorios.length}</p>
            <p className="text-xs text-zinc-400">{enviados.length} enviado(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Dados do cliente */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-zinc-600 uppercase tracking-wide">Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
            <a
              href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-700 hover:text-green-600 transition-colors"
            >
              {cliente.whatsapp}
            </a>
          </div>
          {cliente.locais?.length > 0 && (
            <div className="flex items-start gap-3">
              <Monitor className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1.5">
                {cliente.locais.map((l) => (
                  <span key={l} className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded-full">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(cliente.data_inicio_contrato || cliente.data_fim_contrato) && (
            <div className="flex items-center gap-3 text-sm">
              <CalendarDays className="w-4 h-4 text-zinc-400 shrink-0" />
              <span className="text-zinc-600">
                {cliente.data_inicio_contrato
                  ? format(parseISO(cliente.data_inicio_contrato), 'dd/MM/yyyy')
                  : '?'}
                {' → '}
                {cliente.data_fim_contrato
                  ? format(parseISO(cliente.data_fim_contrato), 'dd/MM/yyyy')
                  : '?'}
              </span>
            </div>
          )}
          {cliente.dia_envio_relatorio && (
            <p className="text-xs text-zinc-400 ml-7">
              Relatório enviado todo dia {cliente.dia_envio_relatorio} do mês
            </p>
          )}
        </CardContent>
      </Card>

      {/* Relatórios */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
          Histórico de relatórios
        </h2>

        {relatorios.length === 0 ? (
          <p className="text-zinc-400 text-sm py-4">Nenhum relatório cadastrado para este cliente.</p>
        ) : (
          <div className="space-y-2">
            {relatorios.map((r) => (
              <Card key={r.id} className={r.enviado ? 'opacity-70' : 'border-orange-200'}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-zinc-800 capitalize">
                        {format(parseISO(r.mes_referencia), 'MMMM/yyyy', { locale: ptBR })}
                      </p>
                      <div className="flex gap-3 text-xs text-zinc-500 mt-0.5">
                        {r.total_exibicoes != null && (
                          <span>{r.total_exibicoes.toLocaleString('pt-BR')} exibições</span>
                        )}
                        {r.media_diaria != null && (
                          <span>média {r.media_diaria}/dia</span>
                        )}
                        {r.data_envio && (
                          <span>enviado {format(parseISO(r.data_envio), 'dd/MM/yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {r.enviado ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                          <Check className="w-3 h-3 mr-1" /> Enviado
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => enviarWhatsApp(r)}
                          className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                        >
                          <Send className="w-3 h-3 mr-1" /> Enviar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 border-red-200 hover:bg-red-50 px-2 h-7"
                        onClick={() => excluirRelatorio(r.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
