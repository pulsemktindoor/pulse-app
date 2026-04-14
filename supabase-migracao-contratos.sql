-- ============================================================
-- MIGRAÇÃO: Gerador de Contratos — Pulse Marketing Indoor
-- Rode este SQL no Supabase > SQL Editor
-- ============================================================

-- 1. Novos campos na tabela clientes
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS cnpj_cpf TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS numero TEXT,
  ADD COLUMN IF NOT EXISTS bairro TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT DEFAULT 'Blumenau',
  ADD COLUMN IF NOT EXISTS uf TEXT DEFAULT 'SC',
  ADD COLUMN IF NOT EXISTS cep TEXT;

-- 2. Recriar tabela contratos com a nova estrutura
-- (remove a antiga versão simples)
DROP TABLE IF EXISTS contratos;

CREATE TABLE contratos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_contrato SERIAL,
  tipo TEXT NOT NULL CHECK (tipo IN ('anuncio', 'parceria', 'corporativa')),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  parceiro_id UUID REFERENCES parceiros(id) ON DELETE SET NULL,
  nome_empresa TEXT NOT NULL,
  cnpj_cpf TEXT,
  endereco TEXT,
  numero TEXT,
  bairro TEXT,
  complemento TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  contato TEXT,
  locais_selecionados TEXT[] DEFAULT '{}',
  duracao_meses INTEGER NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  valor_mensal NUMERIC(10,2),
  dia_pagamento INTEGER,
  horario_semana_inicio TEXT,
  horario_semana_fim TEXT,
  horario_fds_inicio TEXT,
  horario_fds_fim TEXT,
  dias_semana TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'gerado' CHECK (status IN ('gerado', 'enviado', 'assinado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sem RLS (igual ao padrão do projeto)
ALTER TABLE contratos DISABLE ROW LEVEL SECURITY;
