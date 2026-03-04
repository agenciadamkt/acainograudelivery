-- FIX DEFINITIVO PARA TODOS OS CADASTROS (ADMIN BYPASS)
-- Este script libera a visão de todas as tabelas de cadastro para os administradores.

-- 1. Plano de Contas (chart_of_accounts)
DROP POLICY IF EXISTS "Everyone views active chart accounts" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "Admin bypass Chart Accounts" ON public.chart_of_accounts;
CREATE POLICY "Admin bypass Chart Accounts" ON public.chart_of_accounts FOR ALL
    USING ((auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com') OR active = true);

-- 2. Centro de Custos (cost_centers)
DROP POLICY IF EXISTS "Everyone views active cost centers" ON public.cost_centers;
DROP POLICY IF EXISTS "Admin bypass Cost Centers" ON public.cost_centers;
CREATE POLICY "Admin bypass Cost Centers" ON public.cost_centers FOR ALL
    USING ((auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com') OR active = true);

-- 3. Contas Financeiras (financial_accounts)
DROP POLICY IF EXISTS "Users view own accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Admin bypass Financial Accounts" ON public.financial_accounts;
CREATE POLICY "Admin bypass Financial Accounts" ON public.financial_accounts FOR ALL
    USING ((auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com') OR franchisee_user_id = auth.uid());

-- 4. Operadores de Caixa (cash_operators)
DROP POLICY IF EXISTS "Users view own cash operators" ON public.cash_operators;
DROP POLICY IF EXISTS "Admin bypass Cash Operators" ON public.cash_operators;
CREATE POLICY "Admin bypass Cash Operators" ON public.cash_operators FOR ALL
    USING ((auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com') OR franchisee_user_id = auth.uid());

-- 5. Clientes Financeiros (financial_clients)
DROP POLICY IF EXISTS "Users view own clients" ON public.financial_clients;
DROP POLICY IF EXISTS "Admin bypass Financial Clients" ON public.financial_clients;
CREATE POLICY "Admin bypass Financial Clients" ON public.financial_clients FOR ALL
    USING ((auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com') OR created_by = auth.uid());

-- 6. Garantir que o RLS está ativo mas permissivo
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_clients ENABLE ROW LEVEL SECURITY;
