-- ISOLAMENTO TOTAL ENTRE ADMINS (agenciadamkt vs wagner)
-- Este script remove o bypass de e-mail e força o isolamento por auth.uid()

-- 1. Centros de Distribuição
DROP POLICY IF EXISTS "Admin Free Pass DC" ON public.distribution_centers;
DROP POLICY IF EXISTS "FINANCE_ADMIN_FULL_ACCESS_DC" ON public.distribution_centers;
DROP POLICY IF EXISTS "Franchisee isolation DC" ON public.distribution_centers;
CREATE POLICY "Franchisee isolation DC" ON public.distribution_centers FOR ALL
    USING (franchisee_user_id = auth.uid());

-- 2. Fechamentos de Caixa
DROP POLICY IF EXISTS "Admin Free Pass Closings" ON public.cash_closings;
DROP POLICY IF EXISTS "FINANCE_ADMIN_FULL_ACCESS_CLOSINGS" ON public.cash_closings;
DROP POLICY IF EXISTS "Franchisee isolation Closings" ON public.cash_closings;
CREATE POLICY "Franchisee isolation Closings" ON public.cash_closings FOR ALL
    USING (EXISTS (SELECT 1 FROM public.distribution_centers dc WHERE dc.id = distribution_center_id AND dc.franchisee_user_id = auth.uid()));

-- 3. Despesas
DROP POLICY IF EXISTS "Admin Free Pass Expenses" ON public.expenses;
DROP POLICY IF EXISTS "Franchisee isolation Expenses" ON public.expenses;
CREATE POLICY "Franchisee isolation Expenses" ON public.expenses FOR ALL
    USING (EXISTS (SELECT 1 FROM public.distribution_centers dc WHERE dc.id = distribution_center_id AND dc.franchisee_user_id = auth.uid()));

-- 4. Operadores de Caixa
DROP POLICY IF EXISTS "Admin bypass Cash Operators" ON public.cash_operators;
DROP POLICY IF EXISTS "SUPER_ADMIN_CASH_OPERATORS" ON public.cash_operators;
DROP POLICY IF EXISTS "Franchisee isolation Operators" ON public.cash_operators;
CREATE POLICY "Franchisee isolation Operators" ON public.cash_operators FOR ALL
    USING (franchisee_user_id = auth.uid());

-- 5. Contas Financeiras
DROP POLICY IF EXISTS "Admin bypass Financial Accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Franchisee isolation Accounts" ON public.financial_accounts;
CREATE POLICY "Franchisee isolation Accounts" ON public.financial_accounts FOR ALL
    USING (franchisee_user_id = auth.uid());

-- 6. Centros de Custos
DROP POLICY IF EXISTS "Admin bypass Cost Centers" ON public.cost_centers;
DROP POLICY IF EXISTS "Franchisee isolation Cost Centers" ON public.cost_centers;
CREATE POLICY "Franchisee isolation Cost Centers" ON public.cost_centers FOR ALL
    USING (
        (franchisee_user_id = auth.uid()) OR
        (distribution_center_id IN (SELECT id FROM public.distribution_centers WHERE franchisee_user_id = auth.uid()))
    );

-- 7. Plano de Contas
DROP POLICY IF EXISTS "Admin bypass Chart Accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Franchisee isolation Chart Accounts" ON public.chart_of_accounts;
CREATE POLICY "Franchisee isolation Chart Accounts" ON public.chart_of_accounts FOR ALL
    USING (
        (franchisee_user_id = auth.uid()) OR
        (cost_center_id IN (SELECT id FROM public.cost_centers WHERE franchisee_user_id = auth.uid())) OR
        (cost_center_id IN (SELECT cc.id FROM public.cost_centers cc JOIN public.distribution_centers dc ON dc.id = cc.distribution_center_id WHERE dc.franchisee_user_id = auth.uid()))
    );

-- 8. Clientes Financeiros
DROP POLICY IF EXISTS "Admin bypass Financial Clients" ON public.financial_clients;
DROP POLICY IF EXISTS "Franchisee isolation Clients" ON public.financial_clients;
CREATE POLICY "Franchisee isolation Clients" ON public.financial_clients FOR ALL
    USING (created_by = auth.uid());

-- 9. Metas Financeiras
DROP POLICY IF EXISTS "Admin bypass Financial Goals" ON public.financial_goals;
DROP POLICY IF EXISTS "Franchisee isolation Goals" ON public.financial_goals;
CREATE POLICY "Franchisee isolation Goals" ON public.financial_goals FOR ALL
    USING (franchisee_user_id = auth.uid());

-- 10. Registros Financeiros (Fluxo Detalhado)
DROP POLICY IF EXISTS "Admin bypass Financial Records" ON public.financial_records;
DROP POLICY IF EXISTS "Franchisee isolation Records" ON public.financial_records;
CREATE POLICY "Franchisee isolation Records" ON public.financial_records FOR ALL
    USING (EXISTS (SELECT 1 FROM public.distribution_centers dc WHERE dc.id = distribution_center_id AND dc.franchisee_user_id = auth.uid()));

-- 11. Usuários Financeiros (Permissões de Acesso)
DROP POLICY IF EXISTS "Admin bypass Financial Users" ON public.financial_users;
DROP POLICY IF EXISTS "Franchisee isolation Users" ON public.financial_users;
CREATE POLICY "Franchisee isolation Users" ON public.financial_users FOR ALL
    USING (email = (auth.jwt() ->> 'email')::text);

-- 12. Transferências Financeiras
DROP POLICY IF EXISTS "Admin bypass Financial Transfers" ON public.financial_transfers;
DROP POLICY IF EXISTS "Franchisee isolation Transfers" ON public.financial_transfers;
CREATE POLICY "Franchisee isolation Transfers" ON public.financial_transfers FOR ALL
    USING (EXISTS (SELECT 1 FROM public.financial_accounts fa WHERE fa.id = from_account_id AND fa.franchisee_user_id = auth.uid()));

-- 13. [DATA FIX] Atribuir registros órfãos ao admin principal (agenciadamkt)
-- Isso evita que registros antigos sem franchisee_user_id sumam após o isolamento.
DO $$
DECLARE
    v_admin_id uuid;
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'agenciadamkt@gmail.com';
    
    IF v_admin_id IS NOT NULL THEN
        -- Corrigir CD órfãos (se houver)
        UPDATE public.distribution_centers SET franchisee_user_id = v_admin_id WHERE franchisee_user_id IS NULL;
        -- Corrigir Contas Financeiras
        UPDATE public.financial_accounts SET franchisee_user_id = v_admin_id WHERE franchisee_user_id IS NULL;
        -- Corrigir Centro de Custos
        UPDATE public.cost_centers SET franchisee_user_id = v_admin_id WHERE franchisee_user_id IS NULL;
        -- Corrigir Plano de Contas
        UPDATE public.chart_of_accounts SET franchisee_user_id = v_admin_id WHERE franchisee_user_id IS NULL;
        -- Corrigir Operadores
        UPDATE public.cash_operators SET franchisee_user_id = v_admin_id WHERE franchisee_user_id IS NULL;
        -- Corrigir Metas
        UPDATE public.financial_goals SET franchisee_user_id = v_admin_id WHERE franchisee_user_id IS NULL;
    END IF;
END $$;
