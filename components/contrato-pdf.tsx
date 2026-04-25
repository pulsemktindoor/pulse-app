'use client'

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import { Contrato } from '@/lib/supabase/types'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const BLUE = '#2563eb'
const DARK = '#1e3a8a'
const LIGHT_BG = '#eff6ff'
const BORDER = '#dbeafe'
const TEXT = '#1f2937'
const MUTED = '#6b7280'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: TEXT,
    paddingTop: 20,
    paddingBottom: 50,
    paddingHorizontal: 0,
  },

  // HEADER
  header: {
    paddingHorizontal: 40,
    paddingTop: 0,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: BLUE,
  },
  headerLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImg: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  logoTexto: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  logoSub: {
    fontSize: 8,
    color: MUTED,
    letterSpacing: 0.3,
  },
  headerDireita: {
    alignItems: 'flex-end',
  },
  headerTipoLabel: {
    fontSize: 6.5,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerTipo: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
  },
  headerNumero: {
    fontSize: 7.5,
    color: MUTED,
    marginTop: 3,
  },

  // FAIXA DE INFO
  infoStrip: {
    backgroundColor: LIGHT_BG,
    paddingHorizontal: 40,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  infoItem: {
    flexDirection: 'row',
    gap: 4,
  },
  infoLabel: { fontSize: 7.5, color: MUTED },
  infoValue: { fontSize: 7.5, color: DARK, fontFamily: 'Helvetica-Bold' },

  // CORPO
  body: {
    paddingHorizontal: 40,
    paddingTop: 20,
  },

  // SEÇÃO
  secTitulo: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: BLUE,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  section: {
    marginBottom: 14,
  },

  // CARDS DAS PARTES
  partesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  parteCard: {
    flex: 1,
    backgroundColor: LIGHT_BG,
    borderRadius: 5,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
  },
  parteCardTitulo: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 7,
  },
  campoRow: {
    flexDirection: 'row',
    marginBottom: 3.5,
  },
  campoLabel: {
    fontSize: 7.5,
    color: MUTED,
    width: 65,
    flexShrink: 0,
  },
  campoValor: {
    fontSize: 7.5,
    color: TEXT,
    fontFamily: 'Helvetica-Bold',
    flex: 1,
  },
  campoValorNormal: {
    fontSize: 7.5,
    color: TEXT,
    flex: 1,
  },

  // CLÁUSULAS
  clausula: {
    marginBottom: 10,
    breakInside: 'avoid',
  },
  clausulaTitulo: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: DARK,
    marginBottom: 4,
  },
  clausulaTexto: {
    fontSize: 8,
    color: '#374151',
    lineHeight: 1.55,
  },
  negrito: {
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 8,
  },
  bulletDot: {
    fontSize: 8,
    color: BLUE,
    marginRight: 4,
    width: 8,
  },
  bulletTexto: {
    fontSize: 8,
    color: '#374151',
    lineHeight: 1.5,
    flex: 1,
  },

  // TELAS
  telasWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  telaChip: {
    backgroundColor: BLUE,
    borderRadius: 20,
    paddingVertical: 2.5,
    paddingHorizontal: 9,
  },
  telaChipText: {
    fontSize: 7.5,
    color: '#fff',
    fontFamily: 'Helvetica-Bold',
  },

  // VALOR BOX
  valorBox: {
    backgroundColor: LIGHT_BG,
    borderRadius: 5,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  valorLabel: { fontSize: 7.5, color: MUTED },
  valorNumero: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: DARK, marginTop: 1 },
  valorSub: { fontSize: 7, color: MUTED, marginTop: 2 },

  // DIVISOR
  divider: {
    borderTopWidth: 1,
    borderTopColor: BORDER,
    marginVertical: 12,
  },

  // ASSINATURAS
  assinaturas: {
    flexDirection: 'row',
    gap: 30,
    marginTop: 40,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  assinaturaBox: {
    flex: 1,
    alignItems: 'center',
  },
  assinaturaLinha: {
    borderTopWidth: 1,
    borderTopColor: TEXT,
    width: '100%',
    marginTop: 40,
    marginBottom: 5,
  },
  assinaturaLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: TEXT,
    textAlign: 'center',
  },
  assinaturaDoc: {
    fontSize: 7,
    color: MUTED,
    textAlign: 'center',
    marginTop: 2,
  },

  // DATA/LOCAL
  dataLocal: {
    fontSize: 8,
    color: TEXT,
    marginBottom: 16,
  },
  dataInstalacao: {
    fontSize: 8,
    color: TEXT,
    marginBottom: 8,
  },

  // FOOTER
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 6.5, color: '#9ca3af' },
  footerBrand: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: BLUE },
})

function fmtData(d: string) {
  return format(parseISO(d), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
}
function fmtCnpjCpf(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  return v
}
function fmtTelefone(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return v
}
function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDuracao(m: number) {
  if (m === 6) return '6 (seis) meses'
  if (m === 12) return '12 (doze) meses'
  return `${m} meses`
}

interface Props {
  contrato: Contrato
  logoUrl?: string
}

export function ContratoPDF({ contrato, logoUrl }: Props) {
  const ano = new Date(contrato.created_at).getFullYear()
  const numContrato = contrato.numero_contrato
    ? `Nº ${String(contrato.numero_contrato).padStart(4, '0')}/${ano}`
    : ''

  const temPermuta = contrato.tipo === 'corporativa' && (contrato.locais_selecionados?.length ?? 0) > 0

  const tituloTipo =
    contrato.tipo === 'anuncio' ? 'Contrato de Publicidade Mídia Indoor' :
    contrato.tipo === 'parceria' ? 'Contrato de Parceria / Permuta' :
    temPermuta ? 'Contrato de Parceria — Tela Corporativa e Tela Marketing Indoor' :
    'Contrato de TV Corporativa'

  const parteLabel =
    contrato.tipo === 'anuncio' ? 'Anunciante' :
    contrato.tipo === 'parceria' ? 'Contratada' :
    'Contratado'

  const endAnunciante = [
    contrato.endereco,
    contrato.numero ? `nº ${contrato.numero}` : null,
    contrato.complemento,
  ].filter(Boolean).join(', ')

  const cidadeAnunciante = [contrato.cidade, contrato.uf].filter(Boolean).join(' / ')

  const bairroCidadeAnunciante = [
    contrato.bairro,
    cidadeAnunciante,
  ].filter(Boolean).join(' — ')

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── CABEÇALHO ── */}
        <View style={s.header}>
          <View style={s.headerLogo}>
            {logoUrl ? (
              <Image style={s.logoImg} src={logoUrl} />
            ) : null}
            <View style={s.logoTexto}>
              <Text style={s.logoSub}>MARKETING INDOOR</Text>
            </View>
          </View>
          <View style={s.headerDireita}>
            <Text style={s.headerTipoLabel}>Documento</Text>
            <Text style={s.headerTipo}>{tituloTipo}</Text>
            {numContrato ? <Text style={s.headerNumero}>{numContrato}</Text> : null}
          </View>
        </View>

        {/* ── FAIXA DE VIGÊNCIA ── */}
        <View style={s.infoStrip}>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Início: </Text>
            <Text style={s.infoValue}>{fmtData(contrato.data_inicio)}</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Término: </Text>
            <Text style={s.infoValue}>{fmtData(contrato.data_fim)}</Text>
          </View>
          <View style={s.infoItem}>
            <Text style={s.infoLabel}>Duração: </Text>
            <Text style={s.infoValue}>{fmtDuracao(contrato.duracao_meses)}</Text>
          </View>
        </View>

        <View style={s.body}>

          {/* ── IDENTIFICAÇÃO DAS PARTES ── */}
          <View style={s.section}>
            <Text style={s.secTitulo}>Identificação das Partes</Text>
            <View style={s.partesGrid}>
              {/* Pulse */}
              <View style={s.parteCard}>
                <Text style={s.parteCardTitulo}>Contratante</Text>
                <View style={s.campoRow}>
                  <Text style={s.campoLabel}>Razão Social</Text>
                  <Text style={s.campoValor}>PULSE MARKETING INDOOR</Text>
                </View>
                <View style={s.campoRow}>
                  <Text style={s.campoLabel}>CNPJ</Text>
                  <Text style={s.campoValorNormal}>50.982.835/0001-62</Text>
                </View>
                <View style={s.campoRow}>
                  <Text style={s.campoLabel}>Endereço</Text>
                  <Text style={s.campoValorNormal}>R. General Osório, nº 3139</Text>
                </View>
                <View style={s.campoRow}>
                  <Text style={s.campoLabel}>Bairro/Cidade</Text>
                  <Text style={s.campoValorNormal}>Água Verde — Blumenau/SC</Text>
                </View>
                <View style={s.campoRow}>
                  <Text style={s.campoLabel}>CEP</Text>
                  <Text style={s.campoValorNormal}>89042-001</Text>
                </View>
                <View style={s.campoRow}>
                  <Text style={s.campoLabel}>Email</Text>
                  <Text style={s.campoValorNormal}>pulsemktindoor@gmail.com</Text>
                </View>
                <View style={s.campoRow}>
                  <Text style={s.campoLabel}>Contato</Text>
                  <Text style={s.campoValorNormal}>(47) 98469-9904</Text>
                </View>
              </View>
              {/* Outro lado */}
              <View style={s.parteCard}>
                <Text style={s.parteCardTitulo}>{parteLabel}</Text>
                <View style={s.campoRow}>
                  <Text style={s.campoLabel}>Razão Social</Text>
                  <Text style={s.campoValor}>{contrato.nome_empresa || '—'}</Text>
                </View>
                {contrato.cnpj_cpf ? (
                  <View style={s.campoRow}>
                    <Text style={s.campoLabel}>CNPJ / CPF</Text>
                    <Text style={s.campoValorNormal}>{fmtCnpjCpf(contrato.cnpj_cpf)}</Text>
                  </View>
                ) : null}
                {endAnunciante ? (
                  <View style={s.campoRow}>
                    <Text style={s.campoLabel}>Endereço</Text>
                    <Text style={s.campoValorNormal}>{endAnunciante}</Text>
                  </View>
                ) : null}
                {bairroCidadeAnunciante ? (
                  <View style={s.campoRow}>
                    <Text style={s.campoLabel}>Bairro/Cidade</Text>
                    <Text style={s.campoValorNormal}>{bairroCidadeAnunciante}</Text>
                  </View>
                ) : null}
                {contrato.cep ? (
                  <View style={s.campoRow}>
                    <Text style={s.campoLabel}>CEP</Text>
                    <Text style={s.campoValorNormal}>{contrato.cep}</Text>
                  </View>
                ) : null}
                {contrato.contato ? (
                  <View style={s.campoRow}>
                    <Text style={s.campoLabel}>Contato</Text>
                    <Text style={s.campoValorNormal}>{fmtTelefone(contrato.contato)}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Texto de abertura */}
          <View style={{ marginBottom: 12 }}>
            <Text style={[s.clausulaTexto, { fontFamily: 'Helvetica-Bold' }]}>
              As partes acima identificadas têm, entre si, justo e acertado o{' '}
              {tituloTipo.toUpperCase()}, que se regerá pelas cláusulas seguintes.
            </Text>
          </View>

          {/* ══════════════════════════════════════
              CONTRATO ANÚNCIO
          ══════════════════════════════════════ */}
          {contrato.tipo === 'anuncio' && (
            <>
              <View style={s.clausula} wrap={false}>
                <Text style={s.clausulaTitulo}>1. CLÁUSULA PRIMEIRA – DO OBJETO</Text>
                <Text style={s.clausulaTexto}>
                  {'1.1  O presente contrato tem por objeto a exibição do comercial da empresa '}
                  <Text style={s.negrito}>{contrato.nome_empresa}</Text>
                  {' nos monitores de mídia indoor da '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {', pelo período de '}
                  <Text style={s.negrito}>{fmtDuracao(contrato.duracao_meses)}</Text>
                  {', com início em '}
                  <Text style={s.negrito}>{fmtData(contrato.data_inicio)}</Text>
                  {' e encerramento em '}
                  <Text style={s.negrito}>{fmtData(contrato.data_fim)}</Text>
                  {'.'}
                </Text>
              </View>

              <View style={s.clausula} wrap={false}>
                <Text style={s.clausulaTitulo}>2. CLÁUSULA SEGUNDA – DO PRAZO DE ANÚNCIO</Text>
                {contrato.locais_selecionados?.length > 0 ? (
                  <>
                    <Text style={[s.clausulaTexto, { marginBottom: 5 }]}>
                      2.1  As campanhas serão veiculadas nas seguintes telas estrategicamente posicionadas:
                    </Text>
                    <View style={s.telasWrap}>
                      {contrato.locais_selecionados.map((local, i) => (
                        <View key={i} style={s.telaChip}>
                          <Text style={s.telaChipText}>{local.replace(/\s*\(.*?\)/g, '').trim()}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <Text style={s.clausulaTexto}>
                    2.1  As campanhas serão veiculadas nas telas da PULSE MARKETING INDOOR definidas em comum acordo entre as partes.
                  </Text>
                )}
              </View>

              <View style={s.clausula} wrap={false}>
                <Text style={s.clausulaTitulo}>3. CLÁUSULA TERCEIRA – DO INVESTIMENTO</Text>
                {contrato.valor_mensal ? (
                  <>
                    <View style={s.valorBox}>
                      <View>
                        <Text style={s.valorLabel}>Investimento mensal</Text>
                        <Text style={s.valorNumero}>R$ {fmtMoeda(contrato.valor_mensal)}</Text>
                        {contrato.dia_pagamento ? (
                          <Text style={s.valorSub}>Vencimento: todo dia {contrato.dia_pagamento} do mês</Text>
                        ) : null}
                      </View>
                    </View>
                    <Text style={s.clausulaTexto}>
                      {'3.1  Pelo período de anúncio de '}
                      <Text style={s.negrito}>{fmtDuracao(contrato.duracao_meses)}</Text>
                      {', o '}
                      <Text style={s.negrito}>ANUNCIANTE</Text>
                      {' fará o investimento mensal no valor fixo de '}
                      <Text style={s.negrito}>R$ {fmtMoeda(contrato.valor_mensal)}</Text>
                      {', que deverá ser repassado à '}
                      <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                      {' por boleto ou PIX.'}
                    </Text>
                  </>
                ) : (
                  <Text style={s.clausulaTexto}>
                    3.1  O valor e a forma de pagamento serão definidos em comum acordo entre as partes.
                  </Text>
                )}
              </View>

              <View style={s.clausula} wrap={false}>
                <Text style={s.clausulaTitulo}>4. CLÁUSULA QUARTA – DAS OBRIGAÇÕES DA PULSE MARKETING INDOOR</Text>
                <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                  {'4.1  A '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {' compromete-se, a partir da data de início do anúncio, a exibir a propaganda do '}
                  <Text style={s.negrito}>ANUNCIANTE</Text>
                  {' nas telas estabelecidas.'}
                </Text>
                <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                  {'4.2  É dever da '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {' informar o '}
                  <Text style={s.negrito}>ANUNCIANTE</Text>
                  {' sobre possíveis problemas, como: mídia incompatível com as telas, eventuais problemas técnicos com a exibição, dentre outros.'}
                </Text>
                <Text style={s.clausulaTexto}>
                  {'4.3  A '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {' fica expressamente proibida de alterar o conteúdo da mídia do '}
                  <Text style={s.negrito}>ANUNCIANTE</Text>
                  {' sem consentimento expresso do mesmo.'}
                </Text>
              </View>

              <View style={s.clausula} wrap={false}>
                <Text style={s.clausulaTitulo}>5. CLÁUSULA QUINTA – DAS OBRIGAÇÕES DO ANUNCIANTE</Text>
                <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                  {'5.1  O '}
                  <Text style={s.negrito}>ANUNCIANTE</Text>
                  {' compromete-se a pagar o valor contratado, sempre na data estabelecida'}
                  {contrato.dia_pagamento ? ` (todo dia ${contrato.dia_pagamento} de cada mês)` : ''}
                  {', até o encerramento do contrato.'}
                </Text>
                <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                  {'5.2  O conteúdo da mídia utilizada nas telas da '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {' é de total responsabilidade do '}
                  <Text style={s.negrito}>ANUNCIANTE</Text>
                  {', respeitando as seguintes condições:'}
                </Text>
                {[
                  'Não apresentar conteúdo de cunho político, ideológico, exploração sexual, religioso ou preconceituoso;',
                  'Não constranger os clientes com conteúdo sexual, racista ou sexista;',
                  'Respeitar a legislação vigente quanto à propriedade intelectual e aos direitos autorais de conteúdos audiovisuais.',
                ].map((item, i) => (
                  <View key={i} style={s.bullet}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletTexto}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={s.clausula} wrap={false}>
                <Text style={s.clausulaTitulo}>6. CLÁUSULA SEXTA – DO INADIMPLEMENTO</Text>
                <Text style={s.clausulaTexto}>
                  6.1  Em caso de inadimplemento, este contrato servirá como título executivo extrajudicial, na forma do Art. 784, III do NCPC, para a cobrança do valor devido pela parte inadimplente.
                </Text>
              </View>

              <View style={s.clausula} wrap={false}>
                <Text style={s.clausulaTitulo}>7. CLÁUSULA SÉTIMA – VIGÊNCIA E RESCISÃO</Text>
                <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                  {'7.1  A vigência deste contrato iniciará no momento em que a propaganda do '}
                  <Text style={s.negrito}>ANUNCIANTE</Text>
                  {' for inserida nas telas da '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {' e vigorará pelo prazo de '}
                  <Text style={s.negrito}>{fmtDuracao(contrato.duracao_meses)}</Text>
                  {'.'}
                </Text>
                <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                  7.2  O não cumprimento do prazo acordado implicará ao <Text style={s.negrito}>ANUNCIANTE</Text> pagar à <Text style={s.negrito}>PULSE MARKETING INDOOR</Text> uma multa de 30% do investimento restante até a data final do contrato.
                </Text>
                <Text style={s.clausulaTexto}>
                  7.3  Poderá ser rescindido este contrato nos seguintes casos: A) pelo descumprimento de qualquer cláusula prevista; B) por ajuizamento de ação que afete a credibilidade ou idoneidade de qualquer das partes; C) por pedido de concordata, decretação de falência ou dissolução judicial/extrajudicial de qualquer das partes; D) pela ocorrência comprovada de caso fortuito ou força maior.
                </Text>
              </View>
            </>
          )}

          {/* ══════════════════════════════════════
              CONTRATO PARCERIA
          ══════════════════════════════════════ */}
          {contrato.tipo === 'parceria' && (
            <>
              <View style={s.clausula} wrap={false}>
                <Text style={s.clausulaTitulo}>1. CLÁUSULA PRIMEIRA – DO OBJETO</Text>
                <Text style={s.clausulaTexto}>
                  {'1.1  O objeto do presente Contrato é a parceria entre a '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {' e a '}
                  <Text style={s.negrito}>CONTRATADA</Text>
                  {', referente à publicidade no estabelecimento da '}
                  <Text style={s.negrito}>CONTRATADA</Text>
                  {', para com seu público cliente, através da instalação de tela(s) e programação oferecidas pela '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {', pelo prazo de '}
                  <Text style={s.negrito}>{fmtDuracao(contrato.duracao_meses)}</Text>
                  {', com início em '}
                  <Text style={s.negrito}>{fmtData(contrato.data_inicio)}</Text>
                  {'.'}
                </Text>
              </View>

              <View style={s.clausula} wrap={false}>
                <Text style={s.clausulaTitulo}>2. CLÁUSULA SEGUNDA – DOS SERVIÇOS REALIZADOS PELA PULSE MARKETING INDOOR</Text>
                <Text style={s.clausulaTexto}>
                  {'2.1  A '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {' realiza estudo do conceito, marca, produto ou serviço a ser publicado, incluindo a identificação e análise de suas vantagens e desvantagens aos seus públicos e, quando for o caso, ao seu mercado e à sua concorrência, bem como análise do público e do mercado no qual a marca, produto ou serviço encontre melhor possibilidade de assimilação, criação das mensagens destinadas à veiculação em mídia, e o estudo dos meios e veículos que assegurem a melhor cobertura do público e mercado objetivados.'}
                </Text>
              </View>

              <View style={s.clausula} wrap={false}>
                <Text style={s.clausulaTitulo}>3. CLÁUSULA TERCEIRA – OBRIGAÇÕES DA CONTRATADA</Text>
                <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                  {'3.1  A '}
                  <Text style={s.negrito}>CONTRATADA</Text>
                  {' deverá ceder o espaço em seu estabelecimento comercial onde será instalado: a) uma ou mais telas; b) a energia elétrica e internet, fornecidas pela '}
                  <Text style={s.negrito}>CONTRATADA</Text>
                  {'.'}
                </Text>
                <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                  {'3.2  A '}
                  <Text style={s.negrito}>CONTRATADA</Text>
                  {' fica expressamente proibida de sintonizar a tela em programação diversa daquela fornecida pela '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {', devendo manter a tela ligada durante todo o período acordado.'}
                </Text>
                <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                  {'3.3  É dever da '}
                  <Text style={s.negrito}>CONTRATADA</Text>
                  {' informar a '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {' sobre possíveis problemas, como: tela desligada, tela sem exibir vídeo, dentre outros problemas que afetem a exibição da programação.'}
                </Text>
                <Text style={s.clausulaTexto}>
                  {'3.4  A '}
                  <Text style={s.negrito}>CONTRATADA</Text>
                  {' deve zelar pela segurança dos equipamentos da '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {', como se fossem seus, durante a vigência do presente contrato.'}
                </Text>
              </View>

              <View style={s.clausula} wrap={false}>
                <Text style={s.clausulaTitulo}>4. CLÁUSULA QUARTA – DAS OBRIGAÇÕES DA PULSE MARKETING INDOOR</Text>
                <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                  {'4.1  A comercialização de espaços publicitários é de inteira responsabilidade da '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {' e/ou seus parceiros, respeitando as regras do estabelecimento bem como as cláusulas estabelecidas no presente instrumento.'}
                </Text>
                <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                  4.2  A comercialização de espaços de mídia será de responsabilidade da <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>, respeitando as seguintes condições:
                </Text>
                {[
                  'Não concorrer com produtos e serviços da CONTRATADA;',
                  'Não apresentar conteúdo de cunho político, ideológico, exploração sexual ou preconceituoso;',
                  'Respeitar a legislação vigente quanto à propriedade intelectual e aos direitos autorais de conteúdos audiovisuais.',
                ].map((item, i) => (
                  <View key={i} style={s.bullet}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletTexto}>{item}</Text>
                  </View>
                ))}
              </View>

              <View style={s.clausula} wrap={false}>
                <Text style={s.clausulaTitulo}>5. CLÁUSULA QUINTA – DA PERMUTA</Text>
                <Text style={s.clausulaTexto}>
                  {'5.1  Na modalidade de permuta, a '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {' irá transmitir um VT publicitário da '}
                  <Text style={s.negrito}>CONTRATADA</Text>
                  {' em estabelecimentos parceiros, em troca da utilização do espaço cedido no estabelecimento da '}
                  <Text style={s.negrito}>CONTRATADA</Text>
                  {'.'}
                </Text>
              </View>

              <View style={s.clausula} wrap={false}>
                <Text style={s.clausulaTitulo}>6. CLÁUSULA SEXTA – DO INADIMPLEMENTO</Text>
                <Text style={s.clausulaTexto}>
                  6.1  Em caso de inadimplemento, este contrato servirá como título executivo extrajudicial, na forma do Art. 784, III do CPC, para a cobrança do valor devido pela parte inadimplente.
                </Text>
              </View>

              <View style={s.clausula} wrap={false}>
                <Text style={s.clausulaTitulo}>7. CLÁUSULA SÉTIMA – VIGÊNCIA E RESCISÃO</Text>
                <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                  {'7.1  A vigência deste contrato iniciará quando a '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {' instalar as telas no estabelecimento da '}
                  <Text style={s.negrito}>CONTRATADA</Text>
                  {' e vigorará pelo prazo de '}
                  <Text style={s.negrito}>{fmtDuracao(contrato.duracao_meses)}</Text>
                  {'.'}
                </Text>
                <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                  7.2  O presente contrato poderá ser rescindido mediante <Text style={s.negrito}>SOLICITAÇÃO EXPRESSA</Text> de uma das partes à outra com prazo mínimo de 30 (trinta) dias de antecedência, após um período mínimo de 03 (três) meses da instalação do monitor no estabelecimento da <Text style={s.negrito}>CONTRATADA</Text>. Caso haja silêncio entre as partes, a renovação deste contrato será automática.
                </Text>
                <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                  7.3  Poderá ser rescindido este contrato nos seguintes casos: A) quando qualquer das partes não tenha mais interesse na continuidade, devendo comunicar prévia e formalmente à outra parte; B) pelo descumprimento de qualquer cláusula prevista; C) por ajuizamento de ação que afete a credibilidade de qualquer das partes; D) por pedido de concordata, decretação de falência ou dissolução judicial/extrajudicial; E) pela ocorrência de caso fortuito ou força maior.
                </Text>
                <Text style={s.clausulaTexto}>
                  {'7.4  Rescindido o contrato, ficará a '}
                  <Text style={s.negrito}>CONTRATADA</Text>
                  {' automaticamente proibida de utilizar quaisquer equipamentos de titularidade da '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {', bem como a '}
                  <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                  {' ficará impedida de utilizar o nome da '}
                  <Text style={s.negrito}>CONTRATADA</Text>
                  {' em seu portfólio.'}
                </Text>
              </View>
            </>
          )}

          {/* ══════════════════════════════════════
              CONTRATO CORPORATIVA
          ══════════════════════════════════════ */}
          {contrato.tipo === 'corporativa' && (() => {
            const nValor    = temPermuta ? 6 : 5
            const nInadimpl = temPermuta ? 7 : 6
            const nVig      = temPermuta ? 8 : 7
            const ord = ['','PRIMEIRA','SEGUNDA','TERCEIRA','QUARTA','QUINTA','SEXTA','SÉTIMA','OITAVA']
            return (
              <>
                <View style={s.clausula} wrap={false}>
                  <Text style={s.clausulaTitulo}>1. CLÁUSULA PRIMEIRA – DO OBJETO</Text>
                  <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                    {temPermuta
                      ? '1.1  Instalação de 01 (uma) tela de Marketing Indoor e 01 (uma) tela de TV Corporativa no estabelecimento do '
                      : '1.1  Instalação de 01 (uma) tela de TV Corporativa no estabelecimento do '}
                    <Text style={s.negrito}>CONTRATADO</Text>
                    {' ('}
                    <Text style={s.negrito}>{contrato.nome_empresa}</Text>
                    {'), pelo prazo de '}
                    <Text style={s.negrito}>{fmtDuracao(contrato.duracao_meses)}</Text>
                    {', com início em '}
                    <Text style={s.negrito}>{fmtData(contrato.data_inicio)}</Text>
                    {'.'}
                  </Text>
                  <Text style={s.clausulaTexto}>
                    1.2  Os locais de instalação serão definidos em comum acordo entre as partes.
                  </Text>
                </View>

                <View style={s.clausula} wrap={false}>
                  <Text style={s.clausulaTitulo}>2. CLÁUSULA SEGUNDA – SERVIÇOS REALIZADOS PELA PULSE MARKETING INDOOR</Text>
                  <Text style={s.clausulaTexto}>
                    {'2.1  A '}
                    <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                    {' realizará gestão de anúncios, monitoramento remoto, manutenção e programação das telas.'}
                  </Text>
                </View>

                <View style={s.clausula} wrap={false}>
                  <Text style={s.clausulaTitulo}>3. CLÁUSULA TERCEIRA – OBRIGAÇÕES DO CONTRATADO</Text>
                  <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                    {'3.1  O '}
                    <Text style={s.negrito}>CONTRATADO</Text>
                    {' deverá ceder o espaço em seu estabelecimento comercial para instalação '}{temPermuta ? 'das telas' : 'da tela'}{', fornecendo energia elétrica e internet.'}
                  </Text>
                  <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                    {'3.2  O '}
                    <Text style={s.negrito}>CONTRATADO</Text>
                    {' fica expressamente proibido de sintonizar '}{temPermuta ? 'as telas' : 'a tela'}{' em programação diversa daquela fornecida pela '}
                    <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                    {', devendo manter '}{temPermuta ? 'as telas ligadas' : 'a tela ligada'}{' durante todo o período acordado.'}
                  </Text>
                  <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                    {'3.3  É dever do '}
                    <Text style={s.negrito}>CONTRATADO</Text>
                    {' informar a '}
                    <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                    {' sobre possíveis problemas, como: tela desligada, tela sem exibir vídeo, dentre outros problemas que afetem a exibição da programação.'}
                  </Text>
                  <Text style={s.clausulaTexto}>
                    {'3.4  O '}
                    <Text style={s.negrito}>CONTRATADO</Text>
                    {' deve zelar pela segurança dos equipamentos da '}
                    <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                    {', como se fossem seus, durante a vigência do presente contrato.'}
                  </Text>
                </View>

                <View style={s.clausula} wrap={false}>
                  <Text style={s.clausulaTitulo}>4. CLÁUSULA QUARTA – DAS OBRIGAÇÕES DA PULSE MARKETING INDOOR</Text>
                  <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                    {'4.1  A '}
                    <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                    {' é responsável pela instalação, manutenção e programação '}{temPermuta ? 'das telas' : 'da tela'}{', respeitando as regras do estabelecimento e as cláusulas do presente instrumento.'}
                  </Text>
                  {temPermuta && (
                    <>
                      <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                        4.2  A comercialização de espaços de mídia na tela de Marketing Indoor respeitará as seguintes condições:
                      </Text>
                      {[
                        'Não concorrer com produtos e serviços do CONTRATADO;',
                        'Não apresentar conteúdo de cunho político, ideológico, exploração sexual ou preconceituoso;',
                        'Respeitar a legislação vigente quanto à propriedade intelectual e direitos autorais de conteúdos audiovisuais.',
                      ].map((item, i) => (
                        <View key={i} style={s.bullet}>
                          <Text style={s.bulletDot}>•</Text>
                          <Text style={s.bulletTexto}>{item}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </View>

                {temPermuta && (
                  <View style={s.clausula} wrap={false}>
                    <Text style={s.clausulaTitulo}>5. CLÁUSULA QUINTA – DA PERMUTA (TELA MARKETING INDOOR)</Text>
                    <Text style={s.clausulaTexto}>
                      {'5.1  Na modalidade de permuta, a '}
                      <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                      {' irá transmitir um VT publicitário do '}
                      <Text style={s.negrito}>CONTRATADO</Text>
                      {' em 3 (três) telas de estabelecimentos parceiros, em troca da utilização do espaço cedido no estabelecimento do '}
                      <Text style={s.negrito}>CONTRATADO</Text>
                      {' para a tela de Marketing Indoor.'}
                    </Text>
                  </View>
                )}

                <View style={s.clausula} wrap={false}>
                  <Text style={s.clausulaTitulo}>{nValor}. CLÁUSULA {ord[nValor]} – DO VALOR E DO PAGAMENTO (TELA CORPORATIVA)</Text>
                  {contrato.valor_mensal ? (
                    <>
                      <View style={s.valorBox}>
                        <View>
                          <Text style={s.valorLabel}>Valor mensal — Tela Corporativa</Text>
                          <Text style={s.valorNumero}>R$ {fmtMoeda(contrato.valor_mensal)}</Text>
                          {contrato.dia_pagamento ? (
                            <Text style={s.valorSub}>Vencimento: todo dia {contrato.dia_pagamento} do mês</Text>
                          ) : null}
                        </View>
                      </View>
                      <Text style={s.clausulaTexto}>
                        {`${nValor}.1  O `}
                        <Text style={s.negrito}>CONTRATADO</Text>
                        {' pagará mensalmente '}
                        <Text style={s.negrito}>R$ {fmtMoeda(contrato.valor_mensal)}</Text>
                        {' referente à Tela Corporativa, com vencimento todo dia '}
                        <Text style={s.negrito}>{contrato.dia_pagamento || '___'}</Text>
                        {' de cada mês, mediante emissão de recibo pela '}
                        <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                        {'.'}
                      </Text>
                    </>
                  ) : (
                    <Text style={s.clausulaTexto}>
                      {`${nValor}.1  O valor referente à Tela Corporativa será definido em comum acordo entre as partes, com vencimento todo dia _______ de cada mês.`}
                    </Text>
                  )}
                </View>

                <View style={s.clausula} wrap={false}>
                  <Text style={s.clausulaTitulo}>{nInadimpl}. CLÁUSULA {ord[nInadimpl]} – DO INADIMPLEMENTO</Text>
                  <Text style={s.clausulaTexto}>
                    {`${nInadimpl}.1  Em caso de inadimplemento, este contrato servirá como título executivo extrajudicial, na forma do Art. 784, III do CPC, para a cobrança do valor devido pela parte inadimplente.`}
                  </Text>
                </View>

                <View style={s.clausula} wrap={false}>
                  <Text style={s.clausulaTitulo}>{nVig}. CLÁUSULA {ord[nVig]} – VIGÊNCIA E RESCISÃO</Text>
                  <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                    {`${nVig}.1  A vigência deste contrato iniciará quando a `}
                    <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                    {' instalar '}{temPermuta ? 'as telas' : 'a tela'}{' no estabelecimento do '}
                    <Text style={s.negrito}>CONTRATADO</Text>
                    {' e vigorará pelo prazo de '}
                    <Text style={s.negrito}>{fmtDuracao(contrato.duracao_meses)}</Text>
                    {'.'}
                  </Text>
                  <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                    {`${nVig}.2  O presente contrato poderá ser rescindido mediante `}<Text style={s.negrito}>SOLICITAÇÃO EXPRESSA</Text>{` com prazo mínimo de 30 (trinta) dias de antecedência, após um período mínimo de 03 (três) meses da instalação. Caso haja silêncio entre as partes, a renovação será automática.`}
                  </Text>
                  <Text style={[s.clausulaTexto, { marginBottom: 4 }]}>
                    {`${nVig}.3  Poderá ser rescindido este contrato: A) quando qualquer das partes não tenha mais interesse na continuidade, devendo comunicar prévia e formalmente à outra parte, agendando data/hora de desligamento e retirada dos equipamentos; B) pelo uso dos serviços para fim diverso do contratado; C) pelo descumprimento de qualquer cláusula prevista; D) por ajuizamento de ação que afete a credibilidade de qualquer das partes; E) por pedido de concordata, falência ou dissolução judicial/extrajudicial; F) por caso fortuito ou força maior.`}
                  </Text>
                  <Text style={s.clausulaTexto}>
                    {`${nVig}.4  Rescindido o contrato, o `}
                    <Text style={s.negrito}>CONTRATADO</Text>
                    {' ficará automaticamente proibido de utilizar equipamentos de titularidade da '}
                    <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                    {', bem como a '}
                    <Text style={s.negrito}>PULSE MARKETING INDOOR</Text>
                    {' ficará impedida de utilizar o nome do '}
                    <Text style={s.negrito}>CONTRATADO</Text>
                    {' em seu portfólio.'}
                  </Text>
                </View>
              </>
            )
          })()}

          {/* ── DATA E ASSINATURAS ── */}
          {contrato.tipo === 'corporativa' && (
            <Text style={s.dataInstalacao}>Data de Instalação: _______ / _______ / _____________.</Text>
          )}
          <Text style={s.dataLocal}>{format(new Date(), "'Blumenau/SC,' dd 'de' MMMM 'de' yyyy'.'", { locale: ptBR })}</Text>

          <View style={s.assinaturas}>
            <View style={s.assinaturaBox}>
              <View style={s.assinaturaLinha} />
              <Text style={s.assinaturaLabel}>PULSE MARKETING INDOOR</Text>
              <Text style={s.assinaturaDoc}>CNPJ: 50.982.835/0001-62</Text>
            </View>
            <View style={s.assinaturaBox}>
              <View style={s.assinaturaLinha} />
              <Text style={s.assinaturaLabel}>{contrato.nome_empresa.toUpperCase()}</Text>
              {contrato.cnpj_cpf ? (
                <Text style={s.assinaturaDoc}>{fmtCnpjCpf(contrato.cnpj_cpf)}</Text>
              ) : null}
            </View>
          </View>

        </View>

        {/* ── FOOTER ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {numContrato || 'Pulse Marketing Indoor'}
            {' · Gerado em ' + format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
          </Text>
          <Text style={s.footerBrand}>pulsemktindoor@gmail.com · (47) 98469-9904</Text>
        </View>

      </Page>
    </Document>
  )
}
