-- Corrige permissões para tabela product_sizes
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

-- Garante que qualquer um pode ver (para o cardápio funcionar)
DROP POLICY IF EXISTS "Public read access for product_sizes" ON public.product_sizes;
CREATE POLICY "Public read access for product_sizes" 
ON public.product_sizes FOR SELECT USING (true);

-- Garante que usuários autenticados (admin) podem gerenciar
DROP POLICY IF EXISTS "Authenticated users can manage product_sizes" ON public.product_sizes;
CREATE POLICY "Authenticated users can manage product_sizes"
ON public.product_sizes
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');
