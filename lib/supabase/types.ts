export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: {
          id: string
          nome_empresa: string
          nome_responsavel: string
          whatsapp: string
          plano: number
          valor_mensal: number
          locais: string[]
          data_inicio_contrato: string | null
          data_fim_contrato: string | null
          dia_envio_relatorio: number | null
          cnpj_cpf: string | null
          endereco: string | null
          numero: string | null
          bairro: string | null
          complemento: string | null
          cidade: string | null
          uf: string | null
          cep: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nome_empresa: string
          nome_responsavel: string
          whatsapp: string
          plano: number
          valor_mensal: number
          locais: string[]
          data_inicio_contrato?: string | null
          data_fim_contrato?: string | null
          dia_envio_relatorio?: number | null
          cnpj_cpf?: string | null
          endereco?: string | null
          numero?: string | null
          bairro?: string | null
          complemento?: string | null
          cidade?: string | null
          uf?: string | null
          cep?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nome_empresa?: string
          nome_responsavel?: string
          whatsapp?: string
          plano?: number
          valor_mensal?: number
          locais?: string[]
          data_inicio_contrato?: string | null
          data_fim_contrato?: string | null
          dia_envio_relatorio?: number | null
          cnpj_cpf?: string | null
          endereco?: string | null
          numero?: string | null
          bairro?: string | null
          complemento?: string | null
          cidade?: string | null
          uf?: string | null
          cep?: string | null
          created_at?: string
        }
      }
      contratos: {
        Row: {
          id: string
          numero_contrato: number
          tipo: 'anuncio' | 'parceria' | 'corporativa'
          cliente_id: string | null
          parceiro_id: string | null
          nome_empresa: string
          cnpj_cpf: string | null
          endereco: string | null
          numero: string | null
          bairro: string | null
          complemento: string | null
          cidade: string | null
          uf: string | null
          cep: string | null
          contato: string | null
          locais_selecionados: string[]
          duracao_meses: number
          data_inicio: string
          data_fim: string
          valor_mensal: number | null
          dia_pagamento: number | null
          horario_semana_inicio: string | null
          horario_semana_fim: string | null
          horario_fds_inicio: string | null
          horario_fds_fim: string | null
          dias_semana: string[]
          status: 'gerado' | 'enviado' | 'assinado'
          created_at: string
        }
        Insert: {
          id?: string
          numero_contrato?: number
          tipo: 'anuncio' | 'parceria' | 'corporativa'
          cliente_id?: string | null
          parceiro_id?: string | null
          nome_empresa: string
          cnpj_cpf?: string | null
          endereco?: string | null
          numero?: string | null
          bairro?: string | null
          complemento?: string | null
          cidade?: string | null
          uf?: string | null
          cep?: string | null
          contato?: string | null
          locais_selecionados?: string[]
          duracao_meses: number
          data_inicio: string
          data_fim: string
          valor_mensal?: number | null
          dia_pagamento?: number | null
          horario_semana_inicio?: string | null
          horario_semana_fim?: string | null
          horario_fds_inicio?: string | null
          horario_fds_fim?: string | null
          dias_semana?: string[]
          status?: 'gerado' | 'enviado' | 'assinado'
          created_at?: string
        }
        Update: {
          id?: string
          numero_contrato?: number
          tipo?: 'anuncio' | 'parceria' | 'corporativa'
          cliente_id?: string | null
          parceiro_id?: string | null
          nome_empresa?: string
          cnpj_cpf?: string | null
          endereco?: string | null
          numero?: string | null
          bairro?: string | null
          complemento?: string | null
          cidade?: string | null
          uf?: string | null
          cep?: string | null
          contato?: string | null
          locais_selecionados?: string[]
          duracao_meses?: number
          data_inicio?: string
          data_fim?: string
          valor_mensal?: number | null
          dia_pagamento?: number | null
          horario_semana_inicio?: string | null
          horario_semana_fim?: string | null
          horario_fds_inicio?: string | null
          horario_fds_fim?: string | null
          dias_semana?: string[]
          status?: 'gerado' | 'enviado' | 'assinado'
          created_at?: string
        }
      }
      relatorios: {
        Row: {
          id: string
          cliente_id: string
          mes_referencia: string
          total_exibicoes: number | null
          media_diaria: number | null
          enviado: boolean
          data_envio: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          mes_referencia: string
          total_exibicoes?: number | null
          media_diaria?: number | null
          enviado?: boolean
          data_envio?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          mes_referencia?: string
          total_exibicoes?: number | null
          media_diaria?: number | null
          enviado?: boolean
          data_envio?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type Cliente = Database['public']['Tables']['clientes']['Row']
export type Contrato = Database['public']['Tables']['contratos']['Row']
export type Relatorio = Database['public']['Tables']['relatorios']['Row']
export type ContratoTipo = 'anuncio' | 'parceria' | 'corporativa'
export type ContratoStatus = 'gerado' | 'enviado' | 'assinado'
