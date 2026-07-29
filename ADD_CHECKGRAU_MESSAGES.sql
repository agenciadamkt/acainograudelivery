-- ═══════════════════════════════════════════════════════════════════════════
-- CheckGrau — Mensagens do gestor → colaborador
-- Aviso/comunicado de mão única. collaborator_id NULL = enviado para a loja toda
-- (broadcast). A leitura é por colaborador (checkgrau_message_reads), pois um
-- broadcast é lido por várias pessoas.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.checkgrau_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid,
  collaborator_id  uuid REFERENCES public.checkgrau_collaborators(id) ON DELETE CASCADE,
  sender_name      text,
  title            text,
  body             text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checkgrau_message_reads (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id       uuid NOT NULL REFERENCES public.checkgrau_messages(id) ON DELETE CASCADE,
  collaborator_id  uuid NOT NULL REFERENCES public.checkgrau_collaborators(id) ON DELETE CASCADE,
  read_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, collaborator_id)
);

CREATE INDEX IF NOT EXISTS idx_cg_msg_store        ON public.checkgrau_messages(store_id);
CREATE INDEX IF NOT EXISTS idx_cg_msg_collaborator ON public.checkgrau_messages(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_cg_msg_created      ON public.checkgrau_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cg_msgread_collab   ON public.checkgrau_message_reads(collaborator_id);

ALTER TABLE public.checkgrau_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkgrau_message_reads  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_all_checkgrau_messages ON public.checkgrau_messages;
CREATE POLICY auth_all_checkgrau_messages ON public.checkgrau_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS auth_all_checkgrau_message_reads ON public.checkgrau_message_reads;
CREATE POLICY auth_all_checkgrau_message_reads ON public.checkgrau_message_reads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
