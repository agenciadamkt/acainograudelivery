-- ═══════════════════════════════════════════════════════════════
-- DIAGNÓSTICO — por que itallogeroncio@ e fabiobios@ não editam categorias
--
-- Rode ISTO ANTES do FIX. É só leitura, não altera nada.
-- Supabase → SQL Editor → cole tudo → Run. Me mande os 4 resultados.
--
-- Existem DOIS padrões de RLS concorrentes neste banco e eles usam
-- tabelas de vínculo DIFERENTES — por isso o diagnóstico importa:
--   A) user_manages_store()  → role em user_roles + stores.franchisee_user_id
--                              OU user_unidades          (usado em products)
--   B) FIX_TOPPINGS_RLS.sql  → user_profiles.perfil + user_profiles.unidade_id
--                              + nivel >= 3 no RBAC      (usado em toppings)
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Policies que existem HOJE em categories ──────────────────
-- (as migrations já divergiram do banco antes — esta é a verdade)
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'categories'
ORDER BY cmd, policyname;

-- ── 2. Como os dois usuários estão vinculados ───────────────────
SELECT
  u.email,
  u.id AS user_id,
  up.perfil,
  up.unidade_id                                   AS perfil_unidade_id,   -- padrão B
  s_perfil.name                                   AS perfil_unidade_nome,
  (SELECT string_agg(st.name, ', ')
     FROM user_unidades uu
     JOIN stores st ON st.id = uu.store_id
    WHERE uu.usuario_id = u.id)                   AS unidades_user_unidades, -- padrão A
  (SELECT string_agg(ur.role::text, ', ')
     FROM user_roles ur WHERE ur.user_id = u.id)  AS roles,
  (SELECT string_agg(st.name, ', ')
     FROM stores st WHERE st.franchisee_user_id = u.id) AS lojas_como_franqueado_titular
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
LEFT JOIN stores s_perfil  ON s_perfil.id = up.unidade_id
WHERE u.email IN ('itallogeroncio@gmail.com', 'fabiobios@gmail.com');

-- ── 3. Nível RBAC efetivo em 'cardapio.cats' ────────────────────
-- nivel >= 3 = "Ver + Criar + Editar". Se vier 1, o vínculo está certo
-- mas falta nível — aí o ajuste é em Usuários & Permissões, não em RLS.
SELECT
  u.email,
  uperm.nivel                          AS nivel_do_usuario,
  pperm.nivel                          AS nivel_do_perfil,
  COALESCE(uperm.nivel, pperm.nivel, 0) AS nivel_efetivo,
  CASE WHEN COALESCE(uperm.nivel, pperm.nivel, 0) >= 3
       THEN 'pode editar' ELSE 'SEM nivel de edicao' END AS veredito
FROM auth.users u
LEFT JOIN user_profiles up ON up.id = u.id
LEFT JOIN rbac_usuario_permissoes uperm
       ON uperm.usuario_id = u.id AND uperm.modulo_codigo = 'cardapio.cats'
LEFT JOIN rbac_perfil_permissoes pperm
       ON pperm.perfil = up.perfil AND pperm.modulo_codigo = 'cardapio.cats'
WHERE u.email IN ('itallogeroncio@gmail.com', 'fabiobios@gmail.com');

-- ── 4. O teste decisivo ─────────────────────────────────────────
-- products JÁ usa user_manages_store(); categories NÃO.
-- Se "products_ok" = true e a edição de categorias falha para o mesmo
-- usuário na mesma loja, está provado que o problema é só a policy de
-- categories ter ficado para trás.
SELECT
  u.email,
  s.name AS loja,
  public.user_manages_store(u.id, s.id) AS products_ok
FROM auth.users u
CROSS JOIN stores s
WHERE u.email IN ('itallogeroncio@gmail.com', 'fabiobios@gmail.com')
  AND s.name ILIKE '%gurupi%';
