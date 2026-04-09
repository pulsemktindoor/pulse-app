'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Cliente, Contrato } from '@/lib/supabase/types'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, CalendarDays } from 'lucide-react'
import { format, addMonths, differenceInDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

type ContratoComCliente = Contrato & { clientes: { nome_empresa: string; nome_responsavel: string } | null }

function StatusBadge({ dataFim }: { dataFim: string }) {
  const dias = differenceInDays(parseISO(dataFim), new Date())
  if (dias < 0) return <Badge variant="destructive">Vencido</Badge>
  if (dias <= 30) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Vence em {dias}d</Badge>
  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState<ContratoComCliente[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [form, setForm] = useState({
    cliente_id: '',
    data_inicio: format(new Date(), 'yyyy-MM-dd'),
    duracao_meses: '6',
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: contratosData }, { data: clientesData }] = await Promise.all([
      supabase.from('contratos').select('*, clientes(nome_empresa, nome_responsavel)').order('data_fim'),
      supabase.from('clientes').select('*').order('nome_empresa'),
    ])
    if (contratosData) setContratos(contratosData as ContratoComCliente[])
    if (clientesData) setClientes(clientesData)
    setLoading(false)
  }

  async function salvarContrato() {
    if (!form.cliente_id) {
      toast.error('Selecione o cliente')
      return
    }
    setSalvando(true)
    const dataInicio = parseISO(form.data_inicio)
    const dataFim = format(addMonths(dataInicio, parseInt(form.duracao_meses)), 'yyyy-MM-dd')

    const { error } = await supabase.from('contratos').insert({
      cliente_id: form.cliente_id,
      data_inicio: form.data_inicio,
      duracao_meses: parseInt(form.duracao_meses),
      data_fim: dataFim,
      status: 'ativo',
    })

    if (error) {
      toast.error('Erro ao salvar contrato')
    } else {
      toast.success('Contrato cadastrado!')
      setDialogOpen(false)
      setForm({ cliente_id: '', data_inicio: format(new Date(), 'yyyy-MM-dd'), duracao_meses: '6' })
      loadData()
    }
    setSalvando(false)
  }

  const dataFimPreview = form.data_inicio
    ? format(addMonths(parseISO(form.data_inicio), parseInt(form.duracao_meses || '6')), "dd/MM/yyyy")
    : ''

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Contratos</h1>
          <p className="text-zinc-500 text-sm mt-1">{contratos.length} contrato(s) registrado(s)</p>
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo contrato
        </Button>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar contrato</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Cliente *</Label>
                <Select onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome_empresa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Data de início *</Label>
                <Input
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label>Duração</Label>
                <Select value={form.duracao_meses} onValueChange={(v) => setForm({ ...form, duracao_meses: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2">2 meses</SelectItem>
                    <SelectItem value="6">6 meses (semestral)</SelectItem>
                    <SelectItem value="12">12 meses (anual)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {dataFimPreview && (
                <div className="flex items-center gap-2 text-sm text-zinc-600 bg-zinc-50 rounded-lg px-3 py-2">
                  <CalendarDays className="w-4 h-4 text-zinc-400" />
                  Vencimento: <strong>{dataFimPreview}</strong>
                </div>
              )}

              <Button onClick={salvarContrato} disabled={salvando} className="w-full bg-purple-600 hover:bg-purple-700">
                {salvando ? 'Salvando...' : 'Cadastrar contrato'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-zinc-400 text-sm">Carregando...</p>
      ) : contratos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-400">Nenhum contrato cadastrado.</p>
          <p className="text-zinc-300 text-sm mt-1">Cadastre um cliente primeiro, depois adicione o contrato.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contratos.map((c) => {
            const dias = differenceInDays(parseISO(c.data_fim), new Date())
            return (
              <Card key={c.id} className={dias < 0 ? 'border-red-200' : dias <= 30 ? 'border-yellow-200' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-zinc-900">{c.clientes?.nome_empresa}</p>
                      <p className="text-sm text-zinc-500">{c.clientes?.nome_responsavel}</p>
                    </div>
                    <StatusBadge dataFim={c.data_fim} />
                  </div>
                  <div className="mt-3 flex gap-6 text-sm text-zinc-600">
                    <div>
                      <p className="text-xs text-zinc-400">Início</p>
                      <p>{format(parseISO(c.data_inicio), 'dd/MM/yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Vencimento</p>
                      <p>{format(parseISO(c.data_fim), 'dd/MM/yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-400">Duração</p>
                      <p>{c.duracao_meses} meses</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
