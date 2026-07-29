-- ============================================================================
-- GrauOS Operações 2.0 — Marco 4 (Alertas WhatsApp)
-- Config de alertas por unidade + log de notificações (dedupe/auditoria).
-- Depende de M1 (schedules/executions). Rankings do M4 não usam SQL (on-the-fly).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.operation_alert_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  enabled         boolean NOT NULL DEFAULT false,
  events          jsonb   NOT NULL DEFAULT '{"overdue":true,"critical":true,"out_of_standard":true}',
  recipient_phone text,
  recipient_name  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  event_type   text NOT NULL,                 -- overdue | critical | out_of_standard
  schedule_id  uuid REFERENCES public.inventory_checklist_schedules(id) ON DELETE SET NULL,
  phone        text,
  message      text,
  status       text NOT NULL DEFAULT 'sent',  -- sent | failed | skipped
  error        text,
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- deduplica: um alerta por (loja, evento, tarefa)
  UNIQUE (store_id, event_type, schedule_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_logs_store_created
  ON public.notification_logs (store_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.operation_alert_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_operation_alert_settings" ON public.operation_alert_settings;
CREATE POLICY "auth_all_operation_alert_settings" ON public.operation_alert_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_read_notification_logs" ON public.notification_logs;
CREATE POLICY "auth_read_notification_logs" ON public.notification_logs
  FOR SELECT TO authenticated USING (true);
-- Escrita nos logs é feita pela edge function (service role, ignora RLS).
