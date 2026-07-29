-- ============================================================================
-- GrauOS Operações 2.0 — Marco 2 (Evidências + novos tipos de item)
-- Depende do M1 (ADD_OPERATIONS_M1.sql).
-- ============================================================================

-- ── Template do item: requisitos + config dos novos tipos ────────────────────
ALTER TABLE public.inventory_checklist_items
  ADD COLUMN IF NOT EXISTS require_photo       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_gps         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_comment     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_signature   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_value           numeric,
  ADD COLUMN IF NOT EXISTS max_value           numeric,
  ADD COLUMN IF NOT EXISTS options             jsonb,
  ADD COLUMN IF NOT EXISTS reference_image_url text;

-- Amplia os tipos aceitos (boolean|number|text|photo → + novos).
ALTER TABLE public.inventory_checklist_items
  DROP CONSTRAINT IF EXISTS inventory_checklist_items_type_check;
ALTER TABLE public.inventory_checklist_items
  ADD CONSTRAINT inventory_checklist_items_type_check
  CHECK (type IN (
    'boolean','number','text','photo',
    'rating','temperature','range','single_choice','multi_choice','qr','barcode'
  ));

-- ── Respostas: campos extras (multi, comentário, assinatura, validação) ───────
ALTER TABLE public.inventory_checklist_execution_items
  ADD COLUMN IF NOT EXISTS value_json jsonb,
  ADD COLUMN IF NOT EXISTS comment    text,
  ADD COLUMN IF NOT EXISTS signature  text,
  ADD COLUMN IF NOT EXISTS passed     boolean;

-- ── Evidências (foto + GPS) por item da execução ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.checklist_evidences (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_item_id uuid NOT NULL REFERENCES public.inventory_checklist_execution_items(id) ON DELETE CASCADE,
  photo_url         text,
  latitude          numeric,
  longitude         numeric,
  accuracy          numeric,
  captured_at       timestamptz,
  device_info       text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ckl_evidences_item ON public.checklist_evidences (execution_item_id);

ALTER TABLE public.checklist_evidences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_checklist_evidences" ON public.checklist_evidences;
CREATE POLICY "auth_all_checklist_evidences" ON public.checklist_evidences
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Bucket de storage para as fotos de evidência ─────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('operations_evidence', 'operations_evidence', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "ops_evidence_upload" ON storage.objects;
CREATE POLICY "ops_evidence_upload" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'operations_evidence');

DROP POLICY IF EXISTS "ops_evidence_read" ON storage.objects;
CREATE POLICY "ops_evidence_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'operations_evidence');

DROP POLICY IF EXISTS "ops_evidence_delete" ON storage.objects;
CREATE POLICY "ops_evidence_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'operations_evidence' AND auth.uid() = owner);
