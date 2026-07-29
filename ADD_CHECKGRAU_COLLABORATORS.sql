-- ============================================================================
-- CheckGrau — Colaboradores, vínculo com lojas e ajustes (Bloco A)
-- Separa colaboradores (login por WhatsApp+OTP) dos usuários administrativos.
-- Reusa a tabela `stores` para lojas. Depende de M1 (routines/schedules).
-- ============================================================================

-- ── Colaboradores ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.checkgrau_collaborators (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid,                          -- grupo de lojas (stores.company_id)
  auth_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- vínculo no 1º login
  name          text NOT NULL,
  whatsapp      text NOT NULL,                 -- identificador de login (E.164)
  cpf           text,
  cargo         text NOT NULL DEFAULT 'operador'
                  CHECK (cargo IN ('operador','lider','supervisor','franqueado')),
  photo_url     text,
  status        text NOT NULL DEFAULT 'ativo'
                  CHECK (status IN ('ativo','inativo','afastado','desligado')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (whatsapp)
);
CREATE INDEX IF NOT EXISTS idx_cg_collab_company ON public.checkgrau_collaborators (company_id);
CREATE INDEX IF NOT EXISTS idx_cg_collab_auth ON public.checkgrau_collaborators (auth_user_id);

-- ── Vínculo colaborador × loja (N:N) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.checkgrau_collaborator_stores (
  collaborator_id uuid NOT NULL REFERENCES public.checkgrau_collaborators(id) ON DELETE CASCADE,
  store_id        uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collaborator_id, store_id)
);
CREATE INDEX IF NOT EXISTS idx_cg_collab_stores_store ON public.checkgrau_collaborator_stores (store_id);

-- ── Lojas: campos que faltam (reusa stores) ──────────────────────────────────
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS code   text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo';

-- ── Rotinas/tarefas: atribuição a colaborador (mantém responsible_user_id) ────
ALTER TABLE public.inventory_checklist_routines
  ADD COLUMN IF NOT EXISTS collaborator_id uuid REFERENCES public.checkgrau_collaborators(id) ON DELETE SET NULL;
ALTER TABLE public.inventory_checklist_schedules
  ADD COLUMN IF NOT EXISTS collaborator_id uuid REFERENCES public.checkgrau_collaborators(id) ON DELETE SET NULL;

-- ── RLS (padrão do módulo: authenticated) ────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['checkgrau_collaborators','checkgrau_collaborator_stores'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_all_%1$s" ON public.%1$s;', t);
    EXECUTE format(
      'CREATE POLICY "auth_all_%1$s" ON public.%1$s FOR ALL TO authenticated USING (true) WITH CHECK (true);', t);
  END LOOP;
END $$;
