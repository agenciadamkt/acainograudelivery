-- ═══════════════════════════════════════════════════════════════
-- Correção de Isolamento RLS — Transações / Transferências Financeiras
-- ═══════════════════════════════════════════════════════════════

-- ── 1. REMOVE A POLICY PÚBLICA INAPROPRIADA (BULA SECRETA) ──────
-- Esta policy permitia que qualquer usuário visse todas as transferências de todos os franqueados/master.
DROP POLICY IF EXISTS "Everyone views transfers" ON public.financial_transfers;
DROP POLICY IF EXISTS "Users view own transfers" ON public.financial_transfers;
DROP POLICY IF EXISTS "Users manage own financial transfers" ON public.financial_transfers;

-- Garante que RLS está devidamente habilitada
ALTER TABLE public.financial_transfers ENABLE ROW LEVEL SECURITY;

-- ── 2. NOVA POLICY SEGURA DE SELEÇÃO / VISUALIZAÇÃO ─────────────
-- O usuário só pode ver transferências que:
-- A) Foram criadas por ele ou pelo seu franqueador efetivo
-- B) Envolvem contas financeiras (origem ou destino) pertencentes ao seu franqueador efetivo
CREATE POLICY "Users view own transfers"
    ON public.financial_transfers FOR SELECT
    USING (
        created_by = public.get_my_franchisee_id()
        OR auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM public.financial_accounts fa
            WHERE (fa.id = from_account_id OR fa.id = to_account_id)
              AND fa.franchisee_user_id = public.get_my_franchisee_id()
        )
    );

-- ── 3. POLICIES SEGURAS PARA INSERÇÃO E OUTROS MÉTODOS ──────────
CREATE POLICY "Users manage own financial transfers"
    ON public.financial_transfers FOR ALL
    USING (
        created_by = public.get_my_franchisee_id() 
        OR auth.uid() = created_by
    );
