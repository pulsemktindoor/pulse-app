'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Cliente } from '@/lib/supabase/types'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Search, Phone, Monitor, CalendarDays, Pencil, Trash2, User } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Nomes das telas — sem parênteses no relatório, com parênteses aqui para identificar
export const LOCAIS_DISPONIVEIS = [
  'Quality Body 1 (Halteres)',
  'Quality Body 2 (Saída)',
  'SB Carnes',
  "Bistrô PaiD'égua 1 (Mesas)",
  "Bistrô PaiD'égua 2 (Camarote)",
]

// Nome limpo para relatório (sem parênteses)
export function nomeTelaRelatorio(nome: string) {
  return nome.replace(/\s*\(.*?\)/g, '').trim()
}

function StatusContrato({ dataFim }: { dataFim: string | null }) {
  if (!dataFim) return null
  const dias = differenceInDays(parseISO(dataFim), new Date())
  if (dias < 0) return <Badge variant="destructive">Contrato vencido</Badge>
  if (dias <= 30) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Vence em {dias}d</Badge>
  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busca, setBusca] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    nome_empresa: '',
    nome_responsavel: '',
    whatsapp: '',
    plano: 0,
    valor_mensal: '',
    locais: [] as string[],
    data_inicio_contrato: '',
    data_fim_contrato: '',
    dia_envio_relatorio: '5',
  })

  useEffect(() => {
    loadClientes()
  }, [])

  async function loadClientes() {
    const { data, error } = await supabase.from('clientes').select('*').order('nome_empresa')
    if (error) {
      toast.error('Erro ao carregar clientes: ' + error.message)
    }
    if (data) setClientes(data)
    setLoading(false)
  }

  async function salvarCliente() {
    if (!form.nome_empresa || !form.nome_responsavel || !form.whatsapp || !form.valor_mensal) {
      toast.error('Preencha nome da empresa, responsável, WhatsApp e valor mensal')
      return
    }
    setSalvando(true)
    const { error } = await supabase.from('clientes').insert({
      nome_empresa: form.nome_empresa.trim(),
      nome_responsavel: form.nome_responsavel.trim(),
      whatsapp: form.whatsapp.trim(),
      plano: form.locais.length || 1,
      valor_mensal: parseFloat(form.valor_mensal.replace(',', '.')),
      locais: form.locais,
      data_inicio_contrato: form.data_inicio_contrato || null,
      data_fim_contrato: form.data_fim_contrato || null,
      dia_envio_relatorio: parseInt(form.dia_envio_relatorio) || 5,
    })
    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success('Cliente cadastrado!')
      setDialogOpen(false)
      setForm({
        nome_empresa: '', nome_responsavel: '', whatsapp: '', plano: 0,
        valor_mensal: '', locais: [], data_inicio_contrato: '', data_fim_contrato: '',
        dia_envio_relatorio: '5',
      })
      loadClientes()
    }
    setSalvando(false)
  }

  async function excluirCliente(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"? Isso remove também os contratos e relatórios vinculados.`)) return
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir: ' + error.message)
    } else {
      toast.success('Cliente excluído')
      loadClientes()
    }
  }

  function abrirEdicao(c: Cliente) {
    setEditando(c)
    setForm({
      nome_empresa: c.nome_empresa,
      nome_responsavel: c.nome_responsavel,
      whatsapp: c.whatsapp,
      plano: c.plano,
      valor_mensal: String(c.valor_mensal),
      locais: c.locais || [],
      data_inicio_contrato: c.data_inicio_contrato || '',
      data_fim_contrato: c.data_fim_contrato || '',
      dia_envio_relatorio: String(c.dia_envio_relatorio || 5),
    })
    setDialogOpen(true)
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvando(true)
    const { error } = await supabase.from('clientes').update({
      nome_empresa: form.nome_empresa.trim(),
      nome_responsavel: form.nome_responsavel.trim(),
      whatsapp: form.whatsapp.trim(),
      plano: form.locais.length || 1,
      valor_mensal: parseFloat(form.valor_mensal.replace(',', '.')),
      locais: form.locais,
      data_inicio_contrato: form.data_inicio_contrato || null,
      data_fim_contrato: form.data_fim_contrato || null,
      dia_envio_relatorio: parseInt(form.dia_envio_relatorio) || 5,
    }).eq('id', editando.id)
    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success('Cliente atualizado!')
      setDialogOpen(false)
      setEditando(null)
      loadClientes()
    }
    setSalvando(false)
  }

  function fecharDialog() {
    setDialogOpen(false)
    setEditando(null)
    setForm({ nome_empresa: '', nome_responsavel: '', whatsapp: '', plano: 0, valor_mensal: '', locais: [], data_inicio_contrato: '', data_fim_contrato: '', dia_envio_relatorio: '5' })
  }

  function toggleLocal(local: string) {
    setForm((prev) => ({
      ...prev,
      locais: prev.locais.includes(local)
        ? prev.locais.filter((l) => l !== local)
        : [...prev.locais, local],
    }))
  }

  const clientesFiltrados = clientes.filter((c) =>
    c.nome_empresa.toLowerCase().includes(busca.toLowerCase()) ||
    c.nome_responsavel.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Clientes</h1>
          <p className="text-zinc-500 text-sm mt-1">{clientes.length} cliente(s) cadastrado(s)</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo cliente
        </Button>
        <Dialog open={dialogOpen} onOpenChange={fecharDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar cliente' : 'Cadastrar cliente'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Dados básicos */}
              <div className="space-y-1">
                <Label>Nome da empresa *</Label>
                <Input
                  placeholder="Ex: Academia FitLife"
                  value={form.nome_empresa}
                  onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome do responsável *</Label>
                  <Input
                    placeholder="Ex: João Silva"
                    value={form.nome_responsavel}
                    onChange={(e) => setForm({ ...form, nome_responsavel: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>WhatsApp *</Label>
                  <Input
                    placeholder="(47) 99999-9999"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Valor mensal (R$) *</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={form.valor_mensal}
                  onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })}
                />
              </div>

              {/* Telas */}
              <div className="space-y-2">
                <Label>Telas do cliente</Label>
                <div className="flex flex-wrap gap-2">
                  {LOCAIS_DISPONIVEIS.map((local) => (
                    <button
                      key={local}
                      type="button"
                      onClick={() => toggleLocal(local)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.locais.includes(local)
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'border-zinc-300 text-zinc-600 hover:border-purple-400'
                      }`}
                    >
                      {local}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contrato */}
              <div className="border-t border-zinc-100 pt-4">
                <p className="text-sm font-medium text-zinc-700 mb-3">Período do contrato</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Início do anúncio</Label>
                    <Input
                      type="date"
                      value={form.data_inicio_contrato}
                      onChange={(e) => setForm({ ...form, data_inicio_contrato: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Fim do anúncio</Label>
                    <Input
                      type="date"
                      value={form.data_fim_contrato}
                      onChange={(e) => setForm({ ...form, data_fim_contrato: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Dia do relatório */}
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
                <p className="text-xs text-zinc-400">Ex: 5 = você recebe lembrete todo dia 5</p>
              </div>

              <Button
                onClick={editando ? salvarEdicao : salvarCliente}
                disabled={salvando}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar cliente'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Buscar cliente..."
          className="pl-9"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* Lista */}
      {loading ? (
        <p className="text-zinc-400 text-sm">Carregando...</p>
      ) : clientesFiltrados.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-400">Nenhum cliente encontrado.</p>
          <p className="text-zinc-300 text-sm mt-1">Clique em "Novo cliente" para cadastrar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clientesFiltrados.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{c.nome_empresa}</CardTitle>
                  <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50 shrink-0">
                    {c.plano} {c.plano === 1 ? 'tela' : 'telas'}
                  </Badge>
                </div>
                <p className="text-sm text-zinc-500">{c.nome_responsavel}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  {c.whatsapp}
                </div>
                {c.locais?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Monitor className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {c.locais.map((l) => (
                        <span key={l} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {c.data_fim_contrato && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <CalendarDays className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-xs">
                      Contrato até {format(parseISO(c.data_fim_contrato), 'dd/MM/yyyy')}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                  <p className="text-lg font-bold text-green-600">
                    R$ {c.valor_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                  </p>
                  <StatusContrato dataFim={c.data_fim_contrato} />
                </div>
                <div className="flex gap-2 pt-1">
                  <Link href={`/clientes/${c.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full text-xs h-8 text-purple-700 border-purple-200 hover:bg-purple-50">
                      <User className="w-3 h-3 mr-1" /> Ver perfil
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => abrirEdicao(c)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-8" onClick={() => excluirCliente(c.id, c.nome_empresa)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
