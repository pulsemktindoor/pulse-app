'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Contrato } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, FileText, Download, Send, CheckCircle2, Trash2, Building2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import dynamic from 'next/dynamic'
import { ContratoPDF } from '@/components/contrato-pdf'

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink),
  { ssr: false }
)

const TIPO_LABEL: Record<string, string> = {
  anuncio: 'Anúncio',
  parceria: 'Parceria',
  corporativa: 'Corporativa',
}

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

const STATUS_LABEL: Record<string, string> = {
  gerado: 'Gerado',
  enviado: 'Enviado',
  assinado: 'Assinado',
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadContratos() }, [])

  async function loadContratos() {
    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Erro ao carregar contratos')
    if (data) setContratos(data as Contrato[])
    setLoading(false)
  }

  async function atualizarStatus(id: string, status: Contrato['status']) {
    const { error } = await supabase.from('contratos').update({ status }).eq('id', id)
    if (error) {
      toast.error('Erro ao atualizar status')
    } else {
      toast.success(`Marcado como "${STATUS_LABEL[status]}"`)
      loadContratos()
    }
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir contrato de "${nome}"?`)) return
    const { error } = await supabase.from('contratos').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir')
    } else {
      toast.success('Contrato excluído')
      loadContratos()
    }
  }

  const contratosFiltrados = contratos.filter((c) =>
    c.nome_empresa.toLowerCase().includes(busca.toLowerCase())
  )

  const totalPendentes = contratos.filter((c) => c.status !== 'assinado').length

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
            <Plus className="w-4 h-4 mr-2" />
            Novo contrato
          </Button>
        </Link>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Buscar empresa..."
          className="pl-9"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
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
                  <Badge className={`shrink-0 text-xs border ${TIPO_COLOR[c.tipo]}`}>
                    {TIPO_LABEL[c.tipo]}
                  </Badge>
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
                    {format(parseISO(c.data_inicio), 'dd/MM/yyyy')} →{' '}
                    {format(parseISO(c.data_fim), 'dd/MM/yyyy')}
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
                    <p>
                      <span className="text-zinc-400">Telas: </span>
                      {c.locais_selecionados.length} selecionada(s)
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                  <Badge className={`text-xs ${STATUS_COLOR[c.status]}`}>
                    {c.status === 'assinado' && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                    {STATUS_LABEL[c.status]}
                  </Badge>
                  <div className="flex gap-1">
                    {c.status === 'gerado' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2 text-yellow-700 border-yellow-200 hover:bg-yellow-50"
                        onClick={() => atualizarStatus(c.id, 'enviado')}
                        title="Marcar como enviado"
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                    )}
                    {c.status === 'enviado' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2 text-green-700 border-green-200 hover:bg-green-50"
                        onClick={() => atualizarStatus(c.id, 'assinado')}
                        title="Marcar como assinado"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                      </Button>
                    )}
                    <PDFDownloadLink
                      document={<ContratoPDF contrato={c} />}
                      fileName={`contrato-${c.nome_empresa.replace(/\s+/g, '-').toLowerCase()}-${format(parseISO(c.data_inicio), 'yyyy-MM')}.pdf`}
                    >
                      {({ loading: pdfLoading }: { loading: boolean }) => (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2 text-blue-700 border-blue-200 hover:bg-blue-50"
                          disabled={pdfLoading}
                          title="Baixar PDF"
                        >
                          <Download className="w-3 h-3" />
                        </Button>
                      )}
                    </PDFDownloadLink>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => excluir(c.id, c.nome_empresa)}
                      title="Excluir"
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
  )
}
