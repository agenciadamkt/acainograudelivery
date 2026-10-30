-- GrauOS AI Workforce: official Meta WhatsApp core (local migration only).
-- Access tokens are intentionally not persisted here; use Supabase server secrets.

CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'meta_cloud' CHECK (provider = 'meta_cloud'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','disabled','error')),
  waba_id text,
  phone_number_id text,
  display_phone_number text,
  verified_name text,
  quality_rating text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_connections_phone_provider_uidx ON public.whatsapp_connections(provider, phone_number_id) WHERE phone_number_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_connections_store_provider_uidx ON public.whatsapp_connections(store_id, provider) WHERE store_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.crm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp' CHECK (channel = 'whatsapp'),
  external_contact_id text NOT NULL,
  contact_phone text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  automation_status text NOT NULL DEFAULT 'active' CHECK (automation_status IN ('active','paused')),
  assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_conversations_identity_uidx ON public.crm_conversations(channel, external_contact_id, COALESCE(store_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE IF NOT EXISTS public.crm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  external_message_id text NOT NULL,
  idempotency_key text,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  message_type text NOT NULL DEFAULT 'unknown' CHECK (message_type IN ('text','image','audio','video','document','interactive','unknown')),
  text_content text,
  status text CHECK (status IS NULL OR status IN ('sent','delivered','read','failed')),
  sender_phone text,
  recipient_phone text,
  provider text NOT NULL DEFAULT 'meta_cloud' CHECK (provider = 'meta_cloud'),
  provider_timestamp timestamptz,
  raw_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS crm_messages_external_uidx ON public.crm_messages(provider, external_message_id);
CREATE UNIQUE INDEX IF NOT EXISTS crm_messages_idempotency_uidx ON public.crm_messages(provider, idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.whatsapp_connections, public.crm_conversations, public.crm_messages FROM anon;
GRANT SELECT ON public.whatsapp_connections, public.crm_conversations, public.crm_messages TO authenticated;

CREATE POLICY whatsapp_connections_select ON public.whatsapp_connections FOR SELECT TO authenticated USING (
  public.user_has_rbac_permission('cli.crm', 1)
  OR (store_id IS NOT NULL AND (EXISTS (SELECT 1 FROM public.user_unidades uu WHERE uu.usuario_id = auth.uid() AND uu.store_id = whatsapp_connections.store_id)
      OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = whatsapp_connections.store_id AND s.franchisee_user_id = auth.uid())))
);
CREATE POLICY whatsapp_connections_manage ON public.whatsapp_connections FOR ALL TO authenticated USING (
  public.user_has_rbac_permission('cli.crm', 1)
) WITH CHECK (public.user_has_rbac_permission('cli.crm', 1));

CREATE POLICY crm_conversations_select ON public.crm_conversations FOR SELECT TO authenticated USING (
  (store_id IS NULL AND public.user_has_rbac_permission('cli.crm', 1))
  OR (store_id IS NOT NULL AND (public.user_has_rbac_permission('cli.crm', 1)
    OR EXISTS (SELECT 1 FROM public.user_unidades uu WHERE uu.usuario_id = auth.uid() AND uu.store_id = crm_conversations.store_id)
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = crm_conversations.store_id AND s.franchisee_user_id = auth.uid())))
);
CREATE POLICY crm_messages_select ON public.crm_messages FOR SELECT TO authenticated USING (
  (store_id IS NULL AND public.user_has_rbac_permission('cli.crm', 1))
  OR (store_id IS NOT NULL AND (public.user_has_rbac_permission('cli.crm', 1)
    OR EXISTS (SELECT 1 FROM public.user_unidades uu WHERE uu.usuario_id = auth.uid() AND uu.store_id = crm_messages.store_id)
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = crm_messages.store_id AND s.franchisee_user_id = auth.uid())))
);

DROP TRIGGER IF EXISTS whatsapp_connections_updated_at ON public.whatsapp_connections;
CREATE TRIGGER whatsapp_connections_updated_at BEFORE UPDATE ON public.whatsapp_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS crm_conversations_updated_at ON public.crm_conversations;
CREATE TRIGGER crm_conversations_updated_at BEFORE UPDATE ON public.crm_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_conversations;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_messages;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL;
END $$;

COMMENT ON TABLE public.crm_messages IS 'Append-only official Meta WhatsApp messages; status updates are provider delivery acknowledgements.';
