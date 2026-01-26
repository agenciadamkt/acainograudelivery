-- Enable RLS for product_sizes
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

-- Drop exist policy if exists
DROP POLICY IF EXISTS "Public read access for product_sizes" ON public.product_sizes;

-- Recreate policy for public read access
CREATE POLICY "Public read access for product_sizes" 
ON public.product_sizes FOR SELECT USING (true);
