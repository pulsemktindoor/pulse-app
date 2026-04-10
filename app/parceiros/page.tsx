'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, Phone, CalendarDays, Pencil, Trash2, Handshake } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type Parceiro = {
  id: string
  nome_local: string
  nome_responsavel: string
  whatsapp: string
  data_inicio: string | null
  data_fim_contrato: string | null
  observacoes: string | null
  dia_envio_relatorio: number | null
  created_at: string
}

const emptyForm = {
  nome_local: '',
  nome_responsavel: '',
  whatsapp: '',
  data_inicio: '',
  data_fim_contrato: '',
  observacoes: '',
  dia_envio_relatorio: '5',
}

function StatusContrato({ dataFim }: { dataFim: string | null }) {
  if (!dataFim) return <Badge className="bg-zinc-100 text-zinc-500 hover:bg-zinc-100">Sem data</Badge>
  const dias = differenceInDays(parseISO(dataFim), new Date())
  if (dias < 0) return <Badge variant="destructive">Vencido</Badge>
  if (dias <= 30) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Vence em {dias}d</Badge>
  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
}

export default function ParceirosPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Parceiro | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { loadParceiros() }, [])

  async function loadParceiros() {
    const { data } = await supabase.from('parceiros').select('*').order('nome_local')
    if (data) setParceiros(data)
    setLoading(false)
  }

  async function salvar() {
    if (!form.nome_local || !form.nome_responsavel || !form.whatsapp) {
      toast.error('Preencha nome do local, responsável e WhatsApp')
      return
    }
    setSalvando(true)
    const payload = {
      nome_local: form.nome_local.trim(),
      nome_responsavel: form.nome_responsavel.trim(),
      whatsapp: form.whatsapp.trim(),
      data_inicio: form.data_inicio || null,
      data_fim_contrato: form.data_fim_contrato || null,
      observacoes: form.observacoes.trim() || null,
      dia_envio_relatorio: parseInt(form.dia_envio_relatorio) || 5,
    }
    const { error } = editando
      ? await supabase.from('parceiros').update(payload).eq('id', editando.id)
      : await supabase.from('parceiros').insert(payload)
    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success(editando ? 'Parceiro atualizado!' : 'Parceiro cadastrado!')
      fecharDialog()
      loadParceiros()
    }
    setSalvando(false)
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"?`)) return
    const { error } = await supabase.from('parceiros').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir') } else { toast.success('Excluído'); loadParceiros() }
  }

  function abrirEdicao(p: Parceiro) {
    setEditando(p)
    setForm({
      nome_local: p.nome_local,
      nome_responsavel: p.nome_responsavel,
      whatsapp: p.whatsapp,
      data_inicio: p.data_inicio || '',
      data_fim_contrato: p.data_fim_contrato || '',
      observacoes: p.observacoes || '',
      dia_envio_relatorio: String(p.dia_envio_relatorio || 5),
    })
    setDialogOpen(true)
  }

  function fecharDialog() {
    setDialogOpen(false)
    setEditando(null)
    setForm(emptyForm)
  }

  const alertas = parceiros.filter((p) => {
    if (!p.data_fim_contrato) return false
    return differenceInDays(parseISO(p.data_fim_contrato), new Date()) <= 30
  })

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Parceiros</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {parceiros.length} local(is) parceiro(s)
            {alertas.length > 0 && ` · ${alertas.length} com contrato em alerta`}
          </p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo parceiro
        </Button>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="mb-6 space-y-2">
          {alertas.map((p) => {
            const dias = differenceInDays(parseISO(p.data_fim_contrato!), new Date())
            return (
              <div key={p.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm border ${dias < 0 ? 'bg-red-50 text-red-800 border-red-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'}`}>
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{p.nome_local}</strong> — contrato {dias < 0 ? `vencido há ${Math.abs(dias)} dia(s)` : `vence em ${dias} dia(s)`}
                  {' '}({format(parseISO(p.data_fim_contrato!), 'dd/MM/yyyy')})
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <p className="text-zinc-400 text-sm">Carregando...</p>
      ) : parceiros.length === 0 ? (
        <div className="text-center py-16">
          <Handshake className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400">Nenhum parceiro cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {parceiros.map((p) => (
            <Card key={p.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{p.nome_local}</CardTitle>
                  <StatusContrato dataFim={p.data_fim_contrato} />
                </div>
                <p className="text-sm text-zinc-500">{p.nome_responsavel}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <a
                    href={`https://wa.me/55${p.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-green-600 transition-colors"
                  >
                    {p.whatsapp}
                  </a>
                </div>
                {(p.data_inicio || p.data_fim_contrato) && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
                    {p.data_inicio && format(parseISO(p.data_inicio), 'dd/MM/yyyy')}
                    {p.data_inicio && p.data_fim_contrato && ' → '}
                    {p.data_fim_contrato && format(parseISO(p.data_fim_contrato), 'dd/MM/yyyy')}
                  </div>
                )}
                {p.observacoes && (
                  <p className="text-xs text-zinc-400 italic">{p.observacoes}</p>
                )}
                {p.dia_envio_relatorio && (
                  <p className="text-xs text-zinc-500">Relatório: dia <strong>{p.dia_envio_relatorio}</strong> de cada mês</p>
                )}
                <div className="flex gap-2 pt-2 border-t border-zinc-100">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => abrirEdicao(p)}>
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-8" onClick={() => excluir(p.id, p.nome_local)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={fecharDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar parceiro' : 'Cadastrar parceiro'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Nome do local *</Label>
              <Input placeholder="Ex: Bistrô Pai D'égua" value={form.nome_local}
                onChange={(e) => setForm({ ...form, nome_local: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nome do responsável *</Label>
                <Input placeholder="Ex: Carlos" value={form.nome_responsavel}
                  onChange={(e) => setForm({ ...form, nome_responsavel: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp *</Label>
                <Input placeholder="(47) 99999-9999" value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Início do acordo</Label>
                <Input type="date" value={form.data_inicio}
                  onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Fim do acordo</Label>
                <Input type="date" value={form.data_fim_contrato}
                  onChange={(e) => setForm({ ...form, data_fim_contrato: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Input placeholder="Ex: Exibição gratuita em troca de espaço nas telas" value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Dia do mês para enviar relatório</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={28}
                  value={form.dia_envio_relatorio}
                  onChange={(e) => setForm({ ...form, dia_envio_relatorio: e.target.value })}
                  className="w-24"
                />
                <span className="text-sm text-zinc-500">de cada mês</span>
              </div>
              <p className="text-xs text-zinc-400">Ex: 5 = lembrete todo dia 5</p>
            </div>
            <Button onClick={salvar} disabled={salvando} className="w-full bg-purple-600 hover:bg-purple-700">
              {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar parceiro'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
