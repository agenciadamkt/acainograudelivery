-- ============================================
-- ADICIONAR CAMPO estimated_delivery_time NA TABELA ORDERS
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Adicionar campo para tempo estimado de entrega
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_time INTEGER DEFAULT 30;

-- Comentário explicando o campo
COMMENT ON COLUMN orders.estimated_delivery_time IS 'Tempo estimado de entrega em minutos';

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND column_name = 'estimated_delivery_time';
