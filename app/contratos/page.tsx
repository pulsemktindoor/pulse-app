'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Contrato } from '@/lib/supabase/types'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus, Search, FileText, Download, Send, CheckCircle2,
  Trash2, Building2, Pencil, Undo2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format, parseISO, addMonths } from 'date-fns'
import dynamic from 'next/dynamic'
import { ContratoPDF } from '@/components/contrato-pdf'
import { LOCAIS_DISPONIVEIS } from '@/app/clientes/page'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
  { ssr: false }
)

const TIPO_LABEL: Record<string, string> = { anuncio: 'Anúncio', parceria: 'Parceria', corporativa: 'Corporativa' }
const TIPO_COLOR: Record<string, string> = {
  anuncio: 'bg-blue-50 text-blue-700 border-blue-200',
  parceria: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  corporativa: 'bg-purple-50 text-purple-700 border-purple-200',
}
const STATUS_COLOR: Record<string, string> = {
  gerado: 'bg-zinc-100 text-zinc-600',
  enviado: 'bg-yellow-100 text-yellow-700',
  assinado: 'bg-green-100 text-green-700',
}
const STATUS_LABEL: Record<string, string> = { gerado: 'Gerado', enviado: 'Enviado', assinado: 'Assinado' }

type EditForm = {
  tipo: string
  nome_empresa: string
  cnpj_cpf: string
  endereco: string
  numero: string
  bairro: string
  complemento: string
  cidade: string
  uf: string
  cep: string
  contato: string
  duracao_meses: string
  duracao_personalizada: string
  data_inicio: string
  valor_mensal: string
  dia_pagamento: string
  locais_selecionados: string[]
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Contrato | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    tipo: 'anuncio', nome_empresa: '', cnpj_cpf: '', endereco: '', numero: '',
    bairro: '', complemento: '', cidade: 'Blumenau', uf: 'SC', cep: '', contato: '',
    duracao_meses: '6', duracao_personalizada: '', data_inicio: '', valor_mensal: '', dia_pagamento: '',
    locais_selecionados: [],
  })

  useEffect(() => { loadContratos() }, [])

  async function loadContratos() {
    const { data, error } = await supabase.from('contratos').select('*').order('created_at', { ascending: false })
    if (error) toast.error('Erro ao carregar contratos')
    if (data) setContratos(data as Contrato[])
    setLoading(false)
  }

  async function atualizarStatus(id: string, status: Contrato['status']) {
    const { error } = await supabase.from('contratos').update({ status }).eq('id', id)
    if (error) toast.error('Erro ao atualizar status')
    else { toast.success(`Marcado como "${STATUS_LABEL[status]}"`); loadContratos() }
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir contrato de "${nome}"?`)) return
    const { error } = await supabase.from('contratos').delete().eq('id', id)
    if (error) toast.error('Erro ao excluir')
    else { toast.success('Contrato excluído'); loadContratos() }
  }

  function abrirEdicao(c: Contrato) {
    const duracaoStr = [6, 12].includes(c.duracao_meses) ? String(c.duracao_meses) : 'personalizado'
    setEditForm({
      tipo: c.tipo,
      nome_empresa: c.nome_empresa,
      cnpj_cpf: c.cnpj_cpf || '',
      endereco: c.endereco || '',
      numero: c.numero || '',
      bairro: c.bairro || '',
      complemento: c.complemento || '',
      cidade: c.cidade || 'Blumenau',
      uf: c.uf || 'SC',
      cep: c.cep || '',
      contato: c.contato || '',
      duracao_meses: duracaoStr,
      duracao_personalizada: duracaoStr === 'personalizado' ? String(c.duracao_meses) : '',
      data_inicio: c.data_inicio,
      valor_mensal: c.valor_mensal ? String(c.valor_mensal) : '',
      dia_pagamento: c.dia_pagamento ? String(c.dia_pagamento) : '',
      locais_selecionados: c.locais_selecionados || [],
    })
    setEditando(c)
  }

  function toggleLocalEdit(local: string) {
    setEditForm((prev) => ({
      ...prev,
      locais_selecionados: prev.locais_selecionados.includes(local)
        ? prev.locais_selecionados.filter((l) => l !== local)
        : [...prev.locais_selecionados, local],
    }))
  }

  async function salvarEdicao() {
    if (!editando || !editForm.nome_empresa) { toast.error('Preencha o nome da empresa'); return }
    setSalvando(true)
    const duracaoFinal = editForm.duracao_meses === 'personalizado'
      ? parseInt(editForm.duracao_personalizada || '1')
      : parseInt(editForm.duracao_meses)
    const dataFim = format(addMonths(parseISO(editForm.data_inicio), duracaoFinal), 'yyyy-MM-dd')
    const { error } = await supabase.from('contratos').update({
      tipo: editForm.tipo as Contrato['tipo'],
      nome_empresa: editForm.nome_empresa.trim(),
      cnpj_cpf: editForm.cnpj_cpf.trim() || null,
      endereco: editForm.endereco.trim() || null,
      numero: editForm.numero.trim() || null,
      bairro: editForm.bairro.trim() || null,
      complemento: editForm.complemento.trim() || null,
      cidade: editForm.cidade.trim() || null,
      uf: editForm.uf.trim() || null,
      cep: editForm.cep.trim() || null,
      contato: editForm.contato.trim() || null,
      duracao_meses: duracaoFinal,
      data_inicio: editForm.data_inicio,
      data_fim: dataFim,
      valor_mensal: editForm.valor_mensal ? parseFloat(editForm.valor_mensal.replace(',', '.')) : null,
      dia_pagamento: editForm.dia_pagamento ? parseInt(editForm.dia_pagamento) : null,
      locais_selecionados: editForm.locais_selecionados,
    }).eq('id', editando.id)
    if (error) toast.error('Erro ao salvar: ' + error.message)
    else { toast.success('Contrato atualizado!'); setEditando(null); loadContratos() }
    setSalvando(false)
  }

  const contratosFiltrados = contratos.filter((c) =>
    c.nome_empresa.toLowerCase().includes(busca.toLowerCase())
  )
  const totalPendentes = contratos.filter((c) => c.status !== 'assinado').length
  const editDataFim = editForm.data_inicio
    ? format(addMonths(parseISO(editForm.data_inicio),
        editForm.duracao_meses === 'personalizado'
          ? parseInt(editForm.duracao_personalizada || '1')
          : parseInt(editForm.duracao_meses)
      ), 'dd/MM/yyyy')
    : ''

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Contratos</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {contratos.length} contrato(s)
            {totalPendentes > 0 && ` · ${totalPendentes} pendente(s) de assinatura`}
          </p>
        </div>
        <Link href="/contratos/novo">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />Novo contrato
          </Button>
        </Link>
      </div>

      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input placeholder="Buscar empresa..." className="pl-9" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {loading ? (
        <p className="text-zinc-400 text-sm">Carregando...</p>
      ) : contratosFiltrados.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-zinc-200 mx-auto mb-3" />
          <p className="text-zinc-400">Nenhum contrato encontrado.</p>
          <p className="text-zinc-300 text-sm mt-1">Clique em "Novo contrato" para começar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {contratosFiltrados.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                    <CardTitle className="text-base leading-tight truncate">{c.nome_empresa}</CardTitle>
                  </div>
                  <Badge className={`shrink-0 text-xs border ${TIPO_COLOR[c.tipo]}`}>{TIPO_LABEL[c.tipo]}</Badge>
                </div>
                {c.numero_contrato && (
                  <p className="text-xs text-zinc-400 mt-1">
                    Nº {String(c.numero_contrato).padStart(4, '0')}/{new Date(c.created_at).getFullYear()}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-zinc-500 space-y-1">
                  <p>
                    <span className="text-zinc-400">Vigência: </span>
                    {format(parseISO(c.data_inicio), 'dd/MM/yyyy')} → {format(parseISO(c.data_fim), 'dd/MM/yyyy')}
                  </p>
                  {c.valor_mensal && (
                    <p>
                      <span className="text-zinc-400">Valor: </span>
                      <span className="font-semibold text-green-600">
                        R$ {c.valor_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                      </span>
                    </p>
                  )}
                  {c.locais_selecionados?.length > 0 && (
                    <p><span className="text-zinc-400">Telas: </span>{c.locais_selecionados.length} selecionada(s)</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                  <Badge className={`text-xs ${STATUS_COLOR[c.status]}`}>
                    {c.status === 'assinado' && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                    {STATUS_LABEL[c.status]}
                  </Badge>
                  <div className="flex gap-1">
                    {/* Avançar status */}
                    {c.status === 'gerado' && (
                      <Button size="sm" variant="outline"
                        className="text-xs h-7 px-2 text-yellow-700 border-yellow-200 hover:bg-yellow-50"
                        onClick={() => atualizarStatus(c.id, 'enviado')} title="Marcar como enviado">
                        <Send className="w-3 h-3" />
                      </Button>
                    )}
                    {c.status === 'enviado' && (
                      <Button size="sm" variant="outline"
                        className="text-xs h-7 px-2 text-green-700 border-green-200 hover:bg-green-50"
                        onClick={() => atualizarStatus(c.id, 'assinado')} title="Marcar como assinado">
                        <CheckCircle2 className="w-3 h-3" />
                      </Button>
                    )}
                    {/* Voltar status */}
                    {c.status === 'assinado' && (
                      <Button size="sm" variant="outline"
                        className="text-xs h-7 px-2 text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                        onClick={() => atualizarStatus(c.id, 'enviado')} title="Voltar para Enviado">
                        <Undo2 className="w-3 h-3" />
                      </Button>
                    )}
                    {c.status === 'enviado' && (
                      <Button size="sm" variant="outline"
                        className="text-xs h-7 px-2 text-zinc-500 border-zinc-200 hover:bg-zinc-50"
                        onClick={() => atualizarStatus(c.id, 'gerado')} title="Voltar para Gerado">
                        <Undo2 className="w-3 h-3" />
                      </Button>
                    )}
                    {/* Editar */}
                    <Button size="sm" variant="outline"
                      className="text-xs h-7 px-2"
                      onClick={() => abrirEdicao(c)} title="Editar">
                      <Pencil className="w-3 h-3" />
                    </Button>
                    {/* PDF */}
                    <PDFDownloadLink
                      document={<ContratoPDF contrato={c} logoUrl={typeof window !== 'undefined' ? window.location.origin + '/pulse-logo.png' : ''} />}
                      fileName={`contrato-${c.nome_empresa.replace(/\s+/g, '-').toLowerCase()}-${format(parseISO(c.data_inicio), 'yyyy-MM')}.pdf`}
                    >
                      {({ loading: pdfLoading }: { loading: boolean }) => (
                        <Button size="sm" variant="outline"
                          className="text-xs h-7 px-2 text-blue-700 border-blue-200 hover:bg-blue-50"
                          disabled={pdfLoading} title="Baixar PDF">
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                    </PDFDownloadLink>
                    {/* Excluir */}
                    <Button size="sm" variant="outline"
                      className="text-xs h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => excluir(c.id, c.nome_empresa)} title="Excluir">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── DIALOG DE EDIÇÃO ── */}
      <Dialog open={!!editando} onOpenChange={(open) => { if (!open) setEditando(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar contrato — {editando?.nome_empresa}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            {/* Tipo */}
            <div>
              <Label className="mb-2 block">Tipo de contrato</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['anuncio', 'parceria', 'corporativa'] as const).map((t) => (
                  <button key={t} type="button"
                    onClick={() => setEditForm({ ...editForm, tipo: t })}
                    className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${editForm.tipo === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-600'}`}>
                    {TIPO_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Dados da empresa */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-zinc-700 mb-3">Dados da empresa</p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Nome / Razão Social *</Label>
                    <Input value={editForm.nome_empresa} onChange={(e) => setEditForm({ ...editForm, nome_empresa: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>CNPJ / CPF</Label>
                    <Input value={editForm.cnpj_cpf} onChange={(e) => setEditForm({ ...editForm, cnpj_cpf: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2 space-y-1">
                    <Label>Rua / Avenida</Label>
                    <Input value={editForm.endereco} onChange={(e) => setEditForm({ ...editForm, endereco: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Número</Label>
                    <Input value={editForm.numero} onChange={(e) => setEditForm({ ...editForm, numero: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Bairro</Label>
                    <Input value={editForm.bairro} onChange={(e) => setEditForm({ ...editForm, bairro: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Complemento</Label>
                    <Input value={editForm.complemento} onChange={(e) => setEditForm({ ...editForm, complemento: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label>Cidade</Label>
                    <Input value={editForm.cidade} onChange={(e) => setEditForm({ ...editForm, cidade: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>UF</Label>
                    <Input maxLength={2} value={editForm.uf} onChange={(e) => setEditForm({ ...editForm, uf: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="space-y-1">
                    <Label>CEP</Label>
                    <Input value={editForm.cep} onChange={(e) => setEditForm({ ...editForm, cep: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Contato</Label>
                  <Input value={editForm.contato} onChange={(e) => setEditForm({ ...editForm, contato: e.target.value })} />
                </div>
              </div>
            </div>

            {/* Período */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-zinc-700 mb-3">Período</p>
              <div className="flex gap-2 mb-3">
                {[{ value: '6', label: '6 meses' }, { value: '12', label: '12 meses' }, { value: 'personalizado', label: 'Personalizado' }].map((d) => (
                  <button key={d.value} type="button"
                    onClick={() => setEditForm({ ...editForm, duracao_meses: d.value })}
                    className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${editForm.duracao_meses === d.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-zinc-200 text-zinc-600'}`}>
                    {d.label}
                  </button>
                ))}
              </div>
              {editForm.duracao_meses === 'personalizado' && (
                <div className="flex items-center gap-2 mb-3">
                  <Input type="number" min={1} className="w-24"
                    value={editForm.duracao_personalizada}
                    onChange={(e) => setEditForm({ ...editForm, duracao_personalizada: e.target.value })} />
                  <span className="text-sm text-zinc-500">meses</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Data de início</Label>
                  <Input type="date" value={editForm.data_inicio} onChange={(e) => setEditForm({ ...editForm, data_inicio: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Término (calculado)</Label>
                  <Input value={editDataFim} disabled className="bg-zinc-50 text-zinc-500" />
                </div>
              </div>
            </div>

            {/* Valor */}
            {editForm.tipo !== 'parceria' && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-zinc-700 mb-3">Investimento</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Valor mensal (R$)</Label>
                    <Input type="number" value={editForm.valor_mensal} onChange={(e) => setEditForm({ ...editForm, valor_mensal: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Dia de vencimento</Label>
                    <Input type="number" min={1} max={28} value={editForm.dia_pagamento} onChange={(e) => setEditForm({ ...editForm, dia_pagamento: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* Telas */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-zinc-700 mb-3">Telas do contrato</p>
              <div className="flex flex-wrap gap-2">
                {LOCAIS_DISPONIVEIS.map((local) => (
                  <button key={local} type="button" onClick={() => toggleLocalEdit(local)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      editForm.locais_selecionados.includes(local)
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-zinc-300 text-zinc-600 hover:border-blue-400'
                    }`}>
                    {local}
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={salvarEdicao} disabled={salvando} className="w-full bg-blue-600 hover:bg-blue-700">
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
