-- ═══════════════════════════════════════════════════════════════
-- 🐛 As permissões POR PERFIL nunca funcionaram
--
-- `public.rbac_perfil_permissoes` está com RLS ligada e SEM NENHUMA
-- POLICY. No Postgres isso significa negar para todo mundo — não é
-- "aberto", é "fechado para todos", inclusive usuários autenticados.
--
-- ── Por que ninguém percebeu ────────────────────────────────────
-- src/contexts/PermissionContext.tsx, função load():
--
--   2. defaults ← rbac_perfil_permissoes   ← RLS bloqueia, volta vazio
--   3. custom   ← rbac_usuario_permissoes  ← tem policy, funciona
--   4. merged = { ...defaults, ...custom } ← sobra só o custom
--
-- E o `nivel()` tem atalho para MASTER:
--
--   if (profile?.perfil === 'MASTER') return 4;
--
-- Ou seja: quem é MASTER nunca vê o problema. Só FRANQUEADO e
-- COLABORADOR são afetados — e para eles a falha é silenciosa, porque
-- RLS devolve lista vazia em vez de erro, então nem o catch dispara.
--
-- ── O efeito prático ────────────────────────────────────────────
-- Tudo que você configura na aba de permissões POR PERFIL não vale
-- nada. Só as permissões atribuídas individualmente, usuário por
-- usuário, chegam a funcionar. É provável que parte dos ajustes manuais
-- feitos até hoje tenha sido para compensar exatamente isso.
--
-- ── A correção ──────────────────────────────────────────────────
-- `rbac_perfil_permissoes` é tabela de CONFIGURAÇÃO: (perfil,
-- modulo_codigo, nivel). Não tem dado de loja nem de cliente — é o mapa
-- de "que perfil enxerga que módulo". Qualquer usuário logado pode ler
-- sem risco; alterar continua restrito a MASTER.
--
-- Rodar no Supabase → SQL Editor. Idempotente.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.rbac_perfil_permissoes ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado. É o que destrava o PermissionContext.
DROP POLICY IF EXISTS rbac_perfil_permissoes_read ON public.rbac_perfil_permissoes;
CREATE POLICY rbac_perfil_permissoes_read
  ON public.rbac_perfil_permissoes FOR SELECT TO authenticated
  USING (true);

-- Escrita: só MASTER. Sem isso, quem tivesse acesso à tela poderia
-- elevar o próprio perfil — a tabela é o que define quem pode o quê.
DROP POLICY IF EXISTS rbac_perfil_permissoes_manage ON public.rbac_perfil_permissoes;
CREATE POLICY rbac_perfil_permissoes_manage
  ON public.rbac_perfil_permissoes FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'franchisee_master'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_profiles up
               WHERE up.id = auth.uid() AND up.perfil = 'MASTER')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'franchisee_master'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_profiles up
               WHERE up.id = auth.uid() AND up.perfil = 'MASTER')
  );

-- ── rbac_modulos: mesmo estado, sem impacto hoje ────────────────
-- Também está com RLS e sem policy, mas nenhum código do client a lê
-- (o catálogo de módulos é a constante MODULOS em src/lib/permissions.ts).
-- A policy abaixo evita que isso vire uma surpresa se algum dia a tela
-- passar a ler do banco. Só leitura; a tabela é catálogo.
ALTER TABLE public.rbac_modulos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rbac_modulos_read ON public.rbac_modulos;
CREATE POLICY rbac_modulos_read
  ON public.rbac_modulos FOR SELECT TO authenticated
  USING (true);

-- ═══════════════════════════════════════════════════════════════
-- CONFERÊNCIA
-- ═══════════════════════════════════════════════════════════════

-- 1. As policies devem aparecer:
SELECT tablename, policyname, cmd, roles::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('rbac_perfil_permissoes', 'rbac_modulos')
ORDER BY tablename, cmd;

-- 2. O que está configurado por perfil (agora deve retornar linhas):
SELECT perfil, count(*) AS modulos_configurados
FROM public.rbac_perfil_permissoes
GROUP BY perfil
ORDER BY perfil;

-- Se a consulta 2 vier VAZIA, a tabela nunca foi populada — aí não é só
-- RLS: a configuração por perfil também precisa ser preenchida na tela
-- Usuários & Permissões.

-- 3. Teste na interface, que é o que vale:
--    entre com um usuário FRANQUEADO (ex.: itallogeroncio@gmail.com) e
--    confira se os itens de menu que dependem de permissão de perfil
--    voltaram a aparecer. Antes deste fix, só valiam as permissões
--    atribuídas individualmente àquele usuário.
