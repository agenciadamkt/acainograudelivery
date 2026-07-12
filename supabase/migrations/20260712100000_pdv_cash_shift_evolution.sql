-- ============================================================================
-- Evolução do Módulo de Caixa — Fase 1 (modelagem completa do ciclo de vida)
--
-- Conceito: pdv_cash_registers = TURNO DE CAIXA (abertura → operação →
-- fechamento → conferência → reabertura). NÃO se funde com cash_closings
-- (fechamento financeiro, módulo Financeiro) — apenas compartilham operadores
-- (cash_operators) e componentes.
--
-- Modelagem pensada no ESTADO FINAL do módulo (mesmo que algumas colunas só
-- sejam usadas em fases posteriores), para evitar migrations sucessivas.
-- ============================================================================

-- ── 1. Caixa Físico (um caixa físico tem VÁRIOS turnos ao longo do tempo) ──────
-- Distingue "Caixa Físico" (ex.: Caixa 1) do "Turno de Caixa". O turno nunca é
-- identificado pela data — sempre pelo id — suportando vários turnos por dia.
CREATE TABLE IF NOT EXISTS public.pdv_physical_registers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),      -- franqueado/dono
  store_id    UUID REFERENCES public.stores(id),
  name        TEXT NOT NULL,                        -- "Caixa 1", "Balcão", etc.
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 2. Enriquecimento do TURNO (pdv_cash_registers) ──────────────────────────
ALTER TABLE public.pdv_cash_registers
  ADD COLUMN IF NOT EXISTS operator_id          UUID REFERENCES public.cash_operators(id),   -- operador do turno
  ADD COLUMN IF NOT EXISTS physical_register_id UUID REFERENCES public.pdv_physical_registers(id), -- caixa físico
  ADD COLUMN IF NOT EXISTS device               TEXT,                                        -- dispositivo (quando disponível)
  ADD COLUMN IF NOT EXISTS closed_by            UUID REFERENCES auth.users(id),              -- quem fechou
  ADD COLUMN IF NOT EXISTS checked_by_id        UUID REFERENCES public.cash_operators(id),   -- conferente
  ADD COLUMN IF NOT EXISTS difference           NUMERIC,                                     -- conferido − esperado (dinheiro)
  ADD COLUMN IF NOT EXISTS reopened_at          TIMESTAMPTZ,                                 -- última reabertura
  ADD COLUMN IF NOT EXISTS reopened_by          UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reopen_reason        TEXT;

-- ── 3. Operador nas movimentações (sangria/suprimento) ───────────────────────
ALTER TABLE public.pdv_cash_movements
  ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES public.cash_operators(id);

-- ── 4. Conferência flexível por forma de pagamento (1 linha por método) ──────
-- Modelo relacional em vez de coluna por gateway: aceita novos meios de
-- pagamento sem migration. difference é derivada (conferido − sistema).
CREATE TABLE IF NOT EXISTS public.pdv_cash_conference (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES public.pdv_cash_registers(id) ON DELETE CASCADE,
  payment_method   TEXT NOT NULL,                 -- 'money','pix','credit','debit','online',... (livre)
  system_amount    NUMERIC NOT NULL DEFAULT 0,    -- valor do sistema
  counted_amount   NUMERIC NOT NULL DEFAULT 0,    -- valor conferido
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (cash_register_id, payment_method)
);

-- ── 5. Auditoria GENÉRICA (reutilizável por todo o sistema) ──────────────────
-- Não é específica de Caixa: serve Pedidos, Financeiro, Estoque, Delivery, etc.
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID REFERENCES public.stores(id),
  entity_type TEXT NOT NULL,                       -- 'pdv_cash_register','pdv_order',...
  entity_id   UUID,                                -- id da entidade (quando houver)
  action      TEXT NOT NULL,                       -- 'abertura','fechamento','reabertura','suprimento','sangria','cancelamento','impressao','reimpressao','exportacao',...
  user_id     UUID REFERENCES auth.users(id),      -- usuário do sistema
  operator_id UUID REFERENCES public.cash_operators(id), -- operador (quando aplicável)
  reason      TEXT,                                -- motivo (quando houver)
  ip          TEXT,                                -- IP (quando disponível)
  device      TEXT,                                -- dispositivo (quando disponível)
  details     JSONB,                               -- payload livre (valores, antes/depois, etc.)
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs (created_at DESC);

-- ── 6. Configuração "Exigir caixa aberto antes de vender" ─────────────────────
ALTER TABLE public.pdv_settings
  ADD COLUMN IF NOT EXISTS require_open_cash_register BOOLEAN NOT NULL DEFAULT false;

-- ── 7. RLS (mesmo padrão de isolamento por dono do módulo PDV) ────────────────
ALTER TABLE public.pdv_physical_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_cash_conference    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs             ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their physical registers" ON public.pdv_physical_registers;
CREATE POLICY "Users manage their physical registers" ON public.pdv_physical_registers
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Conferência: acessível pelo dono do turno correspondente.
DROP POLICY IF EXISTS "Users manage conference of their registers" ON public.pdv_cash_conference;
CREATE POLICY "Users manage conference of their registers" ON public.pdv_cash_conference
  USING (EXISTS (SELECT 1 FROM public.pdv_cash_registers r WHERE r.id = cash_register_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pdv_cash_registers r WHERE r.id = cash_register_id AND r.user_id = auth.uid()));

-- Auditoria: cada usuário registra e lê os próprios eventos (service_role, usado
-- por triggers/edge functions, ignora RLS).
DROP POLICY IF EXISTS "Users read/write their audit logs" ON public.audit_logs;
CREATE POLICY "Users read/write their audit logs" ON public.audit_logs
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
