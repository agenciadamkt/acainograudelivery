-- ============================================================================
-- GrauOS Operações 2.0 — Marco 5 (IA Operacional)
-- Guarda as análises de IA (validação/comparação de foto e resumos).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_analysis (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  type              text NOT NULL,   -- photo_validation | comparison | summary
  execution_item_id uuid REFERENCES public.inventory_checklist_execution_items(id) ON DELETE SET NULL,
  schedule_id       uuid REFERENCES public.inventory_checklist_schedules(id) ON DELETE SET NULL,
  approved          boolean,
  score             int,
  reason            text,
  raw               jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_item ON public.ai_analysis (execution_item_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_store_created ON public.ai_analysis (store_id, created_at DESC);

ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_ai_analysis" ON public.ai_analysis;
CREATE POLICY "auth_all_ai_analysis" ON public.ai_analysis
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
