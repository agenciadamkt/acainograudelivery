-- ═══════════════════════════════════════════════════════════════
-- Corrige RLS de products: reconhecer vínculo de loja via user_unidades
--
-- Sintoma: itallogeroncio@gmail.com (perfil FRANQUEADO, role 'manager',
-- vinculado à loja "Gurupi/Teresina" via user_unidades) não conseguia
-- alterar nem excluir produtos.
--
-- Causa raiz: as policies reais em produção (diferentes da migration
-- 20260529124500_fix_products_and_sizes_rls.sql, que aparentemente
-- nunca chegou a ser aplicada neste banco) só reconhecem o vínculo
-- LEGADO `stores.franchisee_user_id`. A loja dele tem
-- franchisee_user_id = gurupi@acainograu.com.br (outro usuário) — ele
-- foi vinculado pelo sistema novo (user_unidades), que essas policies
-- nunca checavam. Resultado: nem "Users can update/delete their own
-- products (unified)" (auth.uid() = user_id, e todos os produtos têm
-- user_id nulo) nem "Staff pode gerenciar produtos da sua loja"
-- (checava só franchisee_user_id) liberavam o update/delete para ele.
--
-- Mantém o isolamento por loja (cada FRANQUEADO/COLABORADOR só
-- gerencia produtos da(s) loja(s) a que está vinculado).
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.user_manages_store(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    _store_id IS NOT NULL
    AND (
      public.has_role(_user_id, 'franchisee_master'::app_role)
      OR (
        (public.has_role(_user_id, 'admin'::app_role) OR public.has_role(_user_id, 'manager'::app_role))
        AND (
          EXISTS (SELECT 1 FROM public.stores s WHERE s.id = _store_id AND s.franchisee_user_id = _user_id)
          OR EXISTS (SELECT 1 FROM public.user_unidades uu WHERE uu.usuario_id = _user_id AND uu.store_id = _store_id)
        )
      )
    );
$$;

-- ── products ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Staff pode gerenciar produtos da sua loja" ON public.products;
DROP POLICY IF EXISTS "Users can insert their own products (unified)" ON public.products;
DROP POLICY IF EXISTS "Users can update their own products (unified)" ON public.products;
DROP POLICY IF EXISTS "Users can delete their own products (unified)" ON public.products;
DROP POLICY IF EXISTS "Users can view their own products (unified)" ON public.products;

CREATE POLICY "products_insert_store_staff"
  ON public.products FOR INSERT
  WITH CHECK (
    public.user_manages_store(auth.uid(), (SELECT c.store_id FROM public.categories c WHERE c.id = category_id))
  );

CREATE POLICY "products_update_store_staff"
  ON public.products FOR UPDATE
  USING (
    public.user_manages_store(auth.uid(), (SELECT c.store_id FROM public.categories c WHERE c.id = products.category_id))
  )
  WITH CHECK (
    public.user_manages_store(auth.uid(), (SELECT c.store_id FROM public.categories c WHERE c.id = category_id))
  );

CREATE POLICY "products_delete_store_staff"
  ON public.products FOR DELETE
  USING (
    public.user_manages_store(auth.uid(), (SELECT c.store_id FROM public.categories c WHERE c.id = products.category_id))
  );
