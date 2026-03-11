-- Migration: Allow Financial Admins to Bypass Franchisee Isolation
-- Description: Updates the isolation policies so that financial admins (like Juliana) can see the Master Franchisee's data.

-- Distribution Centers
DROP POLICY IF EXISTS "Users view own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users view own distribution centers"
    ON public.distribution_centers FOR SELECT
    USING (franchisee_user_id = auth.uid() OR public.is_admin_master() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

DROP POLICY IF EXISTS "Users manage own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users manage own distribution centers"
    ON public.distribution_centers FOR ALL
    USING (franchisee_user_id = auth.uid() OR public.is_admin_master() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

DROP POLICY IF EXISTS "Users insert own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users insert own distribution centers"
    ON public.distribution_centers FOR INSERT
    WITH CHECK (franchisee_user_id = auth.uid() OR public.is_admin_master() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

-- Cash Operators
DROP POLICY IF EXISTS "Users view own cash operators" ON public.cash_operators;
CREATE POLICY "Users view own cash operators"
    ON public.cash_operators FOR SELECT
    USING (franchisee_user_id = auth.uid() OR public.is_admin_master() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

DROP POLICY IF EXISTS "Users manage own cash operators" ON public.cash_operators;
CREATE POLICY "Users manage own cash operators"
    ON public.cash_operators FOR ALL
    USING (franchisee_user_id = auth.uid() OR public.is_admin_master() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

-- Financial Accounts
DROP POLICY IF EXISTS "Users view own accounts" ON public.financial_accounts;
CREATE POLICY "Users view own accounts"
    ON public.financial_accounts FOR SELECT
    USING (franchisee_user_id = auth.uid() OR public.is_admin_master() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

DROP POLICY IF EXISTS "Users manage own accounts" ON public.financial_accounts;
CREATE POLICY "Users manage own accounts"
    ON public.financial_accounts FOR ALL
    USING (franchisee_user_id = auth.uid() OR public.is_admin_master() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

-- Cash Closings
DROP POLICY IF EXISTS "Users manage own CD cash closings" ON public.cash_closings;
CREATE POLICY "Users manage own CD cash closings"
    ON public.cash_closings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND (dc.franchisee_user_id = auth.uid() OR public.is_admin_master() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com')
        )
    );

-- Expenses
DROP POLICY IF EXISTS "Users manage own CD expenses" ON public.expenses;
CREATE POLICY "Users manage own CD expenses"
    ON public.expenses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND (dc.franchisee_user_id = auth.uid() OR public.is_admin_master() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com')
        )
    );

-- Financial Records
DROP POLICY IF EXISTS "Users manage own CD financial records" ON public.financial_records;
CREATE POLICY "Users manage own CD financial records"
    ON public.financial_records FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND (dc.franchisee_user_id = auth.uid() OR public.is_admin_master() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com')
        )
    );

-- Financial Goals
DROP POLICY IF EXISTS "Users view own CD goals" ON public.financial_goals;
CREATE POLICY "Users view own CD goals"
    ON public.financial_goals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND (dc.franchisee_user_id = auth.uid() OR public.is_admin_master() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com')
        )
        OR (franchisee_user_id = auth.uid()) 
        OR public.is_admin_master()
        OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
    );

DROP POLICY IF EXISTS "Users manage own goals" ON public.financial_goals;
CREATE POLICY "Users manage own goals"
    ON public.financial_goals FOR ALL
    USING (franchisee_user_id = auth.uid() OR public.is_admin_master() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');
