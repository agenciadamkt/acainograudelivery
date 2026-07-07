-- =============================================================
-- Contagem Recorrente — GrauOS
-- Execute este script no Supabase SQL Editor
-- =============================================================

-- 1. Tabela de Contagens Recorrentes
CREATE TABLE IF NOT EXISTS inventory_recurring_counts (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id          UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  name              TEXT NOT NULL,
  recurrence_type   TEXT NOT NULL DEFAULT 'weekly',  -- daily | weekly | monthly
  weekdays          INTEGER[] DEFAULT '{}',           -- 0=Seg … 6=Dom
  notification_time TEXT DEFAULT '07:00',
  responsible_id    UUID,
  responsible_name  TEXT,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Junction: contagem recorrente ↔ grupos de contagem
CREATE TABLE IF NOT EXISTS inventory_recurring_count_groups (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_count_id  UUID REFERENCES inventory_recurring_counts(id) ON DELETE CASCADE NOT NULL,
  group_id            UUID REFERENCES inventory_count_groups(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(recurring_count_id, group_id)
);

-- 3. Registro de execuções
CREATE TABLE IF NOT EXISTS inventory_recurring_count_executions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_count_id  UUID REFERENCES inventory_recurring_counts(id) ON DELETE CASCADE NOT NULL,
  store_id            UUID REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  status              TEXT NOT NULL DEFAULT 'in_progress',  -- in_progress | completed
  executed_by         UUID,
  executed_at         TIMESTAMPTZ,
  items               JSONB DEFAULT '[]',
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 4. RLS permissiva para autenticados (ajuste conforme política da loja se necessário)
ALTER TABLE inventory_recurring_counts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_recurring_count_groups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_recurring_count_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_recurring_counts" ON inventory_recurring_counts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_recurring_count_groups" ON inventory_recurring_count_groups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_recurring_count_executions" ON inventory_recurring_count_executions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
