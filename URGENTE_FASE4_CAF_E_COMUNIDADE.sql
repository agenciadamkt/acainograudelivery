-- ═══════════════════════════════════════════════════════════════
-- FASE 4 — fecha caf_atendimentos e a comunidade
--
-- Encontradas ao testar TODAS as tabelas contra o anônimo, em vez de
-- confiar no filtro `qual = 'true'` (que já tinha deixado passar
-- chart_of_accounts e cost_centers).
--
-- Medido em produção, sem login:
--   caf_atendimentos   15 linhas
--   community_posts     9 linhas
--   community_likes    17 linhas
--
-- ── Por que caf_atendimentos importa ────────────────────────────
-- Campos da tabela: protocolo, loja_franqueada, codigo_loja, cidade,
-- estado, solicitante_nome, solicitante_cargo, categoria, descricao,
-- solucao, atendente_nome, satisfacao_token...
--
-- É a comunicação interna entre franqueado e franqueadora — quem
-- reclamou do quê, o que foi respondido, com nome e cargo. E as telas
-- que leem isso (/admin/caf/*) são todas isMasterOnly. Nada nisso
-- deveria ser legível sem login.
--
-- ── O que NÃO está aqui, e por quê ──────────────────────────────
-- Estas continuam públicas DE PROPÓSITO — o app de delivery precisa
-- lê-las sem login, é o cardápio:
--   stores (35) · delivery_areas (7) · products (17)
--   toppings (148) · topping_categories (10)
-- Fechar qualquer uma derruba o site do cliente.
--
-- Rodar no Supabase → SQL Editor. Idempotente.
-- ═══════════════════════════════════════════════════════════════

-- ── caf_atendimentos ────────────────────────────────────────────
-- Master vê tudo; franqueado vê os chamados da própria loja (é ele
-- quem abre). Ninguém sem login vê nada.
DROP POLICY IF EXISTS "auth_all_caf_atendimentos"    ON public.caf_atendimentos;
DROP POLICY IF EXISTS "anon_select_caf_atendimentos" ON public.caf_atendimentos;
DROP POLICY IF EXISTS caf_atendimentos_acesso        ON public.caf_atendimentos;

CREATE POLICY caf_atendimentos_acesso
  ON public.caf_atendimentos FOR ALL TO authenticated
  USING (
    public.is_master_user()
    OR public.user_manages_store_any(auth.uid(), store_id)
  )
  WITH CHECK (
    public.is_master_user()
    OR public.user_manages_store_any(auth.uid(), store_id)
  );

-- ── comunidade ──────────────────────────────────────────────────
-- É um feed interno entre franqueados: faz sentido todo mundo LOGADO
-- ler e curtir. O que não faz sentido é ser legível pela internet.
-- Escrita continua limitada ao autor.
DROP POLICY IF EXISTS "Public read posts"     ON public.community_posts;
DROP POLICY IF EXISTS community_posts_read    ON public.community_posts;
CREATE POLICY community_posts_read
  ON public.community_posts FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Likes visible to all"  ON public.community_likes;
DROP POLICY IF EXISTS community_likes_read    ON public.community_likes;
CREATE POLICY community_likes_read
  ON public.community_likes FOR SELECT TO authenticated
  USING (true);

-- ═══════════════════════════════════════════════════════════════
-- CONFERÊNCIA
-- ═══════════════════════════════════════════════════════════════

SELECT tablename, policyname, cmd, roles::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('caf_atendimentos', 'community_posts', 'community_likes')
ORDER BY tablename, cmd, policyname;

-- Depois de rodar, no terminal (raiz do projeto). As três devem dar */0,
-- e as cinco do cardápio devem CONTINUAR com linhas:
--
--   set -a && . ./.env && set +a
--   for t in caf_atendimentos community_posts community_likes \
--            stores delivery_areas products toppings topping_categories; do
--     printf "%-22s %s\n" "$t" "$(curl -s -I \
--       -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
--       -H 'Prefer: count=exact' -H 'Range: 0-0' \
--       "$VITE_SUPABASE_URL/rest/v1/$t?select=*" \
--       | grep -i content-range | awk '{print $2}')"
--   done
--
-- Na interface: abra /admin/caf/atendimentos como MASTER e confirme que
-- os chamados continuam listando; abra a Comunidade e veja se os posts
-- aparecem. Se o CAF ficar vazio, cheque se os chamados têm store_id
-- preenchido — a policy depende dele para o caso do franqueado.
