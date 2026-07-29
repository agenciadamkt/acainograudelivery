-- ═══════════════════════════════════════════════════════════════════════════
-- Higiene — Padroniza o código de estado (UF) das lojas
--
-- Hoje há lojas com UF fora do padrão de 2 letras maiúsculas — ex.: 'Pi'
-- (Açaí no Grau - Saci / Teresina) que deveria ser 'PI'. Isso duplica/estranha
-- o "Piauí" no seletor de estado da landing de delivery.
--
-- Este UPDATE apenas remove espaços e coloca em maiúsculas. NÃO toca em:
--   • estados vazios ('')  → ex.: Distribuidora [Teresina], que é CD e fica de fora do seletor
--   • estados NULL
--   • estados já corretos
-- Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

UPDATE public.stores
SET state = upper(btrim(state))
WHERE state IS NOT NULL
  AND btrim(state) <> ''
  AND state <> upper(btrim(state));

-- Conferência (opcional): deve listar só UFs de 2 letras maiúsculas + eventual '' de CDs
-- SELECT DISTINCT state FROM public.stores WHERE active = true AND status = 'active' ORDER BY 1;
