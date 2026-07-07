-- Permite à franqueadora alterar um pedido já feito (ex: ajustar
-- quantidade por falta de estoque) e deixa isso visível pro franqueado,
-- com o motivo da alteração.
ALTER TABLE public.franchisee_orders
  ADD COLUMN IF NOT EXISTS edited_by_admin BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edit_reason TEXT,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
