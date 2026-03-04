-- Optimized & Permissive Migration for Admins
-- This version prioritizes admin access to prevent timeouts and restore visibility.

-- 1. Ensure columns exist
ALTER TABLE public.distribution_centers ADD COLUMN IF NOT EXISTS franchisee_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.cash_operators ADD COLUMN IF NOT EXISTS franchisee_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS franchisee_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.financial_goals ADD COLUMN IF NOT EXISTS franchisee_user_id UUID REFERENCES auth.users(id);

-- 2. Performance Indices (Crucial for large data sets)
CREATE INDEX IF NOT EXISTS idx_dc_franchisee ON public.distribution_centers(franchisee_user_id);
CREATE INDEX IF NOT EXISTS idx_dc_active ON public.distribution_centers(active);
CREATE INDEX IF NOT EXISTS idx_cash_closings_dc ON public.cash_closings(distribution_center_id);
CREATE INDEX IF NOT EXISTS idx_expenses_dc ON public.expenses(distribution_center_id);

-- 3. Optimized RLS for Distribution Centers
DROP POLICY IF EXISTS "Users view own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users view own distribution centers" ON public.distribution_centers FOR SELECT
    USING ((auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com') OR franchisee_user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users manage own distribution centers" ON public.distribution_centers FOR ALL
    USING ((auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com') OR franchisee_user_id = auth.uid());

-- 4. Optimized RLS for Cash Closings (Bypass subquery if Admin)
DROP POLICY IF EXISTS "Users manage own CD cash closings" ON public.cash_closings;
CREATE POLICY "Users manage own CD cash closings" ON public.cash_closings FOR ALL
    USING (
        (auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com')
        OR
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND dc.franchisee_user_id = auth.uid()
        )
    );

-- 5. Optimized RLS for Expenses (Bypass subquery if Admin)
DROP POLICY IF EXISTS "Users manage own CD expenses" ON public.expenses;
CREATE POLICY "Users manage own CD expenses" ON public.expenses FOR ALL
    USING (
        (auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com')
        OR
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND dc.franchisee_user_id = auth.uid()
        )
    );

-- 6. Optimized RLS for Financial Records
DROP POLICY IF EXISTS "Users manage own CD financial records" ON public.financial_records;
CREATE POLICY "Users manage own CD financial records" ON public.financial_records FOR ALL
    USING (
        (auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com')
        OR
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND dc.franchisee_user_id = auth.uid()
        )
    );

-- 7. Optimized RLS for Financial Accounts
DROP POLICY IF EXISTS "Users view own accounts" ON public.financial_accounts;
CREATE POLICY "Users view own accounts" ON public.financial_accounts FOR SELECT
    USING ((auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com') OR franchisee_user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own accounts" ON public.financial_accounts;
CREATE POLICY "Users manage own accounts" ON public.financial_accounts FOR ALL
    USING ((auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com') OR franchisee_user_id = auth.uid());

-- 8. Optimized RLS for Goals
DROP POLICY IF EXISTS "Users view own CD goals" ON public.financial_goals;
CREATE POLICY "Users view own CD goals" ON public.financial_goals FOR SELECT
    USING (
        (auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com')
        OR
        franchisee_user_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND dc.franchisee_user_id = auth.uid()
        )
    );
