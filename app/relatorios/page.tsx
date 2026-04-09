'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Cliente } from '@/lib/supabase/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Check, FileText, Send, Trash2 } from 'lucide-react'
import { format, parseISO, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

type RelatorioComCliente = {
  id: string
  cliente_id: string
  mes_referencia: string
  total_exibicoes: number | null
  media_diaria: number | null
  enviado: boolean
  data_envio: string | null
  clientes: { nome_empresa: string; nome_responsavel: string; whatsapp: string; locais: string[] } | null
}

export default function RelatoriosPage() {
  const [relatorios, setRelatorios] = useState<RelatorioComCliente[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    cliente_id: '',
    mes_referencia: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    total_exibicoes: '',
    media_diaria: '',
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [{ data: relData }, { data: cliData }] = await Promise.all([
      supabase
        .from('relatorios')
        .select('*, clientes(nome_empresa, nome_responsavel, whatsapp, locais)')
        .order('mes_referencia', { ascending: false }),
      supabase.from('clientes').select('*').order('nome_empresa'),
    ])
    if (relData) setRelatorios(relData as RelatorioComCliente[])
    if (cliData) setClientes(cliData)
    setLoading(false)
  }

  async function salvarRelatorio() {
    if (!form.cliente_id) { toast.error('Selecione o cliente'); return }
    setSalvando(true)
    const { error } = await supabase.from('relatorios').insert({
      cliente_id: form.cliente_id,
      mes_referencia: form.mes_referencia,
      total_exibicoes: form.total_exibicoes ? parseInt(form.total_exibicoes) : null,
      media_diaria: form.media_diaria ? parseFloat(form.media_diaria) : null,
      enviado: false,
    })
    if (error) {
      toast.error('Erro ao salvar relatório')
    } else {
      toast.success('Relatório criado!')
      setDialogOpen(false)
      setForm({ cliente_id: '', mes_referencia: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), total_exibicoes: '', media_diaria: '' })
      loadData()
    }
    setSalvando(false)
  }

  function saudacao() {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  // Abre WhatsApp com mensagem pronta e marca como enviado
  async function enviarViaWhatsApp(relatorio: RelatorioComCliente) {
    if (!relatorio.clientes?.whatsapp) {
      toast.error('Cliente sem WhatsApp cadastrado')
      return
    }
    const numero = relatorio.clientes.whatsapp.replace(/\D/g, '')
    const primeiroNome = relatorio.clientes.nome_responsavel.split(' ')[0]
    const exibicoes = relatorio.total_exibicoes != null
      ? relatorio.total_exibicoes.toLocaleString('pt-BR')
      : '--'
    const msg = encodeURIComponent(
      `${saudacao()} ${primeiroNome}, tudo bem?\n\nPassando aqui para enviar o relatório de exibições do seu anúncio.\nO anúncio teve *${exibicoes} exibições* nos últimos 30 dias.\n\nQualquer dúvida fico à disposição.`
    )
    window.open(`https://wa.me/55${numero}?text=${msg}`, '_blank')

    // Marca como enviado automaticamente
    const { error } = await supabase
      .from('relatorios')
      .update({ enviado: true, data_envio: new Date().toISOString() })
      .eq('id', relatorio.id)
    if (!error) {
      toast.success('Relatório marcado como enviado!')
      loadData()
    }
  }

  async function excluirRelatorio(id: string) {
    if (!confirm('Excluir este relatório?')) return
    const { error } = await supabase.from('relatorios').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir')
    } else {
      toast.success('Relatório excluído')
      loadData()
    }
  }

  const pendentes = relatorios.filter((r) => !r.enviado)
  const enviados = relatorios.filter((r) => r.enviado)

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Relatórios</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {pendentes.length} pendente(s) · {enviados.length} enviado(s)
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar relatório</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Cliente *</Label>
                <Select onValueChange={(v) => setForm({ ...form, cliente_id: v as string })}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_empresa}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Mês de referência</Label>
                <Input
                  type="month"
                  value={form.mes_referencia.slice(0, 7)}
                  onChange={(e) => setForm({ ...form, mes_referencia: e.target.value + '-01' })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Total de exibições</Label>
                  <Input type="number" placeholder="Ex: 4800" value={form.total_exibicoes}
                    onChange={(e) => setForm({ ...form, total_exibicoes: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Média diária</Label>
                  <Input type="number" placeholder="Ex: 160" value={form.media_diaria}
                    onChange={(e) => setForm({ ...form, media_diaria: e.target.value })} />
                </div>
              </div>
              <Button onClick={salvarRelatorio} disabled={salvando} className="w-full bg-purple-600 hover:bg-purple-700">
                {salvando ? 'Salvando...' : 'Criar relatório'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-zinc-400 text-sm">Carregando...</p>
      ) : (
        <>
          {/* Pendentes */}
          {pendentes.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Pendentes de envio</h2>
              <div className="space-y-3">
                {pendentes.map((r) => (
                  <Card key={r.id} className="border-orange-200">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-zinc-900 truncate">{r.clientes?.nome_empresa}</p>
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
                          <Button
                            size="sm"
                            onClick={() => enviarViaWhatsApp(r)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Send className="w-3.5 h-3.5 mr-1.5" />
                            Enviar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 border-red-200 hover:bg-red-50 px-2"
                            onClick={() => excluirRelatorio(r.id)}
                          >
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

          {/* Enviados */}
          {enviados.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Enviados</h2>
              <div className="space-y-2">
                {enviados.map((r) => (
                  <Card key={r.id} className="opacity-70">
                    <CardContent className="py-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-zinc-700">{r.clientes?.nome_empresa}</p>
                          <p className="text-xs text-zinc-400">
                            {format(parseISO(r.mes_referencia), 'MMMM/yyyy', { locale: ptBR })}
                            {r.data_envio && ` · enviado em ${format(parseISO(r.data_envio), 'dd/MM/yyyy')}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => enviarViaWhatsApp(r)}
                            variant="outline"
                            className="text-green-700 border-green-300 hover:bg-green-50 h-7 text-xs"
                          >
                            <Send className="w-3 h-3 mr-1" /> Reenviar
                          </Button>
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
            </div>
          )}

          {relatorios.length === 0 && (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
              <p className="text-zinc-400">Nenhum relatório cadastrado.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
