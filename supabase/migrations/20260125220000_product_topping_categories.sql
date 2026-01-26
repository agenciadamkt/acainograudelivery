-- Create a join table for products and topping categories
CREATE TABLE IF NOT EXISTS public.product_topping_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  topping_category_id UUID NOT NULL REFERENCES public.topping_categories(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(product_id, topping_category_id)
);

-- Add simple RLS policies
ALTER TABLE public.product_topping_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.product_topping_categories
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.product_topping_categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.product_topping_categories
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users only" ON public.product_topping_categories
    FOR DELETE USING (auth.role() = 'authenticated');
