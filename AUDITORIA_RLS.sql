-- ═══════════════════════════════════════════════════════════════
-- Auditoria de RLS — quais tabelas realmente estão abertas entre lojas
--
-- Só LEITURA. Não altera nada. Rode no Supabase → SQL Editor.
--
-- Contexto: a varredura dos arquivos .sql encontrou `USING (true)` em 29
-- scripts da raiz e 12+ migrations. Mas arquivo não é a verdade — produção
-- já divergiu das migrations antes (foi assim no caso de `categories`).
-- Só `pg_policies` diz o que vale hoje.
--
-- Já verificado por fora, com a chave publicável e SEM login: nenhuma das
-- tabelas suspeitas devolve linha para usuário anônimo. Ou seja, não há
-- vazamento para a internet. O que falta apurar é o caso do usuário
-- AUTENTICADO de uma loja enxergando dados de outra.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. O veredito: policies permissivas em tabelas com dono ────────
--
-- Lista as policies cujo USING é literalmente `true` em tabelas que têm
-- coluna de loja/empresa. Cada linha aqui é uma tabela onde um franqueado
-- logado enxerga os dados de todos os outros.
SELECT
  p.tablename,
  p.policyname,
  p.cmd,
  p.roles::text                                   AS aplica_a,
  c.coluna_dono,
  CASE
    WHEN p.qual IS NULL           THEN 'sem USING (só WITH CHECK)'
    WHEN btrim(p.qual) = 'true'   THEN '🔴 ABERTA — vê todas as lojas'
    ELSE                               '🟢 restrita'
  END                                             AS veredito
FROM pg_policies p
JOIN LATERAL (
  SELECT string_agg(a.attname, ', ') AS coluna_dono
  FROM pg_attribute a
  WHERE a.attrelid = (quote_ident(p.schemaname) || '.' || quote_ident(p.tablename))::regclass
    AND a.attnum > 0 AND NOT a.attisdropped
    AND a.attname IN ('store_id', 'company_id', 'franchisee_user_id', 'user_id')
) c ON TRUE
WHERE p.schemaname = 'public'
  AND c.coluna_dono IS NOT NULL          -- só tabelas que TÊM dono
  AND btrim(coalesce(p.qual, '')) = 'true'
ORDER BY p.tablename, p.cmd;

-- ── 2. Quais dessas tabelas têm dado de verdade ────────────────────
--
-- Tabela vazia é urgência baixa; tabela cheia é urgência alta.
-- Usa query_to_xml para contar várias tabelas numa tacada só, em vez de
-- repetir catorze SELECT count(*).
SELECT
  t.tablename,
  (xpath('/row/c/text()',
         query_to_xml(format('SELECT count(*) AS c FROM public.%I', t.tablename),
                      false, true, '')))[1]::text::bigint AS linhas
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'financial_receipts', 'crm_leads', 'crm_atendimentos', 'crm_activities',
    'checkgrau_messages', 'checkgrau_notifications', 'checkgrau_points',
    'checkgrau_collaborators', 'inventory_audits', 'inventory_recurring_counts',
    'sectors', 'shifts', 'notification_logs', 'operation_alert_settings'
  )
ORDER BY 2 DESC NULLS LAST;

-- ── 3. Panorama: toda tabela com RLS ligada e nenhuma policy ───────
--
-- RLS ativa sem policy nenhuma = ninguém lê nada (nem o dono). Costuma ser
-- tabela que só a service role acessa — mas às vezes é tela quebrada que
-- ninguém reportou ainda.
SELECT c.relname AS tabela_sem_policy
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = c.relname
  )
ORDER BY 1;

-- ═══════════════════════════════════════════════════════════════
-- Como ler o resultado
--
-- Consulta 1 vazia  → nenhuma tabela com dono está aberta. Os `USING (true)`
--                     dos arquivos foram substituídos no banco. Nada a fazer.
--
-- Consulta 1 com linhas → cada uma é uma tabela onde franqueado logado vê
--                     dados dos outros. Cruze com a consulta 2: as que têm
--                     muitas linhas entram primeiro na fila de correção.
--
-- O padrão de correção já está pronto e testado em
-- FIX_RLS_AI_ANALYSIS_E_NOTAS.sql — basta trocar a tabela e o caminho até
-- o store_id, usando public.user_manages_store_any(auth.uid(), store_id).
-- ═══════════════════════════════════════════════════════════════
