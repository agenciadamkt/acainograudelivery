-- ═══════════════════════════════════════════════════════════════════════════
-- CheckGrau — PIN de acesso do colaborador
-- Após o 1º acesso (OTP no WhatsApp), o colaborador cria um PIN de 6 dígitos e
-- passa a entrar com WhatsApp + PIN (sem código). O PIN é guardado como hash
-- adaptativo Argon2id (o salt e os parâmetros ficam embutidos no próprio hash),
-- nunca em texto. `pin_attempts`/`pin_locked_until` limitam tentativas online.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.checkgrau_collaborators
  ADD COLUMN IF NOT EXISTS has_pin          boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_hash         text,
  ADD COLUMN IF NOT EXISTS pin_attempts     integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pin_locked_until timestamptz;
