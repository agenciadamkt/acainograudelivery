-- ═══════════════════════════════════════════════════════════════════════════
-- CheckGrau — Pontuação (gamificação) do colaborador
-- Cada execução concluída gera pontos (base +10). Idempotente por execução
-- (UNIQUE execution_id) para não pontuar duas vezes ao reabrir a tela.
-- Base para o ranking interno (bloco de Ranking/Score).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.checkgrau_points (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid REFERENCES public.checkgrau_collaborators(id) ON DELETE SET NULL,
  store_id        uuid,
  execution_id    uuid UNIQUE,
  points          integer NOT NULL DEFAULT 0,
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cg_points_collaborator ON public.checkgrau_points(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_cg_points_store        ON public.checkgrau_points(store_id);
CREATE INDEX IF NOT EXISTS idx_cg_points_created       ON public.checkgrau_points(created_at);

ALTER TABLE public.checkgrau_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_all_checkgrau_points ON public.checkgrau_points;
CREATE POLICY auth_all_checkgrau_points ON public.checkgrau_points
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
