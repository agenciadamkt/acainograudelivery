-- ═══════════════════════════════════════════════════════════════
-- Correção de RLS para Tabelas Products e Product_Sizes
-- ═══════════════════════════════════════════════════════════════

-- ── 1. LIMPEZA DE POLICIES ANTIGAS (PRODUCTS) ──────────────────
DROP POLICY IF EXISTS "Todos podem ver produtos ativos" ON public.products;
DROP POLICY IF EXISTS "Staff autenticado pode gerenciar produtos" ON public.products;
DROP POLICY IF EXISTS "Todos podem ver produtos ativos da loja" ON public.products;
DROP POLICY IF EXISTS "Staff pode gerenciar produtos da sua loja" ON public.products;
DROP POLICY IF EXISTS "Public read access for products" ON public.products;
DROP POLICY IF EXISTS "Users can view their own products (unified)" ON public.products;
DROP POLICY IF EXISTS "Users can insert their own products (unified)" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products (unified)" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products (unified)" ON public.products;
DROP POLICY IF EXISTS "Allow products insert for master and managers" ON public.products;
DROP POLICY IF EXISTS "Allow products update for master and managers" ON public.products;
DROP POLICY IF EXISTS "Allow products delete for master and managers" ON public.products;
DROP POLICY IF EXISTS "products_read_all" ON public.products;
DROP POLICY IF EXISTS "products_insert_policy" ON public.products;
DROP POLICY IF EXISTS "products_update_policy" ON public.products;
DROP POLICY IF EXISTS "products_delete_policy" ON public.products;

-- Garante que RLS está habilitado
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ── 2. NOVAS POLICIES PARA PRODUCTS (SEM RECURSÃO) ─────────────

-- SELECT: Qualquer pessoa (incluindo clientes) pode ver os produtos
CREATE POLICY "products_read_all"
  ON public.products FOR SELECT
  USING (true);

-- INSERT: Permite inserção para MASTER, FRANQUEADO ou criador
CREATE POLICY "products_insert_policy"
  ON public.products FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('franchisee_master', 'admin', 'manager')
    )
    OR auth.uid() = user_id
  );

-- UPDATE: Permite edição para MASTER, FRANQUEADO ou criador
CREATE POLICY "products_update_policy"
  ON public.products FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('franchisee_master', 'admin', 'manager')
    )
    OR auth.uid() = user_id
  );

-- DELETE: Permite exclusão para MASTER, FRANQUEADO ou criador
CREATE POLICY "products_delete_policy"
  ON public.products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('franchisee_master', 'admin', 'manager')
    )
    OR auth.uid() = user_id
  );


-- ── 3. LIMPEZA DE POLICIES ANTIGAS (PRODUCT_SIZES) ─────────────
DROP POLICY IF EXISTS "Todos podem ver tamanhos ativos" ON public.product_sizes;
DROP POLICY IF EXISTS "Staff autenticado pode gerenciar tamanhos" ON public.product_sizes;
DROP POLICY IF EXISTS "Todos podem ver tamanhos ativos da loja" ON public.product_sizes;
DROP POLICY IF EXISTS "Staff pode gerenciar tamanhos da sua loja" ON public.product_sizes;
DROP POLICY IF EXISTS "product_sizes_read_all" ON public.product_sizes;
DROP POLICY IF EXISTS "product_sizes_insert_policy" ON public.product_sizes;
DROP POLICY IF EXISTS "product_sizes_update_policy" ON public.product_sizes;
DROP POLICY IF EXISTS "product_sizes_delete_policy" ON public.product_sizes;

-- Garante que RLS está habilitado
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

-- ── 4. NOVAS POLICIES PARA PRODUCT_SIZES (SEM RECURSÃO) ─────────

-- SELECT: Qualquer pessoa pode ver os tamanhos
CREATE POLICY "product_sizes_read_all"
  ON public.product_sizes FOR SELECT
  USING (true);

-- INSERT: Permite inserção para MASTER ou FRANQUEADO
CREATE POLICY "product_sizes_insert_policy"
  ON public.product_sizes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('franchisee_master', 'admin', 'manager')
    )
  );

-- UPDATE: Permite edição para MASTER ou FRANQUEADO
CREATE POLICY "product_sizes_update_policy"
  ON public.product_sizes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('franchisee_master', 'admin', 'manager')
    )
  );

-- DELETE: Permite exclusão para MASTER ou FRANQUEADO
CREATE POLICY "product_sizes_delete_policy"
  ON public.product_sizes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('franchisee_master', 'admin', 'manager')
    )
  );
