-- Migration: Ultimate Dynamic Franchisee Isolation (Supports Operators & Admins Automatically)
-- Description: Removes hardcoded Master IDs. Introduces get_my_franchisee_id() so any financial user automatically maps to their boss's ID.

-- 1. Create a function to dynamically discover what Franchisee ID should be used
CREATE OR REPLACE FUNCTION public.get_my_franchisee_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    my_id UUID;
    master_id UUID;
    v_email TEXT;
BEGIN
    my_id := auth.uid();
    
    -- Get current user email
    SELECT email INTO v_email FROM auth.users WHERE id = my_id;
    
    IF v_email IS NULL THEN
        RETURN my_id;
    END IF;

    -- Check if this user was created as a financial_user (operator or admin)
    SELECT created_by INTO master_id 
    FROM public.financial_users 
    WHERE email = v_email AND active = true
    LIMIT 1;

    -- If I am an employee, use my creator's ID (the master's ID)
    IF master_id IS NOT NULL THEN
        RETURN master_id;
    END IF;

    -- Otherwise, I am the master myself
    RETURN my_id;
END;
$$;

-- 2. Update the trigger to dynamically use this ID for all new inserts, no hardcoded UUIDs
CREATE OR REPLACE FUNCTION public.force_master_franchisee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    effective_master UUID;
BEGIN
    effective_master := public.get_my_franchisee_id();
    
    -- Automatically set the franchisee_user_id to the effective master
    -- regardless of whether it's an operator, admin, or the master creating it.
    NEW.franchisee_user_id := effective_master;

    RETURN NEW;
END;
$$;

-- 3. Overwrite ALL isolation policies to use this dynamic function, giving operators equal data visibility
-- Distribution Centers
DROP POLICY IF EXISTS "Users view own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users view own distribution centers"
    ON public.distribution_centers FOR SELECT
    USING (franchisee_user_id = public.get_my_franchisee_id() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

DROP POLICY IF EXISTS "Users manage own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users manage own distribution centers"
    ON public.distribution_centers FOR ALL
    USING (franchisee_user_id = public.get_my_franchisee_id() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

DROP POLICY IF EXISTS "Users insert own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users insert own distribution centers"
    ON public.distribution_centers FOR INSERT
    WITH CHECK (franchisee_user_id = public.get_my_franchisee_id() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

-- Cash Operators
DROP POLICY IF EXISTS "Users view own cash operators" ON public.cash_operators;
CREATE POLICY "Users view own cash operators"
    ON public.cash_operators FOR SELECT
    USING (franchisee_user_id = public.get_my_franchisee_id() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

DROP POLICY IF EXISTS "Users manage own cash operators" ON public.cash_operators;
CREATE POLICY "Users manage own cash operators"
    ON public.cash_operators FOR ALL
    USING (franchisee_user_id = public.get_my_franchisee_id() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

-- Financial Accounts
DROP POLICY IF EXISTS "Users view own accounts" ON public.financial_accounts;
CREATE POLICY "Users view own accounts"
    ON public.financial_accounts FOR SELECT
    USING (franchisee_user_id = public.get_my_franchisee_id() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

DROP POLICY IF EXISTS "Users manage own accounts" ON public.financial_accounts;
CREATE POLICY "Users manage own accounts"
    ON public.financial_accounts FOR ALL
    USING (franchisee_user_id = public.get_my_franchisee_id() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

-- Cash Closings
DROP POLICY IF EXISTS "Users manage own CD cash closings" ON public.cash_closings;
CREATE POLICY "Users manage own CD cash closings"
    ON public.cash_closings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND (dc.franchisee_user_id = public.get_my_franchisee_id() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com')
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
            AND (dc.franchisee_user_id = public.get_my_franchisee_id() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com')
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
            AND (dc.franchisee_user_id = public.get_my_franchisee_id() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com')
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
            AND (dc.franchisee_user_id = public.get_my_franchisee_id() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com')
        )
        OR (franchisee_user_id = public.get_my_franchisee_id()) 
        OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
    );

DROP POLICY IF EXISTS "Users manage own goals" ON public.financial_goals;
CREATE POLICY "Users manage own goals"
    ON public.financial_goals FOR ALL
    USING (franchisee_user_id = public.get_my_franchisee_id() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

-- Accounts Receivable
DROP POLICY IF EXISTS "Admin manages records" ON public.accounts_receivable;
DROP POLICY IF EXISTS "Users manage own accounts receivable" ON public.accounts_receivable;
CREATE POLICY "Users manage own accounts receivable"
    ON public.accounts_receivable FOR ALL
    USING (franchisee_user_id = public.get_my_franchisee_id() OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com');

-- Financial Transations/Transfers
DROP POLICY IF EXISTS "Authenticated inserts transfers" ON public.financial_transfers;
DROP POLICY IF EXISTS "Users manage own financial transfers" ON public.financial_transfers;
CREATE POLICY "Users manage own financial transfers"
    ON public.financial_transfers FOR ALL
    USING (created_by = public.get_my_franchisee_id() OR auth.uid() = created_by);
