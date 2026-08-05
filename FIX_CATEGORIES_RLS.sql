-- ═══════════════════════════════════════════════════════════════
-- Corrige RLS de public.categories
--
-- Sintoma: em /admin/menu/categories, itallogeroncio@gmail.com e
-- fabiobios@gmail.com (ambos com acesso à loja "Açaí no Grau - Gurupi")
-- veem a lista mas não conseguem salvar edição/exclusão.
--
-- Causa: `categories` ficou com a policy de 2025-11-02, que só reconhece
-- o vínculo LEGADO `stores.franchisee_user_id`. É o mesmo bug já
-- corrigido em `products` (20260617140000) e em `toppings`
-- (FIX_TOPPINGS_RLS.sql) — categories nunca foi atualizada.
--
-- ⚠️ RODE ANTES: DIAGNOSTICO_CATEGORIES_RLS.sql
--    Se a consulta 3 mostrar nivel_efetivo < 3, o problema NÃO é este
--    arquivo — é o nível do módulo 'cardapio.cats' em Usuários &
--    Permissões. Este script respeita esse nível de propósito.
--
-- Este banco tem DOIS padrões de vínculo concorrentes, com tabelas
-- diferentes. As funções abaixo aceitam a UNIÃO dos dois, para funcionar
-- independentemente de como cada usuário foi cadastrado:
--   · stores.franchisee_user_id   (legado)
--   · user_unidades               (multi-loja, padrão de products)
--   · user_profiles.unidade_id    (padrão de toppings)
--
-- Modelo de acesso resultante (mantém o isolamento por loja):
--   · MASTER / franchisee_master          → todas as lojas
--   · FRANQUEADO (admin/manager) da loja  → ver e editar sua(s) loja(s)
--   · COLABORADOR da loja                 → ver com nivel >= 1
--                                           editar só com nivel >= 3
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Vínculo usuário↔loja, pelos três caminhos que coexistem ──
-- Precisa ser criada ANTES da função que a usa: o Postgres valida o
-- corpo de funções LANGUAGE sql no momento do CREATE.
CREATE OR REPLACE FUNCTION public.user_linked_to_store(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    _user_id IS NOT NULL
    AND _store_id IS NOT NULL
    AND (
      EXISTS (SELECT 1 FROM public.stores s
               WHERE s.id = _store_id AND s.franchisee_user_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.user_unidades uu
                  WHERE uu.usuario_id = _user_id AND uu.store_id = _store_id)
      OR EXISTS (SELECT 1 FROM public.user_profiles up
                  WHERE up.id = _user_id AND up.unidade_id = _store_id)
    );
$$;

-- ── 2. Acesso a um módulo do RBAC numa loja, com nível mínimo ───
-- _min_nivel: 1 = ver, 3 = editar. Recebe o módulo como parâmetro para
-- poder ser reaproveitada em product_sizes, coupons etc.
CREATE OR REPLACE FUNCTION public.user_can_access_store_module(
  _user_id   uuid,
  _store_id  uuid,
  _modulo    text,
  _min_nivel int
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    -- MASTER, pelos dois cadastros possíveis
    public.has_role(_user_id, 'franchisee_master'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = _user_id AND up.perfil = 'MASTER'
    )
    OR (
      public.user_linked_to_store(_user_id, _store_id)
      AND (
        -- Franqueado/gerente da loja: acesso pleno ao cardápio dela
        public.has_role(_user_id, 'admin'::app_role)
        OR public.has_role(_user_id, 'manager'::app_role)
        -- Colaborador: depende do nível configurado no módulo
        OR COALESCE(
             (SELECT uperm.nivel FROM public.rbac_usuario_permissoes uperm
               WHERE uperm.usuario_id = _user_id
                 AND uperm.modulo_codigo = _modulo),
             (SELECT pperm.nivel FROM public.rbac_perfil_permissoes pperm
               JOIN public.user_profiles up2 ON up2.id = _user_id
               WHERE pperm.perfil = up2.perfil
                 AND pperm.modulo_codigo = _modulo),
             0
           ) >= _min_nivel
      )
    );
$$;

-- ── 3. Policies de categories ───────────────────────────────────
DROP POLICY IF EXISTS "Staff pode gerenciar categorias da sua loja" ON public.categories;
DROP POLICY IF EXISTS "Staff autenticado pode gerenciar categorias" ON public.categories;

-- Idempotência: permite rodar o script de novo sem erro de "policy already
-- exists". Se a consulta 1 do diagnóstico mostrar alguma policy de escrita
-- com nome diferente destes, apague-a também — policies são permissivas e
-- se somam por OR, então uma sobra manteria a regra antiga valendo em
-- paralelo (não trava o fix, mas mantém a brecha do modelo legado).
DROP POLICY IF EXISTS "categories_select_store_staff" ON public.categories;
DROP POLICY IF EXISTS "categories_insert_store_staff" ON public.categories;
DROP POLICY IF EXISTS "categories_update_store_staff" ON public.categories;
DROP POLICY IF EXISTS "categories_delete_store_staff" ON public.categories;

-- SELECT com nível 1: quem só tem "Visualizar" continua abrindo a tela e
-- enxergando também as categorias INATIVAS (a policy pública, que segue
-- intacta para o app de delivery, só devolve active = true).
CREATE POLICY "categories_select_store_staff"
  ON public.categories FOR SELECT TO authenticated
  USING (public.user_can_access_store_module(auth.uid(), store_id, 'cardapio.cats', 1));

CREATE POLICY "categories_insert_store_staff"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_store_module(auth.uid(), store_id, 'cardapio.cats', 3));

-- WITH CHECK explícito: sem ele o Postgres reaproveita o USING e seria
-- possível "mover" uma categoria para uma loja que o usuário não administra.
CREATE POLICY "categories_update_store_staff"
  ON public.categories FOR UPDATE TO authenticated
  USING      (public.user_can_access_store_module(auth.uid(), store_id, 'cardapio.cats', 3))
  WITH CHECK (public.user_can_access_store_module(auth.uid(), store_id, 'cardapio.cats', 3));

CREATE POLICY "categories_delete_store_staff"
  ON public.categories FOR DELETE TO authenticated
  USING (public.user_can_access_store_module(auth.uid(), store_id, 'cardapio.cats', 3));

-- ── 4. Confirmação: deve voltar true nas duas colunas ───────────
SELECT u.email, s.name AS loja,
       public.user_can_access_store_module(u.id, s.id, 'cardapio.cats', 1) AS pode_ver,
       public.user_can_access_store_module(u.id, s.id, 'cardapio.cats', 3) AS pode_editar
FROM auth.users u
CROSS JOIN public.stores s
WHERE u.email IN ('itallogeroncio@gmail.com', 'fabiobios@gmail.com')
  AND s.name ILIKE '%gurupi%';

-- ═══════════════════════════════════════════════════════════════
-- NÃO INCLUÍDO DE PROPÓSITO — mesma dívida, decisão sua
--
-- Estas tabelas têm EXATAMENTE a mesma policy legada de 2025-11-02 e
-- vão falhar igual assim que esses usuários mexerem nelas. Não alterei
-- porque mudar RLS de estoque/financeiro sem você pedir é arriscado:
--   · product_sizes    → 'cardapio.produtos'
--   · coupons          → 'cardapio.promo'
--   · inventory_items  → 'est.central'
--   · delivery_drivers → 'op.entregas'
--
-- Todas seguem o mesmo formato das policies acima, trocando o módulo e
-- o caminho até o store_id. Me avise que eu escrevo o script.
-- ═══════════════════════════════════════════════════════════════
