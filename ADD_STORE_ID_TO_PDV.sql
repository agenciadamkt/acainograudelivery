-- Add store_id to PDV tables to support multi-store users
ALTER TABLE public.pdv_orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.pdv_cash_registers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);
ALTER TABLE public.pdv_tables ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pdv_orders_store_id ON public.pdv_orders(store_id);
CREATE INDEX IF NOT EXISTS idx_pdv_cash_registers_store_id ON public.pdv_cash_registers(store_id);
CREATE INDEX IF NOT EXISTS idx_pdv_tables_store_id ON public.pdv_tables(store_id);

-- Update RLS policies to check store_id (optional but good practice)
-- For now, existing RLS checking user_id is enough to prevent cross-user access.
-- The application will handle store filtering.
