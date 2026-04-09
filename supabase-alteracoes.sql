-- Adicionar novos campos na tabela clientes
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS data_inicio_contrato date,
ADD COLUMN IF NOT EXISTS data_fim_contrato date,
ADD COLUMN IF NOT EXISTS dia_envio_relatorio integer DEFAULT 5;
