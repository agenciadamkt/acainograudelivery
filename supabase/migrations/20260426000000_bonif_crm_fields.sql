ALTER TABLE stock_bonificacoes RENAME COLUMN responsavel_recebimento TO favorecido;
ALTER TABLE stock_bonificacoes ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE stock_bonificacoes ADD COLUMN IF NOT EXISTS feedback_status TEXT DEFAULT 'Sem resposta';
