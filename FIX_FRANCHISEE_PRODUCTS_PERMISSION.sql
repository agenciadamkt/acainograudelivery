-- ============================================================================
-- FIX: quem tem permissão de Catálogo (mas.catalogo) não conseguia salvar
-- alterações em produtos/categorias de franquia (ex: mudar status p/ Inativo).
--
-- Causa raiz: a RLS de `franchisee_products` / `franchisee_product_categories`
-- liberava escrita SÓ para `is_admin_master()` (e-mail fixo agenciadamkt@ ou
-- financial_users role=admin). Usuários com permissão RBAC de catálogo (nível
-- 3/4 em `mas.catalogo`) tinham o UPDATE bloqueado pela política — 0 linhas
-- afetadas, SEM erro → a tela "salva" mas nada muda.
--
-- Correção: honrar a permissão de módulo do RBAC do app na RLS.
-- Níveis (lib/permissions.ts): 3 = Editar, 4 = Acesso Total. Escrita exige >= 3.
-- ============================================================================

-- Nível efetivo do usuário logado num módulo do RBAC:
-- override por usuário (rbac_usuario_permissoes) tem precedência sobre o
-- padrão do perfil (rbac_perfil_permissoes); sem registro = 0.
CREATE OR REPLACE FUNCTION public.user_module_nivel(p_codigo text)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT nivel
       FROM public.rbac_usuario_permissoes
      WHERE usuario_id = auth.uid()
        AND modulo_codigo = p_codigo
      LIMIT 1),
    (SELECT rp.nivel
       FROM public.rbac_perfil_permissoes rp
       JOIN public.user_profiles up ON up.perfil::text = rp.perfil::text
      WHERE up.id = auth.uid()
        AND rp.modulo_codigo = p_codigo
      LIMIT 1),
    0
  );
$$;

-- Helper booleano (>= nível mínimo).
CREATE OR REPLACE FUNCTION public.can_module(p_codigo text, p_min int)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin_master() OR public.user_module_nivel(p_codigo) >= p_min;
$$;

-- ── Produtos de franquia ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage products" ON public.franchisee_products;
DROP POLICY IF EXISTS "Manage products with catalog permission" ON public.franchisee_products;
CREATE POLICY "Manage products with catalog permission"
  ON public.franchisee_products FOR ALL
  USING (public.can_module('mas.catalogo', 3))
  WITH CHECK (public.can_module('mas.catalogo', 3));

-- ── Categorias de produtos de franquia (mesma página / mesmo gate) ───────────
DROP POLICY IF EXISTS "Admins can manage categories" ON public.franchisee_product_categories;
DROP POLICY IF EXISTS "Manage categories with catalog permission" ON public.franchisee_product_categories;
CREATE POLICY "Manage categories with catalog permission"
  ON public.franchisee_product_categories FOR ALL
  USING (public.can_module('mas.catalogo', 3))
  WITH CHECK (public.can_module('mas.catalogo', 3));

-- Nota: o SELECT (leitura) já é liberado por políticas próprias existentes;
-- aqui só ajustamos a ESCRITA (INSERT/UPDATE/DELETE).
