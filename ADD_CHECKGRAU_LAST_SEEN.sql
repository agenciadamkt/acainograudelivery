-- ═══════════════════════════════════════════════════════════════════════════
-- CheckGrau — Último acesso do colaborador (last_seen_at)
-- Atualizado no login (OTP/PIN) e ao abrir o app. Usado na coluna
-- "Último acesso" em admin/checkgrau/collaborators — reflete a abertura do app,
-- não só a última execução concluída.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.checkgrau_collaborators
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;
