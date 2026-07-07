-- Migration: Financial Entities RLS for CD Access
-- Description: Completes the RLS setup for subsidiary financial entities based on CD assignments.

-- 1. Cost Centers
DROP POLICY IF EXISTS "Users manage own CD cost centers" ON public.cost_centers;
CREATE POLICY "Users manage assigned CD cost centers"
    ON public.cost_centers FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND (
                dc.franchisee_user_id = auth.uid() 
                OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' 
                OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
                OR EXISTS (
                    SELECT 1 FROM public.financial_user_cd_links fucl 
                    WHERE fucl.user_id = auth.uid() AND fucl.distribution_center_id = dc.id
                )
            )
        )
    );

-- 2. Chart of Accounts (follows cost center)
DROP POLICY IF EXISTS "Users manage own CD chart of accounts" ON public.chart_of_accounts;
CREATE POLICY "Users manage assigned CD chart of accounts"
    ON public.chart_of_accounts FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.cost_centers cc
            JOIN public.distribution_centers dc ON dc.id = cc.distribution_center_id
            WHERE cc.id = cost_center_id 
            AND (
                dc.franchisee_user_id = auth.uid() 
                OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' 
                OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
                OR EXISTS (
                    SELECT 1 FROM public.financial_user_cd_links fucl 
                    WHERE fucl.user_id = auth.uid() AND fucl.distribution_center_id = dc.id
                )
            )
        )
    );

-- 3. Financial Accounts (Franchisee-level)
-- These don't have a distribution_center_id, so we check if the user is linked to ANY CD of that franchisee
DROP POLICY IF EXISTS "Users manage own accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Users view own accounts" ON public.financial_accounts;
CREATE POLICY "Users manage assigned franchisee accounts"
    ON public.financial_accounts FOR ALL
    USING (
        franchisee_user_id = auth.uid() 
        OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' 
        OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
        OR EXISTS (
            SELECT 1 FROM public.financial_user_cd_links fucl
            JOIN public.distribution_centers dc ON dc.id = fucl.distribution_center_id
            WHERE fucl.user_id = auth.uid() AND dc.franchisee_user_id = public.financial_accounts.franchisee_user_id
        )
    );

-- 4. Financial Clients (Franchisee-level, usually created_by = franchisee)
DROP POLICY IF EXISTS "Admin manages clients" ON public.financial_clients;
DROP POLICY IF EXISTS "Operational views clients" ON public.financial_clients;
DROP POLICY IF EXISTS "Operational creates clients" ON public.financial_clients;
CREATE POLICY "Users manage assigned franchisee clients"
    ON public.financial_clients FOR ALL
    USING (
        created_by = auth.uid() 
        OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' 
        OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
        OR EXISTS (
            SELECT 1 FROM public.financial_user_cd_links fucl
            JOIN public.distribution_centers dc ON dc.id = fucl.distribution_center_id
            WHERE fucl.user_id = auth.uid() AND dc.franchisee_user_id = public.financial_clients.created_by
        )
    );

-- 5. Financial Suppliers (Franchisee-level)
DROP POLICY IF EXISTS "Users manage own suppliers" ON public.financial_suppliers;
CREATE POLICY "Users manage assigned franchisee suppliers"
    ON public.financial_suppliers FOR ALL
    USING (
        franchisee_user_id = auth.uid() 
        OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' 
        OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
        OR EXISTS (
            SELECT 1 FROM public.financial_user_cd_links fucl
            JOIN public.distribution_centers dc ON dc.id = fucl.distribution_center_id
            WHERE fucl.user_id = auth.uid() AND dc.franchisee_user_id = public.financial_suppliers.franchisee_user_id
        )
    );

-- 6. Cash Operators (belongs to a franchisee globally or can be linked to CD? Currently belongs to Franchisee)
DROP POLICY IF EXISTS "Users manage own cash operators" ON public.cash_operators;
DROP POLICY IF EXISTS "Users view own cash operators" ON public.cash_operators;
CREATE POLICY "Users manage assigned franchisee operators"
    ON public.cash_operators FOR ALL
    USING (
        franchisee_user_id = auth.uid() 
        OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' 
        OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
        OR EXISTS (
            SELECT 1 FROM public.financial_user_cd_links fucl
            JOIN public.distribution_centers dc ON dc.id = fucl.distribution_center_id
            WHERE fucl.user_id = auth.uid() AND dc.franchisee_user_id = public.cash_operators.franchisee_user_id
        )
    );
