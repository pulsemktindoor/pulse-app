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
import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  MapPin, Phone, Plus, Pencil, Trash2, Monitor, ArrowLeftRight, X, Building2, Tag, CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'

type Tela = {
  id: string
  nome: string
  identificacao: string | null
  ativo: boolean
}

type TelaForm = {
  nome: string
  identificacao: string
}

type Local = {
  id: string
  nome_local: string
  nome_responsavel: string | null
  whatsapp: string | null
  cnpj_cpf: string | null
  endereco: string | null
  permuta: string | null
  observacoes: string | null
  data_inicio_contrato: string | null
  data_fim_contrato: string | null
  dia_envio_relatorio: number | null
  ativo: boolean
  created_at: string
  telas: Tela[]
}

const emptyForm = {
  nome_local: '',
  nome_responsavel: '',
  whatsapp: '',
  cnpj_cpf: '',
  endereco: '',
  permuta: '',
  observacoes: '',
  data_inicio_contrato: '',
  data_fim_contrato: '',
  dia_envio_relatorio: '',
}

const emptyTela: TelaForm = { nome: '', identificacao: '' }

export default function LocaisPage() {
  const [locais, setLocais] = useState<Local[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Local | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [telasForms, setTelasForms] = useState<TelaForm[]>([{ ...emptyTela }])

  useEffect(() => { loadLocais() }, [])

  async function loadLocais() {
    const { data: locaisRaw } = await supabase
      .from('locais')
      .select('*')
      .eq('ativo', true)
      .order('nome_local')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locaisData = locaisRaw as any[] | null
    if (!locaisData) { setLoading(false); return }

    const { data: telasRaw } = await supabase
      .from('telas')
      .select('*')
      .eq('ativo', true)
      .order('created_at')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const telasData = telasRaw as any[] | null

    const locaisComTelas: Local[] = locaisData.map((l) => ({
      ...l,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      telas: telasData?.filter((t: any) => t.local_id === l.id) ?? [],
    })).sort((a, b) => {
      if (a.data_fim_contrato && b.data_fim_contrato) {
        return new Date(a.data_fim_contrato).getTime() - new Date(b.data_fim_contrato).getTime()
      }
      if (a.data_fim_contrato) return -1
      if (b.data_fim_contrato) return 1
      return a.nome_local.localeCompare(b.nome_local)
    })

    setLocais(locaisComTelas)
    setLoading(false)
  }

  function abrirNovo() {
    setEditando(null)
    setForm(emptyForm)
    setTelasForms([{ ...emptyTela }])
    setDialogOpen(true)
  }

  function abrirEdicao(local: Local) {
    setEditando(local)
    setForm({
      nome_local: local.nome_local,
      nome_responsavel: local.nome_responsavel || '',
      whatsapp: local.whatsapp || '',
      cnpj_cpf: local.cnpj_cpf || '',
      endereco: local.endereco || '',
      permuta: local.permuta || '',
      observacoes: local.observacoes || '',
      data_inicio_contrato: local.data_inicio_contrato || '',
      data_fim_contrato: local.data_fim_contrato || '',
      dia_envio_relatorio: local.dia_envio_relatorio ? String(local.dia_envio_relatorio) : '',
    })
    setTelasForms(
      local.telas.length > 0
        ? local.telas.map((t) => ({ nome: t.nome, identificacao: t.identificacao || '' }))
        : [{ ...emptyTela }]
    )
    setDialogOpen(true)
  }

  function fecharDialog() {
    setDialogOpen(false)
    setEditando(null)
    setForm(emptyForm)
    setTelasForms([{ ...emptyTela }])
  }

  function adicionarTela() {
    setTelasForms((prev) => [...prev, { ...emptyTela }])
  }

  function removerTela(idx: number) {
    setTelasForms((prev) => prev.filter((_, i) => i !== idx))
  }

  function atualizarTelaNome(idx: number, valor: string) {
    setTelasForms((prev) => prev.map((t, i) => i === idx ? { ...t, nome: valor } : t))
  }

  function atualizarTelaIdentificacao(idx: number, valor: string) {
    setTelasForms((prev) => prev.map((t, i) => i === idx ? { ...t, identificacao: valor } : t))
  }

  async function salvar() {
    if (!form.nome_local.trim()) {
      toast.error('Nome do local é obrigatório')
      return
    }
    setSalvando(true)

    const payload = {
      nome_local: form.nome_local.trim(),
      nome_responsavel: form.nome_responsavel.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      cnpj_cpf: form.cnpj_cpf.trim() || null,
      endereco: form.endereco.trim() || null,
      permuta: form.permuta.trim() || null,
      observacoes: form.observacoes.trim() || null,
      data_inicio_contrato: form.data_inicio_contrato || null,
      data_fim_contrato: form.data_fim_contrato || null,
      dia_envio_relatorio: form.dia_envio_relatorio ? parseInt(form.dia_envio_relatorio) : null,
    }

    const telasFiltradas = telasForms.filter((t) => t.nome.trim())

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any

    if (editando) {
      const { error } = await sb.from('locais').update(payload).eq('id', editando.id)
      if (error) { toast.error('Erro ao salvar: ' + error.message); setSalvando(false); return }

      await sb.from('telas').delete().eq('local_id', editando.id)
      if (telasFiltradas.length > 0) {
        await sb.from('telas').insert(
          telasFiltradas.map((t) => ({
            local_id: editando.id,
            nome: t.nome.trim(),
            identificacao: t.identificacao.trim() || null,
          }))
        )
      }
      toast.success('Local atualizado!')
    } else {
      const { data, error } = await sb.from('locais').insert(payload).select().single()
      if (error || !data) { toast.error('Erro ao salvar: ' + error?.message); setSalvando(false); return }

      if (telasFiltradas.length > 0) {
        await sb.from('telas').insert(
          telasFiltradas.map((t) => ({
            local_id: data.id,
            nome: t.nome.trim(),
            identificacao: t.identificacao.trim() || null,
          }))
        )
      }
      toast.success('Local cadastrado!')
    }

    fecharDialog()
    loadLocais()
    setSalvando(false)
  }

  async function excluir(local: Local) {
    if (!confirm(`Excluir "${local.nome_local}"? As telas deste local também serão removidas.`)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('locais').update({ ativo: false }).eq('id', local.id)
    if (error) { toast.error('Erro ao excluir') } else { toast.success('Local removido'); loadLocais() }
  }

  const totalTelas = locais.reduce((acc, l) => acc + l.telas.length, 0)

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Locais</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {locais.length} local(is) · {totalTelas} tela(s) instalada(s)
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700" onClick={abrirNovo}>
          <Plus className="w-4 h-4 mr-2" /> Novo local
        </Button>
      </div>

      {loading ? (
        <p className="text-zinc-400 text-sm">Carregando...</p>
      ) : locais.length === 0 ? (
        <div className="text-center py-16">
          <MapPin className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">Nenhum local cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {locais.map((local) => (
            <Card key={local.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{local.nome_local}</CardTitle>
                  <Badge className="bg-green-500/20 text-green-300 hover:bg-green-500/20 shrink-0">
                    {local.telas.length} tela{local.telas.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {local.nome_responsavel && (
                  <p className="text-sm text-zinc-500">{local.nome_responsavel}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-2.5">
                {local.whatsapp && (
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <a
                      href={`https://wa.me/55${local.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-green-400 transition-colors"
                    >
                      {local.whatsapp}
                    </a>
                  </div>
                )}
                {local.cnpj_cpf && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    {local.cnpj_cpf}
                  </div>
                )}
                {local.endereco && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    {local.endereco}
                  </div>
                )}

                {(local.data_inicio_contrato || local.data_fim_contrato) && (
                  <div className="flex items-start gap-2 text-xs text-zinc-500">
                    <CalendarDays className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-zinc-400">Contrato: </span>
                      {local.data_inicio_contrato && format(parseISO(local.data_inicio_contrato), 'dd/MM/yyyy')}
                      {local.data_inicio_contrato && local.data_fim_contrato && ' → '}
                      {local.data_fim_contrato && (() => {
                        const dias = differenceInDays(parseISO(local.data_fim_contrato!), new Date())
                        return (
                          <span>
                            {format(parseISO(local.data_fim_contrato!), 'dd/MM/yyyy')}
                            {' '}
                            {dias < 0
                              ? <span className="text-red-400">({Math.abs(dias)}d vencido)</span>
                              : dias <= 30
                              ? <span className="text-yellow-400">({dias}d restantes)</span>
                              : null}
                          </span>
                        )
                      })()}
                    </div>
                  </div>
                )}

{local.permuta && (
                  <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-xs text-blue-300">
                    <ArrowLeftRight className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span><strong>Permuta:</strong> {local.permuta}</span>
                  </div>
                )}

                {local.telas.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Monitor className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-1" />
                    <div className="flex flex-col gap-1 w-full">
                      {local.telas.map((t) => (
                        <div key={t.id} className="flex items-center gap-1.5">
                          <span className="text-xs bg-white/[0.07] text-zinc-400 px-2 py-0.5 rounded-full">
                            {t.nome}
                          </span>
                          {t.identificacao && (
                            <span className="flex items-center gap-0.5 text-[10px] text-zinc-400">
                              <Tag className="w-2.5 h-2.5" />
                              {t.identificacao}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {local.dia_envio_relatorio && (
                  <p className="text-xs text-zinc-500">
                    Relatório: dia <strong>{local.dia_envio_relatorio}</strong> de cada mês
                  </p>
                )}

                {local.observacoes && (
                  <p className="text-xs text-zinc-400 italic">{local.observacoes}</p>
                )}

                <div className="flex gap-2 pt-2 border-t border-white/[0.08]">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => abrirEdicao(local)}>
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-400 border-red-500/30 hover:bg-red-500/10 text-xs h-8"
                    onClick={() => excluir(local)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={fecharDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar local' : 'Cadastrar local'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Nome do local *</Label>
              <Input
                placeholder="Ex: Quality Body"
                value={form.nome_local}
                onChange={(e) => setForm({ ...form, nome_local: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Responsável / Dono</Label>
                <Input
                  placeholder="Ex: Carlos"
                  value={form.nome_responsavel}
                  onChange={(e) => setForm({ ...form, nome_responsavel: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>WhatsApp</Label>
                <Input
                  placeholder="(47) 99999-9999"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>CNPJ / CPF</Label>
                <Input
                  placeholder="00.000.000/0001-00"
                  value={form.cnpj_cpf}
                  onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Endereço</Label>
                <Input
                  placeholder="Rua, número, bairro"
                  value={form.endereco}
                  onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>O que foi oferecido em troca (permuta)</Label>
              <Input
                placeholder="Ex: Exibição da marca deles nas telas do Quality Body"
                value={form.permuta}
                onChange={(e) => setForm({ ...form, permuta: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label>Observações</Label>
              <Input
                placeholder="Informações adicionais"
                value={form.observacoes}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
              />
            </div>

            {/* Datas */}
            <div className="border-t border-white/[0.08] pt-4 space-y-3">
              <div>
                <p className="text-sm font-medium text-zinc-300 mb-1">Período do contrato</p>
                <p className="text-xs text-zinc-400 mb-2">Data em que o acordo foi fechado e até quando vale</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Início do contrato</Label>
                    <Input type="date" value={form.data_inicio_contrato}
                      onChange={(e) => setForm({ ...form, data_inicio_contrato: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Fim do contrato</Label>
                    <Input type="date" value={form.data_fim_contrato}
                      onChange={(e) => setForm({ ...form, data_fim_contrato: e.target.value })} />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-zinc-300 mb-1">Dia do relatório</p>
                <p className="text-xs text-zinc-400 mb-2">Dia do mês para lembrar de gerar o relatório</p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    placeholder="Ex: 5"
                    value={form.dia_envio_relatorio}
                    onChange={(e) => setForm({ ...form, dia_envio_relatorio: e.target.value })}
                    className="w-28"
                  />
                  <span className="text-sm text-zinc-500">de cada mês</span>
                </div>
              </div>
            </div>

            {/* Telas */}
            <div className="border-t border-white/[0.08] pt-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-zinc-300">Telas instaladas</p>
                  <p className="text-xs text-zinc-400">Nome da tela aparece nos contratos · Identificação é só pra você, não vai nos relatórios</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={adicionarTela} className="text-xs h-7 shrink-0">
                  <Plus className="w-3 h-3 mr-1" /> Tela
                </Button>
              </div>

              {/* Cabeçalho das colunas */}
              <div className="grid grid-cols-[24px_1fr_1fr_28px] gap-2 mb-1 px-1">
                <div />
                <p className="text-[11px] text-zinc-400 font-medium">Nome da tela</p>
                <p className="text-[11px] text-zinc-400 font-medium">Identificação interna</p>
                <div />
              </div>

              <div className="space-y-2">
                {telasForms.map((tela, idx) => (
                  <div key={idx} className="grid grid-cols-[24px_1fr_1fr_28px] gap-2 items-center">
                    <div className="w-6 h-6 rounded-full bg-white/[0.07] flex items-center justify-center shrink-0">
                      <span className="text-xs text-zinc-400 font-medium">{idx + 1}</span>
                    </div>
                    <Input
                      placeholder={`Ex: ${form.nome_local || 'Quality Body'} 1`}
                      value={tela.nome}
                      onChange={(e) => atualizarTelaNome(idx, e.target.value)}
                    />
                    <Input
                      placeholder="Ex: Halteres"
                      value={tela.identificacao}
                      onChange={(e) => atualizarTelaIdentificacao(idx, e.target.value)}
                      className="text-zinc-500"
                    />
                    {telasForms.length > 1 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removerTela(idx)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    ) : <div />}
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={salvar} disabled={salvando} className="w-full bg-blue-600 hover:bg-blue-700">
              {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Cadastrar local'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
