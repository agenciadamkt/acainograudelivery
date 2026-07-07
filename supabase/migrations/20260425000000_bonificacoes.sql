-- ═══════════════════════════════════════════════════════════════
-- Recibos de Saída de Bonificação
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS stock_bonificacoes (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id               UUID REFERENCES stores(id) ON DELETE CASCADE,
  data                   DATE NOT NULL DEFAULT CURRENT_DATE,
  autorizado_por         TEXT NOT NULL,
  responsavel_entrega    TEXT,
  responsavel_recebimento TEXT,
  observacoes            TEXT,
  registrado_por         UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_bonificacao_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bonificacao_id  UUID NOT NULL REFERENCES stock_bonificacoes(id) ON DELETE CASCADE,
  item_id         UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  descricao       TEXT NOT NULL,
  quantidade      NUMERIC(10,3) NOT NULL DEFAULT 1,
  unidade         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE stock_bonificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_bonificacao_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bonif_select" ON stock_bonificacoes FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('franchisee_master','admin','manager','staff')));

CREATE POLICY "bonif_insert" ON stock_bonificacoes FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('franchisee_master','admin','manager','staff')));

CREATE POLICY "bonif_update" ON stock_bonificacoes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('franchisee_master','admin','manager')));

CREATE POLICY "bonif_delete" ON stock_bonificacoes FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('franchisee_master','admin','manager')));

CREATE POLICY "bonif_items_select" ON stock_bonificacao_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('franchisee_master','admin','manager','staff')));

CREATE POLICY "bonif_items_insert" ON stock_bonificacao_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('franchisee_master','admin','manager','staff')));

CREATE POLICY "bonif_items_delete" ON stock_bonificacao_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('franchisee_master','admin','manager')));
