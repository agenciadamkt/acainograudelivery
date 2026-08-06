-- ═══════════════════════════════════════════════════════════════
-- FASE 3 — fecha chart_of_accounts e cost_centers
--
-- Sobraram abertas depois da fase 1 porque a policy delas não é
-- `USING (true)` e sim:
--
--     CREATE POLICY "Chart of accounts visibility" ... FOR SELECT
--         USING (active = true);
--     -- comentário original: "Base categories are public"
--     (supabase/migrations/20260312000002_remove_hardcoded_admin_bypass.sql)
--
-- Como o papel é {public} e a condição não olha o dono, qualquer pessoa
-- sem login lê a tabela inteira. Medido em produção: 84 linhas em
-- chart_of_accounts, 54 em cost_centers.
--
-- ── A premissa estava errada ────────────────────────────────────
-- A policy supõe que existem "categorias base" globais, compartilhadas
-- por todos. Contado em produção:
--
--     chart_of_accounts   globais = 0   de franqueado = 84
--     cost_centers        globais = 0   de franqueado = 54
--
-- Nenhuma linha é global. Todas têm dono. Não há nada de compartilhado
-- para manter público — a policy só vaza o plano de contas e a estrutura
-- de centros de custo de cada franqueado.
--
-- ── O que este script faz ───────────────────────────────────────
-- Apaga só as duas policies de "visibility". As demais continuam:
--   "Franchisee isolation Chart Accounts"  ALL {public}   (isola por dono)
--   "chart_of_accounts_owner"              ALL {authenticated} (fase 1)
--   equivalentes em cost_centers
--
-- Ou seja, o franqueado continua enxergando o que é dele. O que sai é a
-- leitura por quem não está logado.
--
-- Rodar no Supabase → SQL Editor. Idempotente.
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Chart of accounts visibility" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Cost centers visibility"      ON public.cost_centers;

-- ═══════════════════════════════════════════════════════════════
-- CONFERÊNCIA
-- ═══════════════════════════════════════════════════════════════

SELECT tablename, policyname, cmd, roles::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('chart_of_accounts', 'cost_centers')
ORDER BY tablename, cmd, policyname;

-- Depois de rodar, confirme por fora que o anônimo não lê mais.
-- No terminal, na raiz do projeto — as duas devem dar */0:
--
--   set -a && . ./.env && set +a
--   for t in chart_of_accounts cost_centers; do
--     printf "%-20s %s\n" "$t" "$(curl -s -I \
--       -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
--       -H 'Prefer: count=exact' -H 'Range: 0-0' \
--       "$VITE_SUPABASE_URL/rest/v1/$t?select=*" \
--       | grep -i content-range | awk '{print $2}')"
--   done
--
-- E na tela: abra Financeiro → lançamentos e confirme que o seletor de
-- plano de contas e o de centro de custo continuam listando as opções.
-- Se ficarem vazios, o vínculo esperado é franchisee_user_id = auth.uid();
-- cheque se as linhas daquele franqueado têm o campo preenchido.
