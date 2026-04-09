'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Send, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

type RelatorioComVinculo = {
  id: string
  cliente_id: string | null
  parceiro_id: string | null
  mes_referencia: string
  total_exibicoes: number | null
  media_diaria: number | null
  enviado: boolean
  data_envio: string | null
  clientes: { nome_empresa: string; nome_responsavel: string; whatsapp: string } | null
  parceiros: { nome_local: string; nome_responsavel: string; whatsapp: string } | null
}

export default function RelatoriosPage() {
  const [relatorios, setRelatorios] = useState<RelatorioComVinculo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data } = await supabase
      .from('relatorios')
      .select('*, clientes(nome_empresa, nome_responsavel, whatsapp), parceiros(nome_local, nome_responsavel, whatsapp)')
      .order('mes_referencia', { ascending: false })
    if (data) setRelatorios(data as RelatorioComVinculo[])
    setLoading(false)
  }

  function getNome(r: RelatorioComVinculo) {
    return r.clientes?.nome_empresa || r.parceiros?.nome_local || '—'
  }

  function getContato(r: RelatorioComVinculo) {
    return r.clientes
      ? { whatsapp: r.clientes.whatsapp, nome: r.clientes.nome_responsavel }
      : r.parceiros
      ? { whatsapp: r.parceiros.whatsapp, nome: r.parceiros.nome_responsavel }
      : null
  }

  function saudacao() {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  async function enviarViaWhatsApp(r: RelatorioComVinculo) {
    const contato = getContato(r)
    if (!contato?.whatsapp) { toast.error('Sem WhatsApp cadastrado'); return }
    const numero = contato.whatsapp.replace(/\D/g, '')
    const primeiroNome = contato.nome.split(' ')[0]
    const exibicoes = r.total_exibicoes != null ? r.total_exibicoes.toLocaleString('pt-BR') : '--'
    const msg = encodeURIComponent(
      `${saudacao()} ${primeiroNome}, tudo bem?\n\nPassando aqui para enviar o relatório de exibições do seu anúncio.\nO anúncio teve *${exibicoes} exibições* nos últimos 30 dias.\n\nQualquer dúvida fico à disposição.`
    )
    window.open(`https://wa.me/55${numero}?text=${msg}`, '_blank')
    const { error } = await supabase
      .from('relatorios')
      .update({ enviado: true, data_envio: new Date().toISOString() })
      .eq('id', r.id)
    if (!error) { toast.success('Marcado como enviado!'); loadData() }
  }

  async function excluirRelatorio(id: string) {
    if (!confirm('Excluir este relatório?')) return
    const { error } = await supabase.from('relatorios').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir') } else { toast.success('Excluído'); loadData() }
  }

  const pendentes = relatorios.filter((r) => !r.enviado)
  const enviados = relatorios.filter((r) => r.enviado)

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Relatórios</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {pendentes.length} pendente(s) · {enviados.length} enviado(s)
        </p>
      </div>

      {loading ? (
        <p className="text-zinc-400 text-sm">Carregando...</p>
      ) : (
        <>
          {pendentes.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Pendentes de envio</h2>
              <div className="space-y-3">
                {pendentes.map((r) => (
                  <Card key={r.id} className="border-orange-200">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-zinc-900 truncate">{getNome(r)}</p>
                          <p className="text-sm text-zinc-500">
                            {format(parseISO(r.mes_referencia), 'MMMM/yyyy', { locale: ptBR })}
                          </p>
                          <div className="mt-1 flex gap-4 text-sm text-zinc-600">
                            {r.total_exibicoes != null && (
                              <span><span className="text-zinc-400">Exibições:</span> {r.total_exibicoes.toLocaleString('pt-BR')}</span>
                            )}
                            {r.media_diaria != null && (
                              <span><span className="text-zinc-400">Média/dia:</span> {r.media_diaria}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" onClick={() => enviarViaWhatsApp(r)} className="bg-green-600 hover:bg-green-700 text-white">
                            <Send className="w-3.5 h-3.5 mr-1.5" /> Enviar
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 px-2" onClick={() => excluirRelatorio(r.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {enviados.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Enviados</h2>
              <div className="space-y-2">
                {enviados.map((r) => (
                  <Card key={r.id} className="opacity-70">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-zinc-700">{getNome(r)}</p>
                          <p className="text-xs text-zinc-400">
                            {format(parseISO(r.mes_referencia), 'MMMM/yyyy', { locale: ptBR })}
                            {r.data_envio && ` · enviado em ${format(parseISO(r.data_envio), 'dd/MM/yyyy')}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => enviarViaWhatsApp(r)} variant="outline" className="text-green-700 border-green-300 hover:bg-green-50 h-7 text-xs">
                            <Send className="w-3 h-3 mr-1" /> Reenviar
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 px-2 h-7" onClick={() => excluirRelatorio(r.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {relatorios.length === 0 && (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
              <p className="text-zinc-400">Nenhum relatório cadastrado.</p>
              <p className="text-zinc-300 text-sm mt-1">Use "Gerar Relatório" para criar um.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
