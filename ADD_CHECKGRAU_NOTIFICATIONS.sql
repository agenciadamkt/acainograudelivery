-- ═══════════════════════════════════════════════════════════════════════════
-- CheckGrau — Central de notificações do colaborador
-- Notificações persistidas por evento (tarefa concluída, atrasada, nova, alerta
-- crítico, mensagem do gestor). `dedup_key` UNIQUE evita duplicar a mesma
-- notificação (ex: uma "atrasada" por tarefa/dia). collaborator_id NULL = envio
-- para toda a loja (broadcast).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.checkgrau_notifications (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid,
  collaborator_id  uuid REFERENCES public.checkgrau_collaborators(id) ON DELETE CASCADE,
  category         text NOT NULL,          -- late | completed | new | critical | message
  title            text NOT NULL,
  body             text,
  ref_schedule_id  uuid,
  read             boolean NOT NULL DEFAULT false,
  dedup_key        text UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cg_notif_store       ON public.checkgrau_notifications(store_id);
CREATE INDEX IF NOT EXISTS idx_cg_notif_collaborator ON public.checkgrau_notifications(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_cg_notif_created      ON public.checkgrau_notifications(created_at DESC);

ALTER TABLE public.checkgrau_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_all_checkgrau_notifications ON public.checkgrau_notifications;
CREATE POLICY auth_all_checkgrau_notifications ON public.checkgrau_notifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
