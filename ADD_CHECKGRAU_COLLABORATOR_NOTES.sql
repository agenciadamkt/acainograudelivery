-- ═══════════════════════════════════════════════════════════════════════════
-- CheckGrau — Notas do gestor sobre o colaborador (privadas, aba "Notas" do
-- modal de detalhe). Observações/acompanhamentos, com histórico.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.checkgrau_collaborator_notes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id  uuid NOT NULL REFERENCES public.checkgrau_collaborators(id) ON DELETE CASCADE,
  author_name      text,
  body             text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cg_notes_collab ON public.checkgrau_collaborator_notes(collaborator_id, created_at DESC);

ALTER TABLE public.checkgrau_collaborator_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_all_checkgrau_collaborator_notes ON public.checkgrau_collaborator_notes;
CREATE POLICY auth_all_checkgrau_collaborator_notes ON public.checkgrau_collaborator_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
