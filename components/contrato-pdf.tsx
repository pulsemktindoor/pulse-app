'use client'

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import { Contrato } from '@/lib/supabase/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Registra fonte padrão (Helvetica não precisa registrar)
const PULSE_BLUE = '#2563eb'
const PULSE_DARK = '#1e3a8a'
const PULSE_LIGHT = '#eff6ff'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1a1a2e',
    paddingTop: 0,
    paddingBottom: 40,
    paddingHorizontal: 0,
  },
  // Header com gradiente simulado via camadas
  header: {
    backgroundColor: PULSE_BLUE,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerLeft: {},
  headerBrand: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  headerSub: {
    fontSize: 8,
    color: '#bfdbfe',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerTipoLabel: {
    fontSize: 7,
    color: '#bfdbfe',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerTipo: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    marginTop: 2,
  },
  headerNumero: {
    fontSize: 8,
    color: '#93c5fd',
    marginTop: 3,
  },
  // Barra azul escuro
  subHeader: {
    backgroundColor: PULSE_DARK,
    paddingHorizontal: 40,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subHeaderText: {
    fontSize: 7.5,
    color: '#93c5fd',
  },
  subHeaderValue: {
    fontSize: 7.5,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
  },
  // Conteúdo
  body: {
    paddingHorizontal: 40,
    paddingTop: 24,
  },
  // Seções de dados
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: PULSE_BLUE,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
  },
  // Card de dados em 2 colunas
  dadosGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 0,
  },
  dadosCard: {
    flex: 1,
    backgroundColor: PULSE_LIGHT,
    borderRadius: 6,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: PULSE_BLUE,
  },
  dadosCardTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: PULSE_DARK,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  dadosRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dadosLabel: {
    fontSize: 7.5,
    color: '#6b7280',
    width: 70,
    flexShrink: 0,
  },
  dadosValue: {
    fontSize: 7.5,
    color: '#111827',
    fontFamily: 'Helvetica-Bold',
    flex: 1,
  },
  dadosValueLight: {
    fontSize: 7.5,
    color: '#374151',
    flex: 1,
  },
  // Cláusulas
  clausula: {
    marginBottom: 12,
  },
  clausulaTitulo: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: PULSE_DARK,
    marginBottom: 5,
  },
  clausulaTexto: {
    fontSize: 8,
    color: '#374151',
    lineHeight: 1.5,
  },
  clausulaTextoDestaque: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  // Tabela de horários
  tabelaHorarios: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 4,
    overflow: 'hidden',
  },
  tabelaHeader: {
    flexDirection: 'row',
    backgroundColor: PULSE_BLUE,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  tabelaHeaderText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  tabelaRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
  },
  tabelaCell: {
    fontSize: 7.5,
    color: '#374151',
    flex: 1,
    textAlign: 'center',
  },
  // Telas/locais
  telasWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  telaChip: {
    backgroundColor: PULSE_BLUE,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  telaChipText: {
    fontSize: 7.5,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
  },
  // Valor destaque
  valorBox: {
    backgroundColor: PULSE_DARK,
    borderRadius: 6,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  valorLabel: {
    fontSize: 8,
    color: '#93c5fd',
  },
  valorTexto: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  valorSub: {
    fontSize: 7,
    color: '#bfdbfe',
    marginTop: 2,
  },
  // Assinaturas
  assinaturas: {
    flexDirection: 'row',
    gap: 30,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  assinaturaBox: {
    flex: 1,
    alignItems: 'center',
  },
  assinaturaLinha: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    width: '100%',
    marginBottom: 5,
  },
  assinaturaLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#374151',
    textAlign: 'center',
  },
  assinaturaDoc: {
    fontSize: 7,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 6.5,
    color: '#9ca3af',
  },
  footerBrand: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: PULSE_BLUE,
  },
  // Data local
  dataLocal: {
    fontSize: 8,
    color: '#374151',
    marginBottom: 20,
  },
  // Separador
  divider: {
    borderTopWidth: 1,
    borderTopColor: '#dbeafe',
    marginVertical: 14,
  },
})

function formatarData(data: string) {
  return format(parseISO(data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function labelTipo(tipo: string) {
  if (tipo === 'anuncio') return 'Contrato de Publicidade Mídia Indoor'
  if (tipo === 'parceria') return 'Contrato de Parceria / Permuta'
  return 'Contrato TV Corporativa + Marketing'
}

function labelDuracao(meses: number) {
  if (meses === 2) return '2 meses'
  if (meses === 6) return '6 meses (Semestral)'
  if (meses === 12) return '12 meses (Anual)'
  return `${meses} meses`
}

const DIAS_SEMANA_LABELS: Record<string, string> = {
  domingo: 'Domingo',
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
}

interface ContratoPDFProps {
  contrato: Contrato
}

export function ContratoPDF({ contrato }: ContratoPDFProps) {
  const isParceria = contrato.tipo === 'parceria'

  const enderecoAnunciante = [
    contrato.endereco,
    contrato.numero ? `nº ${contrato.numero}` : null,
    contrato.bairro,
    contrato.complemento,
  ].filter(Boolean).join(', ')

  const cidadeAnunciante = [contrato.cidade, contrato.uf].filter(Boolean).join(' - ')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerBrand}>PULSE</Text>
            <Text style={styles.headerSub}>MARKETING INDOOR</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerTipoLabel}>Documento</Text>
            <Text style={styles.headerTipo}>{labelTipo(contrato.tipo)}</Text>
            {contrato.numero_contrato && (
              <Text style={styles.headerNumero}>Nº {String(contrato.numero_contrato).padStart(4, '0')}/{new Date(contrato.created_at).getFullYear()}</Text>
            )}
          </View>
        </View>

        {/* SUB-HEADER */}
        <View style={styles.subHeader}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Text style={styles.subHeaderText}>Vigência: </Text>
            <Text style={styles.subHeaderValue}>{formatarData(contrato.data_inicio)} → {formatarData(contrato.data_fim)}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Text style={styles.subHeaderText}>Duração: </Text>
            <Text style={styles.subHeaderValue}>{labelDuracao(contrato.duracao_meses)}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <Text style={styles.subHeaderText}>CNPJ Pulse: </Text>
            <Text style={styles.subHeaderValue}>50.982.835/0001-62</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* DADOS DAS PARTES */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Identificação das Partes</Text>
            <View style={styles.dadosGrid}>
              {/* Pulse */}
              <View style={styles.dadosCard}>
                <Text style={styles.dadosCardTitle}>
                  {isParceria ? 'Contratante' : 'Contratante (Pulse)'}
                </Text>
                <View style={styles.dadosRow}>
                  <Text style={styles.dadosLabel}>Razão Social</Text>
                  <Text style={styles.dadosValue}>PULSE MARKETING INDOOR</Text>
                </View>
                <View style={styles.dadosRow}>
                  <Text style={styles.dadosLabel}>CNPJ</Text>
                  <Text style={styles.dadosValueLight}>50.982.835/0001-62</Text>
                </View>
                <View style={styles.dadosRow}>
                  <Text style={styles.dadosLabel}>Endereço</Text>
                  <Text style={styles.dadosValueLight}>R. General Osório, nº 3139</Text>
                </View>
                <View style={styles.dadosRow}>
                  <Text style={styles.dadosLabel}>Bairro</Text>
                  <Text style={styles.dadosValueLight}>Água Verde — Blumenau/SC</Text>
                </View>
                <View style={styles.dadosRow}>
                  <Text style={styles.dadosLabel}>CEP</Text>
                  <Text style={styles.dadosValueLight}>89042-001</Text>
                </View>
                <View style={styles.dadosRow}>
                  <Text style={styles.dadosLabel}>Email</Text>
                  <Text style={styles.dadosValueLight}>pulsemktindoor@gmail.com</Text>
                </View>
                <View style={styles.dadosRow}>
                  <Text style={styles.dadosLabel}>Contato</Text>
                  <Text style={styles.dadosValueLight}>(47) 98469-9904</Text>
                </View>
              </View>
              {/* Anunciante */}
              <View style={styles.dadosCard}>
                <Text style={styles.dadosCardTitle}>
                  {isParceria ? 'Contratada' : 'Anunciante'}
                </Text>
                <View style={styles.dadosRow}>
                  <Text style={styles.dadosLabel}>Razão Social</Text>
                  <Text style={styles.dadosValue}>{contrato.nome_empresa || '—'}</Text>
                </View>
                {contrato.cnpj_cpf && (
                  <View style={styles.dadosRow}>
                    <Text style={styles.dadosLabel}>CNPJ / CPF</Text>
                    <Text style={styles.dadosValueLight}>{contrato.cnpj_cpf}</Text>
                  </View>
                )}
                {enderecoAnunciante && (
                  <View style={styles.dadosRow}>
                    <Text style={styles.dadosLabel}>Endereço</Text>
                    <Text style={styles.dadosValueLight}>{enderecoAnunciante}</Text>
                  </View>
                )}
                {cidadeAnunciante && (
                  <View style={styles.dadosRow}>
                    <Text style={styles.dadosLabel}>Cidade/UF</Text>
                    <Text style={styles.dadosValueLight}>{cidadeAnunciante}</Text>
                  </View>
                )}
                {contrato.cep && (
                  <View style={styles.dadosRow}>
                    <Text style={styles.dadosLabel}>CEP</Text>
                    <Text style={styles.dadosValueLight}>{contrato.cep}</Text>
                  </View>
                )}
                {contrato.contato && (
                  <View style={styles.dadosRow}>
                    <Text style={styles.dadosLabel}>Contato</Text>
                    <Text style={styles.dadosValueLight}>{contrato.contato}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* OBJETO */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Cláusula Primeira — Do Objeto</Text>
            <View style={styles.clausula}>
              {contrato.tipo === 'anuncio' && (
                <Text style={styles.clausulaTexto}>
                  O presente contrato tem por objeto a exibição do comercial da empresa{' '}
                  <Text style={styles.clausulaTextoDestaque}>{contrato.nome_empresa}</Text>
                  {' '}nos monitores de mídia indoor da{' '}
                  <Text style={styles.clausulaTextoDestaque}>PULSE MARKETING INDOOR</Text>
                  {', localizados nas telas selecionadas abaixo, pelo período de '}
                  <Text style={styles.clausulaTextoDestaque}>{labelDuracao(contrato.duracao_meses)}</Text>
                  {', com início em '}
                  <Text style={styles.clausulaTextoDestaque}>{formatarData(contrato.data_inicio)}</Text>
                  {' e encerramento em '}
                  <Text style={styles.clausulaTextoDestaque}>{formatarData(contrato.data_fim)}</Text>
                  {'.'}
                </Text>
              )}
              {contrato.tipo === 'parceria' && (
                <Text style={styles.clausulaTexto}>
                  O objeto do presente Contrato é a parceria entre a{' '}
                  <Text style={styles.clausulaTextoDestaque}>PULSE MARKETING INDOOR</Text>
                  {' e '}
                  <Text style={styles.clausulaTextoDestaque}>{contrato.nome_empresa}</Text>
                  {', referente à publicidade no estabelecimento da CONTRATADA para com seu público cliente, através da instalação de tela(s) e programação oferecidas pela PULSE MARKETING INDOOR, pelo prazo de '}
                  <Text style={styles.clausulaTextoDestaque}>{labelDuracao(contrato.duracao_meses)}</Text>
                  {', com início em '}
                  <Text style={styles.clausulaTextoDestaque}>{formatarData(contrato.data_inicio)}</Text>
                  {'.'}
                </Text>
              )}
              {contrato.tipo === 'corporativa' && (
                <Text style={styles.clausulaTexto}>
                  O presente contrato tem por objeto a instalação e gestão de TV Corporativa no estabelecimento da empresa{' '}
                  <Text style={styles.clausulaTextoDestaque}>{contrato.nome_empresa}</Text>
                  {', com programação e conteúdo gerenciados pela '}
                  <Text style={styles.clausulaTextoDestaque}>PULSE MARKETING INDOOR</Text>
                  {', pelo período de '}
                  <Text style={styles.clausulaTextoDestaque}>{labelDuracao(contrato.duracao_meses)}</Text>
                  {', com início em '}
                  <Text style={styles.clausulaTextoDestaque}>{formatarData(contrato.data_inicio)}</Text>
                  {'.'}
                </Text>
              )}
            </View>
          </View>

          {/* TELAS E HORÁRIOS */}
          {(contrato.locais_selecionados?.length > 0 || contrato.horario_semana_inicio) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Cláusula Segunda — Do Prazo e Veiculação</Text>

              {contrato.locais_selecionados?.length > 0 && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={[styles.clausulaTexto, { marginBottom: 4 }]}>
                    As campanhas serão veiculadas nas seguintes telas estrategicamente posicionadas:
                  </Text>
                  <View style={styles.telasWrap}>
                    {contrato.locais_selecionados.map((local, i) => (
                      <View key={i} style={styles.telaChip}>
                        <Text style={styles.telaChipText}>{local.replace(/\s*\(.*?\)/g, '').trim()}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {(contrato.horario_semana_inicio || contrato.dias_semana?.length > 0) && (
                <View>
                  <Text style={[styles.clausulaTexto, { marginBottom: 6 }]}>
                    As campanhas serão veiculadas nos seguintes dias e horários:
                  </Text>
                  <View style={styles.tabelaHorarios}>
                    <View style={styles.tabelaHeader}>
                      <Text style={styles.tabelaHeaderText}>Período</Text>
                      <Text style={styles.tabelaHeaderText}>Início</Text>
                      <Text style={styles.tabelaHeaderText}>Fim</Text>
                    </View>
                    {contrato.horario_semana_inicio && (
                      <View style={styles.tabelaRow}>
                        <Text style={styles.tabelaCell}>Dias de semana</Text>
                        <Text style={styles.tabelaCell}>{contrato.horario_semana_inicio}</Text>
                        <Text style={styles.tabelaCell}>{contrato.horario_semana_fim || '—'}</Text>
                      </View>
                    )}
                    {contrato.horario_fds_inicio && (
                      <View style={styles.tabelaRow}>
                        <Text style={styles.tabelaCell}>Fins de semana</Text>
                        <Text style={styles.tabelaCell}>{contrato.horario_fds_inicio}</Text>
                        <Text style={styles.tabelaCell}>{contrato.horario_fds_fim || '—'}</Text>
                      </View>
                    )}
                  </View>
                  {contrato.dias_semana?.length > 0 && (
                    <Text style={[styles.clausulaTexto, { marginTop: 5 }]}>
                      Dias: {contrato.dias_semana.map((d) => DIAS_SEMANA_LABELS[d] || d).join(', ')}
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* INVESTIMENTO */}
          {contrato.tipo !== 'parceria' && contrato.valor_mensal && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Cláusula Terceira — Do Investimento</Text>
              <View style={styles.valorBox}>
                <View>
                  <Text style={styles.valorLabel}>Investimento mensal</Text>
                  <Text style={styles.valorTexto}>R$ {formatarMoeda(contrato.valor_mensal)}</Text>
                  {contrato.dia_pagamento && (
                    <Text style={styles.valorSub}>Vencimento: todo dia {contrato.dia_pagamento} do mês</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.valorLabel}>Total do período</Text>
                  <Text style={[styles.valorTexto, { fontSize: 13 }]}>
                    R$ {formatarMoeda(contrato.valor_mensal * contrato.duracao_meses)}
                  </Text>
                  <Text style={styles.valorSub}>{contrato.duracao_meses}x de R$ {formatarMoeda(contrato.valor_mensal)}</Text>
                </View>
              </View>
              <Text style={styles.clausulaTexto}>
                O pagamento deverá ser realizado pessoalmente, por boleto, depósito bancário ou PIX, mediante emissão de recibo pela{' '}
                <Text style={styles.clausulaTextoDestaque}>PULSE MARKETING INDOOR</Text>.
              </Text>
            </View>
          )}

          {/* PERMUTA */}
          {contrato.tipo === 'parceria' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Cláusula Terceira — Da Permuta</Text>
              <View style={styles.clausula}>
                <Text style={styles.clausulaTexto}>
                  Na modalidade de permuta, a{' '}
                  <Text style={styles.clausulaTextoDestaque}>PULSE MARKETING INDOOR</Text>
                  {' irá transmitir um VT publicitário da '}
                  <Text style={styles.clausulaTextoDestaque}>{contrato.nome_empresa}</Text>
                  {' em seus estabelecimentos parceiros, em troca da cessão do espaço e fornecimento de energia elétrica e internet pela CONTRATADA.'}
                </Text>
              </View>
            </View>
          )}

          {/* OBRIGAÇÕES */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Obrigações e Responsabilidades</Text>
            <View style={styles.clausula}>
              {contrato.tipo === 'parceria' ? (
                <Text style={styles.clausulaTexto}>
                  {'A CONTRATADA deverá ceder o espaço em seu estabelecimento para instalação de uma ou mais telas, fornecendo energia elétrica e internet. A CONTRATADA fica expressamente proibida de sintonizar a tela em programação diversa daquela fornecida pela PULSE MARKETING INDOOR.\n\n'}
                  {'A PULSE MARKETING INDOOR compromete-se a não exibir conteúdo que concorra com os produtos/serviços da CONTRATADA, não apresentar conteúdo de cunho político, ideológico ou preconceituoso, e respeitar a legislação vigente quanto a propriedade intelectual.'}
                </Text>
              ) : (
                <Text style={styles.clausulaTexto}>
                  {'A PULSE MARKETING INDOOR compromete-se a exibir a propaganda do ANUNCIANTE nos dias e horários estabelecidos, informar sobre eventuais problemas técnicos que afetem a exibição, e não alterar o conteúdo da mídia sem consentimento expresso do ANUNCIANTE.\n\n'}
                  {'O ANUNCIANTE é responsável pelo conteúdo veiculado, que não deve apresentar caráter político, ideológico, sexual ou preconceituoso, devendo respeitar integralmente a legislação vigente quanto a direitos autorais e propriedade intelectual.'}
                </Text>
              )}
            </View>
          </View>

          {/* VIGÊNCIA E RESCISÃO */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Cláusula — Vigência e Rescisão</Text>
            <View style={styles.clausula}>
              <Text style={styles.clausulaTexto}>
                {contrato.tipo === 'parceria'
                  ? `A vigência deste contrato iniciará quando a PULSE MARKETING INDOOR instalar as telas no estabelecimento da CONTRATADA e vigorará pelo prazo de ${labelDuracao(contrato.duracao_meses)}. O presente contrato poderá ser rescindido mediante solicitação expressa com prazo mínimo de 30 (trinta) dias de antecedência, após um período mínimo de 3 (três) meses da instalação. Caso haja silêncio entre as partes, a renovação será automática.`
                  : `A vigência deste contrato iniciará no momento em que a propaganda do ANUNCIANTE for inserida nas telas da PULSE MARKETING INDOOR e vigorará pelo prazo de ${labelDuracao(contrato.duracao_meses)}. O não cumprimento do prazo acordado implicará ao ANUNCIANTE pagar uma multa de 30% do investimento restante até a data final do contrato.`
                }
                {'\n\n'}
                {'Em caso de inadimplemento, este contrato servirá como título executivo extrajudicial, na forma do Art. 784, III do NCPC.'}
              </Text>
            </View>
          </View>

          {/* DATA E ASSINATURAS */}
          <View style={styles.dataLocal}>
            <Text>Blumenau/SC, _______ de ________________________ de _______.</Text>
          </View>

          <View style={styles.assinaturas}>
            <View style={styles.assinaturaBox}>
              <View style={styles.assinaturaLinha} />
              <Text style={styles.assinaturaLabel}>PULSE MARKETING INDOOR</Text>
              <Text style={styles.assinaturaDoc}>CNPJ: 50.982.835/0001-62</Text>
            </View>
            <View style={styles.assinaturaBox}>
              <View style={styles.assinaturaLinha} />
              <Text style={styles.assinaturaLabel}>{contrato.nome_empresa.toUpperCase()}</Text>
              {contrato.cnpj_cpf && (
                <Text style={styles.assinaturaDoc}>{contrato.cnpj_cpf}</Text>
              )}
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {contrato.numero_contrato
              ? `Contrato Nº ${String(contrato.numero_contrato).padStart(4, '0')}/${new Date(contrato.created_at).getFullYear()}`
              : 'Pulse Marketing Indoor'}
            {' · Documento gerado em ' + format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
          </Text>
          <Text style={styles.footerBrand}>PULSE · pulsemktindoor@gmail.com</Text>
        </View>
      </Page>
    </Document>
  )
}
