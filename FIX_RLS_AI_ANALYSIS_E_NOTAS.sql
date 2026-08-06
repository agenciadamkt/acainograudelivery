-- ═══════════════════════════════════════════════════════════════
-- Corrige RLS de public.ai_analysis e public.checkgrau_collaborator_notes
--
-- Ambas nasceram com a policy mais permissiva possível:
--
--     FOR ALL TO authenticated USING (true) WITH CHECK (true)
--
-- Isso libera QUALQUER usuário autenticado a ler e escrever as linhas de
-- TODAS as lojas — não há isolamento multi-tenant nenhum.
--
-- ⚠️ Por que isso é sério em `checkgrau_collaborator_notes`:
-- são notas privadas do gestor sobre o colaborador (observações de
-- acompanhamento, tipo RH). E colaboradores SÃO usuários do auth: o
-- `collaborator-pin-login` termina em `signInWithPassword`, então quem
-- entra pelo PIN tem `auth.uid()` válido. Com `USING (true)`, qualquer
-- colaborador logado lê — e altera — as notas que os gestores escreveram
-- sobre ele e sobre todos os colegas, de todas as lojas.
--
-- Rodar DEPOIS de ADD_OPERATIONS_M5.sql e
-- ADD_CHECKGRAU_COLLABORATOR_NOTES.sql (que criam as tabelas).
-- Idempotente: pode rodar de novo sem risco.
-- ═══════════════════════════════════════════════════════════════

-- ── Helper: gestão da loja por QUALQUER um dos caminhos de vínculo ──
--
-- Existe porque `user_manages_store()` só reconhece
-- `stores.franchisee_user_id` e `user_unidades`, ignorando
-- `user_profiles.unidade_id`. Foi exatamente essa lacuna que travou a
-- edição de categorias para o itallogeroncio@ (ver FIX_CATEGORIES_RLS.sql).
-- Aqui reaproveitamos `user_linked_to_store()`, que cobre os três caminhos,
-- e exigimos papel de gestão por cima.
--
-- Deliberadamente NÃO altero `user_manages_store()` — mexer nela mudaria
-- as policies de products, que hoje funcionam. Unificar as duas é uma
-- decisão à parte.
CREATE OR REPLACE FUNCTION public.user_manages_store_any(_user_id uuid, _store_id uuid)
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
      public.has_role(_user_id, 'franchisee_master'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = _user_id AND up.perfil = 'MASTER'
      )
      OR (
        (public.has_role(_user_id, 'admin'::app_role)
         OR public.has_role(_user_id, 'manager'::app_role))
        AND public.user_linked_to_store(_user_id, _store_id)
      )
    );
$$;

-- ═══════════════════════════════════════════════════════════════
-- 1. ai_analysis
--
-- Quem ESCREVE: só a edge function `operations-ai`, que usa
-- SUPABASE_SERVICE_ROLE_KEY e portanto ignora RLS por completo. Logo,
-- restringir aqui não quebra a gravação — verificado em
-- supabase/functions/operations-ai/index.ts.
--
-- Quem LÊ: hoje, ninguém pelo client (nenhum `from('ai_analysis')` em
-- src/). A policy de SELECT abaixo existe para o dia em que uma tela
-- mostrar essas análises — e já nasce isolada por loja.
--
-- Sem policy de INSERT/UPDATE/DELETE de propósito: o padrão do Postgres
-- é negar, e o único gravador legítimo passa por cima da RLS.
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "auth_all_ai_analysis" ON public.ai_analysis;
DROP POLICY IF EXISTS "ai_analysis_select_store_staff" ON public.ai_analysis;

CREATE POLICY "ai_analysis_select_store_staff"
  ON public.ai_analysis FOR SELECT TO authenticated
  USING (public.user_manages_store_any(auth.uid(), store_id));

-- Nota: `store_id` é anulável nesta tabela. Linhas com store_id NULL
-- ficam invisíveis para todo mundo no client (a função devolve false) e
-- acessíveis só pela service role. É o comportamento desejado.

-- ═══════════════════════════════════════════════════════════════
-- 2. checkgrau_collaborator_notes
--
-- A tabela não tem `store_id`; o caminho até a loja é
--   notes.collaborator_id → checkgrau_collaborator_stores.store_id
--
-- Regra: você vê e escreve a nota se administra ALGUMA das lojas às quais
-- o colaborador está vinculado. Colaborador logado por PIN não tem papel
-- de gestão, então deixa de enxergar as notas — inclusive as próprias.
--
-- Leitura e inserção vêm do client (src/hooks/checkgrau/useCollaboratorNotes.ts),
-- então essas duas precisam de policy.
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS auth_all_checkgrau_collaborator_notes ON public.checkgrau_collaborator_notes;
DROP POLICY IF EXISTS cg_notes_select_gestor ON public.checkgrau_collaborator_notes;
DROP POLICY IF EXISTS cg_notes_insert_gestor ON public.checkgrau_collaborator_notes;

CREATE POLICY cg_notes_select_gestor
  ON public.checkgrau_collaborator_notes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checkgrau_collaborator_stores cs
      WHERE cs.collaborator_id = checkgrau_collaborator_notes.collaborator_id
        AND public.user_manages_store_any(auth.uid(), cs.store_id)
    )
  );

CREATE POLICY cg_notes_insert_gestor
  ON public.checkgrau_collaborator_notes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checkgrau_collaborator_stores cs
      WHERE cs.collaborator_id = checkgrau_collaborator_notes.collaborator_id
        AND public.user_manages_store_any(auth.uid(), cs.store_id)
    )
  );

-- Sem policy de UPDATE nem DELETE, de propósito. O app hoje só lê e insere
-- (src/hooks/checkgrau/useCollaboratorNotes.ts faz apenas `.select()` e
-- `.insert()`), e nota de acompanhamento é histórico — apagar ou reescrever
-- deve ser decisão consciente, não um poder que aparece de brinde. Quando
-- existir tela de editar/excluir, acrescente a policy junto com ela.

-- ═══════════════════════════════════════════════════════════════
-- Conferência
-- ═══════════════════════════════════════════════════════════════

-- As policies devem estar como abaixo, e nenhuma com qual = 'true':
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('ai_analysis', 'checkgrau_collaborator_notes')
ORDER BY tablename, cmd, policyname;

-- Rode logado como um gestor da loja e confirme que ele continua vendo as
-- notas dos colaboradores dele (troque o e-mail):
--
--   SELECT n.id, c.name AS colaborador
--   FROM public.checkgrau_collaborator_notes n
--   JOIN public.checkgrau_collaborators c ON c.id = n.collaborator_id
--   LIMIT 10;
--
-- Se vier vazio para um gestor que deveria ver, cheque o vínculo:
--
--   SELECT cs.store_id,
--          public.user_manages_store_any(auth.uid(), cs.store_id) AS gerencia
--   FROM public.checkgrau_collaborator_stores cs
--   WHERE cs.collaborator_id = '<id-do-colaborador>';
