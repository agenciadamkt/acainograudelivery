-- Add promotional_price column to product_sizes table for discounts
ALTER TABLE public.product_sizes ADD COLUMN IF NOT EXISTS promotional_price DECIMAL(10,2) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.product_sizes.promotional_price IS 'Preço promocional/com desconto. Se preenchido, o campo price passa a ser o preço original (riscado).';
