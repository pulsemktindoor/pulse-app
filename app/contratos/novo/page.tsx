'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Cliente, Contrato } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, ArrowRight, Check, Download, FileText, Monitor, CalendarDays, DollarSign } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { format, addMonths, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import dynamic from 'next/dynamic'
import { ContratoPDF } from '@/components/contrato-pdf'
import { LOCAIS_DISPONIVEIS } from '@/app/clientes/page'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
  { ssr: false }
)

type Tipo = 'anuncio' | 'parceria' | 'corporativa'

interface FormState {
  tipo: Tipo
  cliente_id: string
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

const emptyForm: FormState = {
  tipo: 'anuncio',
  cliente_id: '',
  nome_empresa: '',
  cnpj_cpf: '',
  endereco: '',
  numero: '',
  bairro: '',
  complemento: '',
  cidade: 'Blumenau',
  uf: 'SC',
  cep: '',
  contato: '',
  duracao_meses: '6',
  duracao_personalizada: '',
  data_inicio: format(new Date(), 'yyyy-MM-dd'),
  valor_mensal: '',
  dia_pagamento: '10',
  locais_selecionados: [],
}

export default function NovoContratoPage() {
  const router = useRouter()
  const [etapa, setEtapa] = useState(1)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [salvando, setSalvando] = useState(false)
  const [contratoSalvo, setContratoSalvo] = useState<Contrato | null>(null)

  useEffect(() => {
    supabase.from('clientes').select('*').order('nome_empresa').then(({ data }) => {
      if (data) setClientes(data)
    })
  }, [])

  function preencherDoCliente(clienteId: string) {
    const c = clientes.find((x) => x.id === clienteId)
    if (!c) return
    setForm((prev) => ({
      ...prev,
      cliente_id: clienteId,
      nome_empresa: c.nome_empresa,
      cnpj_cpf: c.cnpj_cpf || '',
      endereco: c.endereco || '',
      numero: c.numero || '',
      bairro: c.bairro || '',
      complemento: c.complemento || '',
      cidade: c.cidade || 'Blumenau',
      uf: c.uf || 'SC',
      cep: c.cep || '',
      contato: c.whatsapp || '',
      valor_mensal: c.valor_mensal ? String(c.valor_mensal) : '',
      locais_selecionados: c.locais || [],
    }))
  }

  function toggleLocal(local: string) {
    setForm((prev) => ({
      ...prev,
      locais_selecionados: prev.locais_selecionados.includes(local)
        ? prev.locais_selecionados.filter((l) => l !== local)
        : [...prev.locais_selecionados, local],
    }))
  }

  const duracaoFinal = form.duracao_meses === 'personalizado'
    ? parseInt(form.duracao_personalizada || '1')
    : parseInt(form.duracao_meses)

  const dataFim = form.data_inicio
    ? format(addMonths(parseISO(form.data_inicio), duracaoFinal || 1), 'yyyy-MM-dd')
    : ''

  const contratoPreview: Contrato = {
    id: 'preview',
    numero_contrato: 0,
    tipo: form.tipo,
    cliente_id: form.cliente_id || null,
    parceiro_id: null,
    nome_empresa: form.nome_empresa,
    cnpj_cpf: form.cnpj_cpf || null,
    endereco: form.endereco || null,
    numero: form.numero || null,
    bairro: form.bairro || null,
    complemento: form.complemento || null,
    cidade: form.cidade || null,
    uf: form.uf || null,
    cep: form.cep || null,
    contato: form.contato || null,
    locais_selecionados: form.locais_selecionados,
    duracao_meses: duracaoFinal,
    data_inicio: form.data_inicio,
    data_fim: dataFim,
    valor_mensal: form.valor_mensal ? parseFloat(form.valor_mensal.replace(',', '.')) : null,
    dia_pagamento: form.dia_pagamento ? parseInt(form.dia_pagamento) : null,
    horario_semana_inicio: null,
    horario_semana_fim: null,
    horario_fds_inicio: null,
    horario_fds_fim: null,
    dias_semana: [],
    status: 'gerado',
    created_at: new Date().toISOString(),
  }

  async function salvar() {
    if (!form.nome_empresa) {
      toast.error('Preencha o nome da empresa')
      return
    }
    if (form.duracao_meses === 'personalizado' && !form.duracao_personalizada) {
      toast.error('Informe a duração em meses')
      return
    }
    setSalvando(true)
    const payload = {
      tipo: form.tipo,
      cliente_id: form.cliente_id || null,
      nome_empresa: form.nome_empresa.trim(),
      cnpj_cpf: form.cnpj_cpf.trim() || null,
      endereco: form.endereco.trim() || null,
      numero: form.numero.trim() || null,
      bairro: form.bairro.trim() || null,
      complemento: form.complemento.trim() || null,
      cidade: form.cidade.trim() || null,
      uf: form.uf.trim() || null,
      cep: form.cep.trim() || null,
      contato: form.contato.trim() || null,
      duracao_meses: duracaoFinal,
      data_inicio: form.data_inicio,
      data_fim: dataFim,
      valor_mensal: form.valor_mensal ? parseFloat(form.valor_mensal.replace(',', '.')) : null,
      dia_pagamento: form.dia_pagamento ? parseInt(form.dia_pagamento) : null,
      locais_selecionados: form.locais_selecionados,
      dias_semana: [],
      horario_semana_inicio: null,
      horario_semana_fim: null,
      horario_fds_inicio: null,
      horario_fds_fim: null,
      status: 'gerado' as const,
    }
    const { data, error } = await supabase.from('contratos').insert(payload).select().single()
    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
      setSalvando(false)
      return
    }
    setContratoSalvo(data as Contrato)
    setEtapa(3)
    setSalvando(false)
  }

  const isParceria = form.tipo === 'parceria'
  const showValor = form.tipo !== 'parceria'

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => etapa > 1 && etapa < 3 ? setEtapa(etapa - 1) : router.push('/contratos')}
          className="p-2 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-zinc-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Novo Contrato</h1>
          <p className="text-zinc-500 text-sm">
            {etapa === 1 && 'Etapa 1 — Empresa e tipo'}
            {etapa === 2 && 'Etapa 2 — Detalhes do contrato'}
            {etapa === 3 && 'Contrato gerado!'}
          </p>
        </div>
      </div>

      {/* Stepper */}
      {etapa < 3 && (
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                n < etapa ? 'bg-green-500 text-white' :
                n === etapa ? 'bg-blue-600 text-white' :
                'bg-zinc-100 text-zinc-400'
              }`}>
                {n < etapa ? <Check className="w-4 h-4" /> : n}
              </div>
              <span className={`text-sm ${n === etapa ? 'text-zinc-900 font-medium' : 'text-zinc-400'}`}>
                {n === 1 ? 'Empresa' : 'Contrato'}
              </span>
              {n < 2 && <div className="w-12 h-px bg-zinc-200 mx-1" />}
            </div>
          ))}
        </div>
      )}

      {/* ETAPA 1 — Empresa */}
      {etapa === 1 && (
        <div className="space-y-6">
          {/* Tipo de contrato */}
          <div>
            <Label className="mb-2 block">Tipo de contrato</Label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: 'anuncio', label: 'Anúncio', desc: 'Cliente paga mensalmente', color: 'border-blue-500 bg-blue-50' },
                { value: 'parceria', label: 'Parceria', desc: 'Troca de espaço (permuta)', color: 'border-emerald-500 bg-emerald-50' },
                { value: 'corporativa', label: 'Corporativa', desc: 'Tela corporativa + marketing', color: 'border-purple-500 bg-purple-50' },
              ] as const).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, tipo: t.value })}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    form.tipo === t.value ? t.color : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <p className="font-semibold text-sm text-zinc-900">{t.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Buscar cliente */}
          <div>
            <Label className="mb-2 block">Puxar dados de um cliente cadastrado (opcional)</Label>
            <Select onValueChange={(v) => v && preencherDoCliente(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione para preencher automaticamente..." />
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

          <div className="border-t border-zinc-100 pt-4">
            <p className="text-sm font-medium text-zinc-700 mb-4">
              Dados {isParceria ? 'da Contratada' : form.tipo === 'corporativa' ? 'do Contratado' : 'do Anunciante'}
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome / Razão Social *</Label>
                  <Input
                    placeholder="Ex: Academia FitLife"
                    value={form.nome_empresa}
                    onChange={(e) => setForm({ ...form, nome_empresa: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>CNPJ / CPF</Label>
                  <Input
                    placeholder="00.000.000/0001-00"
                    value={form.cnpj_cpf}
                    onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Rua / Avenida</Label>
                  <Input
                    placeholder="R. das Flores"
                    value={form.endereco}
                    onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Número</Label>
                  <Input
                    placeholder="100"
                    value={form.numero}
                    onChange={(e) => setForm({ ...form, numero: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Bairro</Label>
                  <Input
                    placeholder="Centro"
                    value={form.bairro}
                    onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Complemento</Label>
                  <Input
                    placeholder="Sala 2"
                    value={form.complemento}
                    onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Cidade</Label>
                  <Input
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>UF</Label>
                  <Input
                    maxLength={2}
                    value={form.uf}
                    onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>CEP</Label>
                  <Input
                    placeholder="89000-000"
                    value={form.cep}
                    onChange={(e) => setForm({ ...form, cep: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Contato (WhatsApp)</Label>
                <Input
                  placeholder="(47) 99999-9999"
                  value={form.contato}
                  onChange={(e) => setForm({ ...form, contato: e.target.value })}
                />
              </div>
            </div>
          </div>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              if (!form.nome_empresa) { toast.error('Preencha o nome da empresa'); return }
              setEtapa(2)
            }}
          >
            Próximo — Detalhes do contrato
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {/* ETAPA 2 — Detalhes */}
      {etapa === 2 && (
        <div className="space-y-6">
          {/* Duração */}
          <div>
            <p className="text-sm font-medium text-zinc-700 mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              Período do contrato
            </p>
            <div className="flex gap-3 mb-3">
              {[
                { value: '6', label: '6 meses' },
                { value: '12', label: '12 meses' },
                { value: 'personalizado', label: 'Personalizado' },
              ].map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setForm({ ...form, duracao_meses: d.value })}
                  className={`py-2.5 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    form.duracao_meses === d.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {form.duracao_meses === 'personalizado' && (
              <div className="flex items-center gap-3 mb-3">
                <Input
                  type="number"
                  min={1}
                  placeholder="Ex: 3"
                  value={form.duracao_personalizada}
                  onChange={(e) => setForm({ ...form, duracao_personalizada: e.target.value })}
                  className="w-32"
                />
                <span className="text-sm text-zinc-500">meses</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data de início</Label>
                <Input
                  type="date"
                  value={form.data_inicio}
                  onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Data de término (calculada)</Label>
                <Input
                  type="date"
                  value={dataFim}
                  disabled
                  className="bg-zinc-50 text-zinc-500"
                />
              </div>
            </div>
          </div>

          {/* Valor */}
          {showValor && (
            <div>
              <p className="text-sm font-medium text-zinc-700 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                Investimento
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Valor mensal (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={form.valor_mensal}
                    onChange={(e) => setForm({ ...form, valor_mensal: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Dia de vencimento</Label>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={form.dia_pagamento}
                    onChange={(e) => setForm({ ...form, dia_pagamento: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Telas */}
          <div>
            <p className="text-sm font-medium text-zinc-700 mb-3 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-600" />
              Telas do contrato
            </p>
            <div className="flex flex-wrap gap-2">
              {LOCAIS_DISPONIVEIS.map((local) => (
                <button
                  key={local}
                  type="button"
                  onClick={() => toggleLocal(local)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    form.locais_selecionados.includes(local)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-zinc-300 text-zinc-600 hover:border-blue-400'
                  }`}
                >
                  {local}
                </button>
              ))}
            </div>
          </div>

          {/* Preview resumo */}
          <Card className="border-blue-100 bg-blue-50/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="space-y-1 text-sm text-zinc-700">
                  <p><span className="font-semibold">{form.nome_empresa}</span></p>
                  <p className="text-xs text-zinc-500">
                    {form.tipo === 'anuncio' ? 'Anúncio' : form.tipo === 'parceria' ? 'Parceria' : 'Corporativa'} ·{' '}
                    {duracaoFinal} meses ·{' '}
                    {form.data_inicio && format(parseISO(form.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                    {dataFim && ` → ${format(parseISO(dataFim), 'dd/MM/yyyy', { locale: ptBR })}`}
                  </p>
                  {form.valor_mensal && (
                    <p className="text-xs font-semibold text-green-600">
                      R$ {parseFloat(form.valor_mensal.replace(',', '.')).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                    </p>
                  )}
                  {form.locais_selecionados.length > 0 && (
                    <p className="text-xs text-zinc-500">{form.locais_selecionados.length} tela(s) selecionada(s)</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={salvar}
            disabled={salvando}
          >
            {salvando ? 'Gerando...' : 'Gerar contrato'}
            {!salvando && <Check className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      )}

      {/* ETAPA 3 — Sucesso */}
      {etapa === 3 && contratoSalvo && (
        <div className="space-y-6">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mb-1">Contrato gerado!</h2>
            <p className="text-zinc-500 text-sm">
              Contrato de <strong>{contratoSalvo.nome_empresa}</strong> criado com sucesso.
            </p>
          </div>

          <Card className="border-zinc-200">
            <CardContent className="pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Tipo</span>
                <span className="font-medium">
                  {contratoSalvo.tipo === 'anuncio' ? 'Anúncio' : contratoSalvo.tipo === 'parceria' ? 'Parceria' : 'Corporativa'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Vigência</span>
                <span className="font-medium text-zinc-900">
                  {format(parseISO(contratoSalvo.data_inicio), 'dd/MM/yyyy')} →{' '}
                  {format(parseISO(contratoSalvo.data_fim), 'dd/MM/yyyy')}
                </span>
              </div>
              {contratoSalvo.valor_mensal && (
                <div className="flex justify-between">
                  <span className="text-zinc-500">Valor mensal</span>
                  <span className="font-bold text-green-600">
                    R$ {contratoSalvo.valor_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <PDFDownloadLink
            document={<ContratoPDF contrato={contratoSalvo} logoUrl={typeof window !== 'undefined' ? window.location.origin + '/pulse-logo.png' : ''} />}
            fileName={`contrato-${contratoSalvo.nome_empresa.replace(/\s+/g, '-').toLowerCase()}-${format(parseISO(contratoSalvo.data_inicio), 'yyyy-MM')}.pdf`}
          >
            {({ loading: pdfLoading }: { loading: boolean }) => (
              <Button className="w-full bg-blue-600 hover:bg-blue-700" disabled={pdfLoading}>
                <Download className="w-4 h-4 mr-2" />
                {pdfLoading ? 'Preparando PDF...' : 'Baixar PDF do contrato'}
              </Button>
            )}
          </PDFDownloadLink>

          <Button variant="outline" className="w-full" onClick={() => router.push('/contratos')}>
            Ver todos os contratos
          </Button>
        </div>
      )}
    </div>
  )
}
