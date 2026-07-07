-- ── Tabela de auditorias de estoque ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_audits (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         UUID        REFERENCES stores(id) ON DELETE CASCADE,
  user_id          UUID,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  items_counted    INTEGER     DEFAULT 0,
  items_with_diff  INTEGER     DEFAULT 0,
  items_surplus    INTEGER     DEFAULT 0,
  items_shortage   INTEGER     DEFAULT 0,
  adjustments_applied BOOLEAN  DEFAULT FALSE,
  pdf_url          TEXT,
  audit_data       JSONB       DEFAULT '[]'::jsonb
);

ALTER TABLE inventory_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store members can manage audits"
  ON inventory_audits FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Bucket para PDFs de auditoria ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('auditorias', 'auditorias', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload audits"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'auditorias');

CREATE POLICY "Anyone can read audit PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'auditorias');

CREATE POLICY "Authenticated users can delete own audits"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'auditorias' AND auth.uid() = owner);
