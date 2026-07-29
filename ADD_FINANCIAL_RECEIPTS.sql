-- ============================================================================
-- Recibos de Baixas (ERP Cefas) — tabela de histórico dos recibos gerados
-- Módulo: Financeiro › Recibos  (/admin/financeiro/recibos)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_receipts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id         uuid NOT NULL,          -- agrupa os recibos gerados de uma vez
  client_name      text NOT NULL,          -- razão social (da observação do Cefas)
  client_document  text,                   -- CPF/CNPJ do bloco do cliente
  title_number     text NOT NULL,          -- número do título / NF
  payment_date     date,                   -- data de pagamento da baixa
  payment_method   text NOT NULL,          -- forma confirmada pelo usuário
  amount           numeric(12,2) NOT NULL, -- valor pago
  pdf_path         text,                   -- reservado (download local por ora)
  source_file      text,                   -- nome do PDF de origem
  store_id         uuid,                   -- loja/franquia (opcional)
  created_by       uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_receipts_created_at
  ON public.financial_receipts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_receipts_batch
  ON public.financial_receipts (batch_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.financial_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read receipts" ON public.financial_receipts;
CREATE POLICY "Authenticated can read receipts"
  ON public.financial_receipts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can insert receipts" ON public.financial_receipts;
CREATE POLICY "Authenticated can insert receipts"
  ON public.financial_receipts FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Owner can delete receipts" ON public.financial_receipts;
CREATE POLICY "Owner can delete receipts"
  ON public.financial_receipts FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);
