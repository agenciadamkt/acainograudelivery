-- Add zipcode column to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS zipcode TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.stores.zipcode IS 'CEP da loja';
