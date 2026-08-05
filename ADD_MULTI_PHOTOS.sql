-- ============================================================================
-- Múltiplas Fotos por Pergunta do Checklist
-- Cria tabela de fotos adicionais por item de execução, mantendo retrocompatibilidade
-- com o campo photo_url existente em inventory_checklist_execution_items.
-- ============================================================================

-- Tabela de fotos extras (1 item pode ter N fotos)
CREATE TABLE IF NOT EXISTS public.inventory_checklist_execution_item_photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id  uuid NOT NULL REFERENCES public.inventory_checklist_executions(id) ON DELETE CASCADE,
  item_id       uuid NOT NULL REFERENCES public.inventory_checklist_items(id) ON DELETE CASCADE,
  photo_url     text NOT NULL,
  sort_order    int NOT NULL DEFAULT 0,
  captured_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exec_item_photos_exec_item
  ON public.inventory_checklist_execution_item_photos (execution_id, item_id);

-- RLS
ALTER TABLE public.inventory_checklist_execution_item_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_exec_item_photos" ON public.inventory_checklist_execution_item_photos;
CREATE POLICY "auth_all_exec_item_photos"
  ON public.inventory_checklist_execution_item_photos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Storage bucket para evidências (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('operations_evidence', 'operations_evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para o bucket de evidências
DO $$
BEGIN
  -- Leitura pública
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Operations evidence public read'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    EXECUTE 'CREATE POLICY "Operations evidence public read" ON storage.objects
      FOR SELECT USING (bucket_id = ''operations_evidence'')';
  END IF;

  -- Upload autenticado
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Operations evidence authenticated upload'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    EXECUTE 'CREATE POLICY "Operations evidence authenticated upload" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = ''operations_evidence'' AND auth.role() = ''authenticated'')';
  END IF;

  -- Delete autenticado
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'Operations evidence authenticated delete'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    EXECUTE 'CREATE POLICY "Operations evidence authenticated delete" ON storage.objects
      FOR DELETE USING (bucket_id = ''operations_evidence'' AND auth.role() = ''authenticated'')';
  END IF;
END $$;
