-- Create table if not exists (safely)
CREATE TABLE IF NOT EXISTS public.product_topping_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  topping_category_id UUID NOT NULL REFERENCES public.topping_categories(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(product_id, topping_category_id)
);

-- Add columns safely
ALTER TABLE public.product_topping_categories
ADD COLUMN IF NOT EXISTS min_quantity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Enable RLS
ALTER TABLE public.product_topping_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts and recreate them
DROP POLICY IF EXISTS "Enable read access for all users" ON public.product_topping_categories;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.product_topping_categories;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.product_topping_categories;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.product_topping_categories;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.product_topping_categories;

-- Recreate policies
CREATE POLICY "Enable read access for all users" ON public.product_topping_categories
    FOR SELECT USING (true);

CREATE POLICY "Enable all access for authenticated users" ON public.product_topping_categories
    FOR ALL USING (auth.role() = 'authenticated');
