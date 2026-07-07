-- Pedidos manuais não tinham campo de valor — sempre apareciam como R$ 0,00
-- na Rota do Dia, no relatório e no comprovante, mesmo quando a entrega tinha
-- um valor real associado.
ALTER TABLE public.manual_delivery_orders
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC NOT NULL DEFAULT 0;
