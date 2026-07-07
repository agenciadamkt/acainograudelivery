-- ═══════════════════════════════════════════════════════════════
-- FIX: Colunas ausentes nas tabelas de Bonificação
-- Execute no Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Adicionar colunas ausentes em stock_bonificacoes
ALTER TABLE stock_bonificacoes
  ADD COLUMN IF NOT EXISTS motivo                TEXT,
  ADD COLUMN IF NOT EXISTS favorecido            TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp              TEXT,
  ADD COLUMN IF NOT EXISTS is_internal_consumption BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS feedback_status       TEXT DEFAULT 'Sem resposta';

-- 2. Adicionar coluna unit_price em stock_bonificacao_items
ALTER TABLE stock_bonificacao_items
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) DEFAULT 0;

-- 3. Reload do schema cache do Supabase (PostgREST)
NOTIFY pgrst, 'reload schema';
