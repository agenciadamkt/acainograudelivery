-- Add configuration columns to product_topping_categories
ALTER TABLE public.product_topping_categories
ADD COLUMN IF NOT EXISTS min_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
