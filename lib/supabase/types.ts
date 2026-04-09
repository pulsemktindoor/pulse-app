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
          created_at?: string
        }
      }
      contratos: {
        Row: {
          id: string
          cliente_id: string
          data_inicio: string
          duracao_meses: number
          data_fim: string
          status: 'ativo' | 'proximo_vencimento' | 'vencido'
          created_at: string
        }
        Insert: {
          id?: string
          cliente_id: string
          data_inicio: string
          duracao_meses: number
          data_fim: string
          status?: 'ativo' | 'proximo_vencimento' | 'vencido'
          created_at?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          data_inicio?: string
          duracao_meses?: string
          data_fim?: string
          status?: 'ativo' | 'proximo_vencimento' | 'vencido'
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
