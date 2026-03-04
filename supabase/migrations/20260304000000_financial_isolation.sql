-- Migration: Add Financial Isolation per Franchisee
-- Description: Adds franchisee_user_id to core financial tables and updates RLS policies.

-- 1. Add franchisee_user_id to tables that don't have it
ALTER TABLE public.distribution_centers ADD COLUMN IF NOT EXISTS franchisee_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.cash_operators ADD COLUMN IF NOT EXISTS franchisee_user_id UUID REFERENCES auth.users(id);
ALTER TABLE public.financial_accounts ADD COLUMN IF NOT EXISTS franchisee_user_id UUID REFERENCES auth.users(id);

-- 2. Update existing records (Assign to the first admin found as a fallback)
DO $$
DECLARE
    admin_id UUID;
BEGIN
    SELECT id INTO admin_id FROM auth.users WHERE email = 'agenciadamkt@gmail.com' LIMIT 1;
    
    UPDATE public.distribution_centers SET franchisee_user_id = admin_id WHERE franchisee_user_id IS NULL;
    UPDATE public.cash_operators SET franchisee_user_id = admin_id WHERE franchisee_user_id IS NULL;
    UPDATE public.financial_accounts SET franchisee_user_id = admin_id WHERE franchisee_user_id IS NULL;
END $$;

-- 3. RLS Policies for Distribution Centers
DROP POLICY IF EXISTS "Everyone views active distribution centers" ON public.distribution_centers;
DROP POLICY IF EXISTS "Users view own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users view own distribution centers"
    ON public.distribution_centers FOR SELECT
    USING (franchisee_user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

DROP POLICY IF EXISTS "Admin manages distribution centers" ON public.distribution_centers;
DROP POLICY IF EXISTS "Users manage own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users manage own distribution centers"
    ON public.distribution_centers FOR ALL
    USING (franchisee_user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

DROP POLICY IF EXISTS "Authenticated inserts distribution centers" ON public.distribution_centers;
DROP POLICY IF EXISTS "Users insert own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users insert own distribution centers"
    ON public.distribution_centers FOR INSERT
    WITH CHECK (franchisee_user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

-- 4. RLS Policies for Cash Operators
DROP POLICY IF EXISTS "Everyone views active cash operators" ON public.cash_operators;
DROP POLICY IF EXISTS "Users view own cash operators" ON public.cash_operators;
CREATE POLICY "Users view own cash operators"
    ON public.cash_operators FOR SELECT
    USING (franchisee_user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

DROP POLICY IF EXISTS "Admin manages cash operators" ON public.cash_operators;
DROP POLICY IF EXISTS "Users manage own cash operators" ON public.cash_operators;
CREATE POLICY "Users manage own cash operators"
    ON public.cash_operators FOR ALL
    USING (franchisee_user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

-- 5. RLS Policies for Financial Accounts
DROP POLICY IF EXISTS "Everyone views accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Users view own accounts" ON public.financial_accounts;
CREATE POLICY "Users view own accounts"
    ON public.financial_accounts FOR SELECT
    USING (franchisee_user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

DROP POLICY IF EXISTS "Admin manages accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Users manage own accounts" ON public.financial_accounts;
CREATE POLICY "Users manage own accounts"
    ON public.financial_accounts FOR ALL
    USING (franchisee_user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

-- 6. RLS Policies for Cash Closings
DROP POLICY IF EXISTS "Everyone views cash closings" ON public.cash_closings;
DROP POLICY IF EXISTS "Users view own CD cash closings" ON public.cash_closings;
DROP POLICY IF EXISTS "Users manage own CD cash closings" ON public.cash_closings;
CREATE POLICY "Users manage own CD cash closings"
    ON public.cash_closings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND (dc.franchisee_user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com')
        )
    );

-- 7. RLS Policies for Expenses
DROP POLICY IF EXISTS "Everyone views expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users view own CD expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users manage own CD expenses" ON public.expenses;
CREATE POLICY "Users manage own CD expenses"
    ON public.expenses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND (dc.franchisee_user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com')
        )
    );

-- 8. RLS Policies for Financial Records
DROP POLICY IF EXISTS "Operational views records" ON public.financial_records;
DROP POLICY IF EXISTS "Users view own CD financial records" ON public.financial_records;
DROP POLICY IF EXISTS "Users manage own CD financial records" ON public.financial_records;
CREATE POLICY "Users manage own CD financial records"
    ON public.financial_records FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND (dc.franchisee_user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com')
        )
    );

-- 9. Isolation for Financial Goals
ALTER TABLE public.financial_goals ADD COLUMN IF NOT EXISTS franchisee_user_id UUID REFERENCES auth.users(id);

DROP POLICY IF EXISTS "Everyone views goals" ON public.financial_goals;
DROP POLICY IF EXISTS "Users view own CD goals" ON public.financial_goals;
CREATE POLICY "Users view own CD goals"
    ON public.financial_goals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND (dc.franchisee_user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com')
        )
        OR (franchisee_user_id = auth.uid()) 
        OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com'
        OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
    );

DROP POLICY IF EXISTS "Admin manages goals" ON public.financial_goals;
DROP POLICY IF EXISTS "Users manage own goals" ON public.financial_goals;
CREATE POLICY "Users manage own goals"
    ON public.financial_goals FOR ALL
    USING (franchisee_user_id = auth.uid() OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');
