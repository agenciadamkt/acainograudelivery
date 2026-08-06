-- ═══════════════════════════════════════════════════════════════
-- 🚨 URGENTE — dados financeiros legíveis SEM LOGIN
--
-- Verificado em 2026-08-06 contra produção, com a chave publicável
-- (a mesma que está dentro do bundle JS do app, extraível por qualquer um)
-- e SEM nenhuma autenticação:
--
--   financial_audit_logs      822 linhas
--   financial_records         363 linhas
--   chart_of_accounts          84 linhas
--   cost_centers               54 linhas
--   financial_users             6 linhas
--   financial_goals             1 linha
--
-- Várias dessas policies são `FOR ALL TO public`, ou seja, não é só
-- leitura — permite escrever e apagar também.
--
-- CAUSA: policies do Postgres são PERMISSIVAS e se somam por OR. A
-- migration 20260304000000_financial_isolation.sql criou as policies
-- corretas, mas as antigas e abertas ("Allow All", "Everyone views...")
-- nunca foram apagadas. Basta UMA aberta para anular todas as restritas.
--
-- ESCOPO: só tabelas financeiras, todas exclusivas do /admin — verificado
-- que nenhuma é usada pelo app público de delivery. Fechar aqui NÃO
-- quebra o cardápio, o checkout nem o app do motorista.
--
-- NÃO inclui `orders`, `customers`, `delivery_drivers` e
-- `manual_delivery_orders`, que também estão abertas mas são usadas por
-- fluxos anônimos legítimos (checkout sem login, app do entregador).
-- Fechar essas exige entender cada fluxo antes — está na fase 2.
--
-- Rodar no Supabase → SQL Editor. Idempotente.
-- ═══════════════════════════════════════════════════════════════

-- ── Helper: é master? ───────────────────────────────────────────
-- A migration original checava e-mail no JWT, o que é frágil. Aqui a
-- checagem é por papel, mantendo os dois e-mails como reserva para não
-- travar quem já dependia deles.
CREATE OR REPLACE FUNCTION public.is_master_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    public.has_role(auth.uid(), 'franchisee_master'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.perfil = 'MASTER'
    )
    OR (auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com');
$$;

-- ═══════════════════════════════════════════════════════════════
-- GRUPO A — já existe policy correta; basta remover a aberta
--
-- `financial_records` e `financial_goals` foram cobertas pela migration
-- de isolamento. As policies restritas continuam lá; apagar as abertas
-- devolve o isolamento sem precisar escrever regra nova.
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Allow All"                ON public.financial_records;
DROP POLICY IF EXISTS "financial_goals_select"   ON public.financial_goals;
DROP POLICY IF EXISTS "financial_goals_update"   ON public.financial_goals;
DROP POLICY IF EXISTS "financial_goals_delete"   ON public.financial_goals;

-- ═══════════════════════════════════════════════════════════════
-- GRUPO B — não há policy correta; a aberta é substituída
--
-- Estas quatro ficaram de fora da migration de isolamento. Aqui a
-- policy aberta sai e entra uma equivalente restrita — se só apagássemos,
-- a tela financeira do admin pararia de carregar.
-- ═══════════════════════════════════════════════════════════════

-- ── chart_of_accounts (plano de contas) ──
DROP POLICY IF EXISTS "Everyone views chart of accounts"        ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Authenticated updates chart of accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "chart_of_accounts_owner"                 ON public.chart_of_accounts;

CREATE POLICY "chart_of_accounts_owner"
  ON public.chart_of_accounts FOR ALL TO authenticated
  USING      (franchisee_user_id = auth.uid() OR public.is_master_user())
  WITH CHECK (franchisee_user_id = auth.uid() OR public.is_master_user());

-- ── cost_centers (centros de custo) ──
DROP POLICY IF EXISTS "Everyone views cost centers"        ON public.cost_centers;
DROP POLICY IF EXISTS "Authenticated updates cost centers" ON public.cost_centers;
DROP POLICY IF EXISTS "cost_centers_owner"                 ON public.cost_centers;

CREATE POLICY "cost_centers_owner"
  ON public.cost_centers FOR ALL TO authenticated
  USING      (franchisee_user_id = auth.uid() OR public.is_master_user())
  WITH CHECK (franchisee_user_id = auth.uid() OR public.is_master_user());

-- ── financial_users (operadores do financeiro) ──
DROP POLICY IF EXISTS "Allow All"              ON public.financial_users;
DROP POLICY IF EXISTS "financial_users_owner"  ON public.financial_users;

CREATE POLICY "financial_users_owner"
  ON public.financial_users FOR ALL TO authenticated
  USING      (user_id = auth.uid() OR public.is_master_user())
  WITH CHECK (user_id = auth.uid() OR public.is_master_user());

-- ── financial_audit_logs (trilha de auditoria) ──
-- Só leitura pelo dono; a gravação fica com a service role. Trilha de
-- auditoria que o próprio usuário pode reescrever não serve de trilha.
DROP POLICY IF EXISTS "Allow All"                       ON public.financial_audit_logs;
DROP POLICY IF EXISTS "Everyone views logs"             ON public.financial_audit_logs;
DROP POLICY IF EXISTS "financial_audit_logs_owner_read" ON public.financial_audit_logs;

CREATE POLICY "financial_audit_logs_owner_read"
  ON public.financial_audit_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_master_user());

-- ═══════════════════════════════════════════════════════════════
-- CONFERÊNCIA — rode logo depois
-- ═══════════════════════════════════════════════════════════════

-- 1. Nenhuma linha deve sobrar aqui (nenhuma policy aberta nas financeiras):
SELECT tablename, policyname, cmd, roles::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('financial_records','financial_users','financial_audit_logs',
                    'chart_of_accounts','cost_centers','financial_goals')
  AND btrim(coalesce(qual,'')) = 'true'
ORDER BY tablename;

-- 2. O que ficou valendo:
SELECT tablename, policyname, cmd, roles::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('financial_records','financial_users','financial_audit_logs',
                    'chart_of_accounts','cost_centers','financial_goals')
ORDER BY tablename, cmd;

-- 3. DEPOIS de rodar, confirme por fora que o anônimo não lê mais nada.
--    No terminal, na raiz do projeto — deve dar */0 em todas:
--
--    set -a && . ./.env && set +a
--    for t in financial_records financial_users financial_audit_logs \
--             chart_of_accounts cost_centers financial_goals; do
--      printf "%-24s %s\n" "$t" "$(curl -s -I \
--        -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" \
--        -H 'Prefer: count=exact' -H 'Range: 0-0' \
--        "$VITE_SUPABASE_URL/rest/v1/$t?select=*" | grep -i content-range | awk '{print $2}')"
--    done
--
-- 4. E confirme na tela: abra Financeiro no admin e veja se os lançamentos,
--    o plano de contas e os centros de custo continuam carregando.
--    Se algo sumir, o vínculo esperado é `franchisee_user_id = auth.uid()` —
--    cheque se as linhas daquele franqueado têm esse campo preenchido.
