ALTER TABLE stock_bonificacoes ADD COLUMN IF NOT EXISTS is_internal_consumption BOOLEAN DEFAULT FALSE;
