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
import { Plus, Phone, CalendarDays, Pencil, Trash2, Tv, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { format, parseISO, differenceInDays } from 'date-fns'

type TvCorporativa = {
  id: string
  nome_empresa: string
  nome_responsavel: string
  whatsapp: string
  valor_mensal: number
  descricao: string | null
  data_inicio: string | null
  data_fim_contrato: string | null
  created_at: string
}

const emptyForm = {
  nome_empresa: '',
  nome_responsavel: '',
  whatsapp: '',
  valor_mensal: '',
  descricao: '',
  data_inicio: '',
  data_fim_contrato: '',
}

function StatusContrato({ dataFim }: { dataFim: string | null }) {
  if (!dataFim) return <Badge className="bg-zinc-100 text-zinc-500 hover:bg-zinc-100">Sem data</Badge>
  const dias = differenceInDays(parseISO(dataFim), new Date())
  if (dias < 0) return <Badge variant="destructive">Vencido</Badge>
  if (dias <= 30) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Vence em {dias}d</Badge>
  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
}

export default function TvCorporativaPage() {
  const [tvs, setTvs] = useState<TvCorporativa[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<TvCorporativa | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { loadTvs() }, [])

  async function loadTvs() {
    const { data } = await supabase.from('tv_corporativa').select('*').order('nome_empresa')
    if (data) setTvs(data)
    setLoading(false)
  }

  async function salvar() {
    if (!form.nome_empresa || !form.nome_responsavel || !form.whatsapp || !form.valor_mensal) {
      toast.error('Preencha empresa, responsável, WhatsApp e valor mensal')
      return
    }
    setSalvando(true)
    const payload = {
      nome_empresa: form.nome_empresa.trim(),
      nome_responsavel: form.nome_responsavel.trim(),
      whatsapp: form.whatsapp.trim(),
      valor_mensal: parseFloat(form.valor_mensal.replace(',', '.')),
      descricao: form.descricao.trim() || null,
      data_inicio: form.data_inicio || null,
      data_fim_contrato: form.data_fim_contrato || null,
    }
    const { error } = editando
      ? await supabase.from('tv_corporativa').update(payload).eq('id', editando.id)
      : await supabase.from('tv_corporativa').insert(payload)
    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success(editando ? 'Atualizado!' : 'TV Corporativa cadastrada!')
      fecharDialog()
      loadTvs()
    }
    setSalvando(false)
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"?`)) return
    const { error } = await supabase.from('tv_corporativa').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir') } else { toast.success('Excluído'); loadTvs() }
  }

  function abrirEdicao(tv: TvCorporativa) {
    setEditando(tv)
    setForm({
      nome_empresa: tv.nome_empresa,
      nome_responsavel: tv.nome_responsavel,
      whatsapp: tv.whatsapp,
      valor_mensal: String(tv.valor_mensal),
      descricao: tv.descricao || '',
      data_inicio: tv.data_inicio || '',
      data_fim_contrato: tv.data_fim_contrato || '',
    })
    setDialogOpen(true)
  }

  function fecharDialog() {
    setDialogOpen(false)
    setEditando(null)
    setForm(emptyForm)
  }

  const receitaTotal = tvs.reduce((acc, tv) => acc + tv.valor_mensal, 0)
  const alertas = tvs.filter((tv) => {
    if (!tv.data_fim_contrato) return false
    return differenceInDays(parseISO(tv.data_fim_contrato), new Date()) <= 30
  })

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">TV Corporativa</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {tvs.length} contrato(s) · receita{' '}
            <span className="text-green-600 font-medium">
              R$ {receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
            </span>
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo contrato
        </Button>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="mb-6 space-y-2">
          {alertas.map((tv) => {
            const dias = differenceInDays(parseISO(tv.data_fim_contrato!), new Date())
            return (
              <div key={tv.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm border ${dias < 0 ? 'bg-red-50 text-red-800 border-red-200' : 'bg-yellow-50 text-yellow-800 border-yellow-200'}`}>
                <CalendarDays className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{tv.nome_empresa}</strong> — contrato {dias < 0 ? `vencido há ${Math.abs(dias)} dia(s)` : `vence em ${dias} dia(s)`}
                  {' '}({format(parseISO(tv.data_fim_contrato!), 'dd/MM/yyyy')})
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <p className="text-zinc-400 text-sm">Carregando...</p>
      ) : tvs.length === 0 ? (
        <div className="text-center py-16">
          <Tv className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400">Nenhuma TV corporativa cadastrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tvs.map((tv) => (
            <Card key={tv.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{tv.nome_empresa}</CardTitle>
                  <StatusContrato dataFim={tv.data_fim_contrato} />
                </div>
                <p className="text-sm text-zinc-500">{tv.nome_responsavel}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <a
                    href={`https://wa.me/55${tv.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-green-600 transition-colors"
                  >
                    {tv.whatsapp}
                  </a>
                </div>
                {tv.descricao && (
                  <p className="text-xs text-zinc-500">{tv.descricao}</p>
                )}
                {(tv.data_inicio || tv.data_fim_contrato) && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
                    {tv.data_inicio && format(parseISO(tv.data_inicio), 'dd/MM/yyyy')}
                    {tv.data_inicio && tv.data_fim_contrato && ' → '}
                    {tv.data_fim_contrato && format(parseISO(tv.data_fim_contrato), 'dd/MM/yyyy')}
                  </div>
                )}
                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                  <p className="text-lg font-bold text-green-600">
                    R$ {tv.valor_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => abrirEdicao(tv)}>
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-8" onClick={() => excluir(tv.id, tv.nome_empresa)}>
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
            <DialogTitle>{editando ? 'Editar TV Corporativa' : 'Cadastrar TV Corporativa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Nome da empresa/local *</Label>
              <Input placeholder="Ex: SB Carnes" value={form.nome_empresa}
                onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nome do responsável *</Label>
                <Input placeholder="Ex: Wilson" value={form.nome_responsavel}
                  onChange={(e) => setForm({ ...form, nome_responsavel: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp *</Label>
                <Input placeholder="(47) 99999-9999" value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Valor mensal (R$) *</Label>
              <Input type="number" placeholder="Ex: 89,90" value={form.valor_mensal}
                onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Input placeholder="Ex: TV de preços na entrada" value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Início do contrato</Label>
                <Input type="date" value={form.data_inicio}
                  onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Fim do contrato</Label>
                <Input type="date" value={form.data_fim_contrato}
                  onChange={(e) => setForm({ ...form, data_fim_contrato: e.target.value })} />
              </div>
            </div>
            <Button onClick={salvar} disabled={salvando} className="w-full bg-blue-600 hover:bg-blue-700">
              {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
