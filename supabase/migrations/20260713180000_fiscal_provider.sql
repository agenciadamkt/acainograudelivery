-- ============================================================================
-- MÓDULO FISCAL — Multi-provedor: adiciona o provedor por empresa.
-- 'plugnotas' (TecnoSpeed, existente) ou 'focusnfe' (Focus NFe, novo).
-- Default mantém tudo que já existe apontando para PlugNotas — sem quebrar nada.
-- O token (token_encrypted) é agnóstico ao provedor: serve para ambos.
-- ============================================================================
ALTER TABLE public.fiscal_companies
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'plugnotas'
    CHECK (provider IN ('plugnotas', 'focusnfe'));

COMMENT ON COLUMN public.fiscal_companies.provider IS 'Provedor fiscal: plugnotas (TecnoSpeed) ou focusnfe (Focus NFe).';
