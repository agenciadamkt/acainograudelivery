-- ============================================================================
-- GrauOS Operações 2.0 — Marco 1 (Fundação: Agenda + Execução com SLA)
-- Evolui os checklists (admin/stock/checklists) para tarefas operacionais agendadas.
-- Mantém o cadastro atual (inventory_checklists / inventory_checklist_items) como template.
-- ============================================================================

-- ── Organização: setores e turnos por unidade ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.sectors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name        text NOT NULL,                 -- Cozinha, Salão, Caixa, Estoque...
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shifts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name        text NOT NULL,                 -- Manhã, Tarde, Noite
  start_time  time,
  end_time    time,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Rotina: a recorrência que gera tarefas ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_checklist_routines (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  checklist_id        uuid NOT NULL REFERENCES public.inventory_checklists(id) ON DELETE CASCADE,
  sector_id           uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  shift_id            uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recurrence_type     text NOT NULL DEFAULT 'daily'
                        CHECK (recurrence_type IN ('daily','weekly','monthly')),
  weekdays            int[] NOT NULL DEFAULT '{}',   -- 0=Seg … 6=Dom (recurrence weekly)
  scheduled_time      time NOT NULL DEFAULT '08:00',
  sla_grace_minutes   int NOT NULL DEFAULT 0,        -- tolerância antes de contar atraso
  critical            boolean NOT NULL DEFAULT false,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Tarefa: instância agendada (uma por ocorrência) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_checklist_schedules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id          uuid REFERENCES public.inventory_checklist_routines(id) ON DELETE CASCADE,
  store_id            uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  sector_id           uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  shift_id            uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
  checklist_id        uuid NOT NULL REFERENCES public.inventory_checklists(id) ON DELETE CASCADE,
  responsible_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_date      date NOT NULL,
  scheduled_time      time NOT NULL,
  deadline_at         timestamptz NOT NULL,
  critical            boolean NOT NULL DEFAULT false,
  status              text NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','LATE','MISSED','CANCELLED')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- idempotência da geração da agenda (uma tarefa por rotina por dia)
  UNIQUE (routine_id, scheduled_date)
);

-- ── Execução da tarefa ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_checklist_executions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id    uuid NOT NULL REFERENCES public.inventory_checklist_schedules(id) ON DELETE CASCADE,
  store_id       uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  started_at     timestamptz,
  started_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at   timestamptz,
  completed_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  delay_minutes  int,                         -- max(0, completed_at − deadline_at) em minutos
  sla_score      int,                         -- 100 | 90 | 75 | 50 | 0
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Respostas por item da execução ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.inventory_checklist_execution_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id   uuid NOT NULL REFERENCES public.inventory_checklist_executions(id) ON DELETE CASCADE,
  item_id        uuid NOT NULL REFERENCES public.inventory_checklist_items(id) ON DELETE CASCADE,
  value_text     text,
  value_boolean  boolean,
  value_number   numeric,
  photo_url      text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sectors_store            ON public.sectors (store_id);
CREATE INDEX IF NOT EXISTS idx_shifts_store             ON public.shifts (store_id);
CREATE INDEX IF NOT EXISTS idx_ckl_routines_store       ON public.inventory_checklist_routines (store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ckl_schedules_store_date ON public.inventory_checklist_schedules (store_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_ckl_schedules_status     ON public.inventory_checklist_schedules (status);
CREATE INDEX IF NOT EXISTS idx_ckl_exec_schedule        ON public.inventory_checklist_executions (schedule_id);
CREATE INDEX IF NOT EXISTS idx_ckl_exec_items_exec      ON public.inventory_checklist_execution_items (execution_id);

-- ── RLS (padrão do projeto: authenticated) ───────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sectors','shifts',
    'inventory_checklist_routines','inventory_checklist_schedules',
    'inventory_checklist_executions','inventory_checklist_execution_items'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_all_%1$s" ON public.%1$s;', t);
    EXECUTE format(
      'CREATE POLICY "auth_all_%1$s" ON public.%1$s FOR ALL TO authenticated USING (true) WITH CHECK (true);',
      t);
  END LOOP;
END $$;
