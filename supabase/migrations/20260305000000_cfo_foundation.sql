-- ====================================================
-- CFO Digital - Fase 1: Fundamento Financeiro
-- ====================================================

-- 1. Adicionar vencimento nas despesas
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due_date DATE;
COMMENT ON COLUMN expenses.due_date IS 'Data de vencimento da despesa para projeção de caixa';

-- 2. Criar tabela de Contas a Receber
CREATE TABLE IF NOT EXISTS accounts_receivable (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchisee_user_id UUID REFERENCES auth.users(id) NOT NULL,
    distribution_center_id UUID REFERENCES distribution_centers(id),
    client_id UUID REFERENCES financial_clients(id),
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    paid BOOLEAN DEFAULT false,
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ar_user ON accounts_receivable(franchisee_user_id, paid, due_date);
CREATE INDEX IF NOT EXISTS idx_ar_client ON accounts_receivable(client_id);

-- RLS
ALTER TABLE accounts_receivable ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'accounts_receivable' AND policyname = 'Users manage own receivables'
    ) THEN
        CREATE POLICY "Users manage own receivables"
            ON accounts_receivable FOR ALL
            USING (auth.uid() = franchisee_user_id)
            WITH CHECK (auth.uid() = franchisee_user_id);
    END IF;
END$$;
