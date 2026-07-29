-- ═══════════════════════════════════════════════════════════════════════════
-- CheckGrau — Rotinas: data única e mensal por dia do mês
-- Amplia as opções de recorrência das rotinas:
--   • specific_date      → recorrência "once" (acontece só nesta data, não repete)
--   • day_of_month       → recorrência "monthly" em um dia específico (1..31)
--   • last_day_of_month  → recorrência "monthly" no ÚLTIMO dia do mês
-- (recurrence_type já existe; passa a aceitar também 'once'.)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.inventory_checklist_routines
  ADD COLUMN IF NOT EXISTS specific_date     date,
  ADD COLUMN IF NOT EXISTS day_of_month      integer,
  ADD COLUMN IF NOT EXISTS last_day_of_month boolean NOT NULL DEFAULT false;
