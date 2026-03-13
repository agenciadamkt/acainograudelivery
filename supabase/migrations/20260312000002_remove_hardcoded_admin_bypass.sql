-- Migration: Ultimate Data Isolation & Security Cleanup
-- Description: Removes ALL hardcoded admin bypasses for 'acainograuwagner@gmail.com' and 'agenciadamkt@gmail.com'. 
-- Restores strict multi-tenant isolation and deregisters unauthorized admin access.

-- 1. CLEANUP: Remove unauthorized user from financial_users
DELETE FROM public.financial_users WHERE email = 'acainograuwagner@gmail.com';

-- 2. RE-DEFINE: is_admin_master (Remove hardcoded agenciadamkt)
CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Get current user email from auth.users (secure)
    SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
    
    -- ONLY return true if they are explicitly registered as an admin in financial_users
    -- This allows the user to manage their OWN admins without developer bypasses.
    RETURN EXISTS (
        SELECT 1 FROM public.financial_users 
        WHERE email = user_email 
        AND role = 'admin' 
        AND active = true
    );
END;
$$;

-- 3. RE-DEFINE: get_my_franchisee_id (Robust & No Bypasses)
CREATE OR REPLACE FUNCTION public.get_my_franchisee_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    my_id UUID;
    v_master_id UUID;
    v_email TEXT;
BEGIN
    my_id := auth.uid();
    IF my_id IS NULL THEN RETURN NULL; END IF;
    
    -- Get email from auth
    SELECT email INTO v_email FROM auth.users WHERE id = my_id;
    
    -- Check if I am an employee/admin managed by a franchisee
    SELECT created_by INTO v_master_id 
    FROM public.financial_users 
    WHERE email = v_email AND active = true
    LIMIT 1;

    -- If I am an employee, return my creator's ID
    IF v_master_id IS NOT NULL THEN
        RETURN v_master_id;
    END IF;

    -- Otherwise, I am the root franchisee
    RETURN my_id;
END;
$$;

-- 4. RE-APPLY POLICIES: Remove all hardcoded email filters

-- Distribution Centers
DROP POLICY IF EXISTS "Users view own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users view own distribution centers" ON public.distribution_centers FOR SELECT
    USING (franchisee_user_id = public.get_my_franchisee_id());

DROP POLICY IF EXISTS "Users manage own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users manage own distribution centers" ON public.distribution_centers FOR ALL
    USING (franchisee_user_id = public.get_my_franchisee_id());

DROP POLICY IF EXISTS "Users insert own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users insert own distribution centers" ON public.distribution_centers FOR INSERT
    WITH CHECK (franchisee_user_id = public.get_my_franchisee_id());

-- Cash Operators
DROP POLICY IF EXISTS "Users view own cash operators" ON public.cash_operators;
DROP POLICY IF EXISTS "Admin bypass Cash Operators" ON public.cash_operators;
CREATE POLICY "Users view own cash operators" ON public.cash_operators FOR SELECT
    USING (franchisee_user_id = public.get_my_franchisee_id());

DROP POLICY IF EXISTS "Users manage own cash operators" ON public.cash_operators;
CREATE POLICY "Users manage own cash operators" ON public.cash_operators FOR ALL
    USING (franchisee_user_id = public.get_my_franchisee_id());

-- Financial Accounts
DROP POLICY IF EXISTS "Users view own accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Admin bypass Financial Accounts" ON public.financial_accounts;
CREATE POLICY "Users view own accounts" ON public.financial_accounts FOR SELECT
    USING (franchisee_user_id = public.get_my_franchisee_id());

DROP POLICY IF EXISTS "Users manage own accounts" ON public.financial_accounts;
CREATE POLICY "Users manage own accounts" ON public.financial_accounts FOR ALL
    USING (franchisee_user_id = public.get_my_franchisee_id());

-- Cash Closings
DROP POLICY IF EXISTS "Users manage own CD cash closings" ON public.cash_closings;
CREATE POLICY "Users manage own CD cash closings" ON public.cash_closings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND dc.franchisee_user_id = public.get_my_franchisee_id()
        )
    );

-- Expenses
DROP POLICY IF EXISTS "Users manage own CD expenses" ON public.expenses;
CREATE POLICY "Users manage own CD expenses" ON public.expenses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND dc.franchisee_user_id = public.get_my_franchisee_id()
        )
    );

-- Financial Records
DROP POLICY IF EXISTS "Users manage own CD financial records" ON public.financial_records;
CREATE POLICY "Users manage own CD financial records" ON public.financial_records FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND dc.franchisee_user_id = public.get_my_franchisee_id()
        )
    );

-- Financial Goals
DROP POLICY IF EXISTS "Users view own CD goals" ON public.financial_goals;
CREATE POLICY "Users view own CD goals" ON public.financial_goals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND dc.franchisee_user_id = public.get_my_franchisee_id()
        )
        OR (franchisee_user_id = public.get_my_franchisee_id())
    );

DROP POLICY IF EXISTS "Users manage own goals" ON public.financial_goals;
CREATE POLICY "Users manage own goals" ON public.financial_goals FOR ALL
    USING (franchisee_user_id = public.get_my_franchisee_id());

-- Accounts Receivable
DROP POLICY IF EXISTS "Users manage own accounts receivable" ON public.accounts_receivable;
CREATE POLICY "Users manage own accounts receivable" ON public.accounts_receivable FOR ALL
    USING (franchisee_user_id = public.get_my_franchisee_id());

-- Chart of Accounts
DROP POLICY IF EXISTS "Admin bypass Chart Accounts" ON public.chart_of_accounts;
CREATE POLICY "Chart of accounts visibility" ON public.chart_of_accounts FOR SELECT
    USING (active = true); -- Base categories are public, but can be managed by franchisee logic if needed

-- Cost Centers
DROP POLICY IF EXISTS "Admin bypass Cost Centers" ON public.cost_centers;
CREATE POLICY "Cost centers visibility" ON public.cost_centers FOR SELECT
    USING (active = true);

-- Financial Clients
DROP POLICY IF EXISTS "Admin bypass Financial Clients" ON public.financial_clients;
CREATE POLICY "Users manage own clients" ON public.financial_clients FOR ALL
    USING (created_by = public.get_my_franchisee_id() OR auth.uid() = created_by);

-- 5. RE-APPLY: Order System (Ensure no public.is_admin_master bypasses there either)
DROP POLICY IF EXISTS "Franchisees view own orders" ON public.franchisee_orders;
CREATE POLICY "Franchisees view own orders" ON public.franchisee_orders FOR SELECT
    USING (auth.uid() = franchisee_user_id OR public.is_admin_master()); -- is_admin_master is now dynamic!

DROP POLICY IF EXISTS "Admin manages all orders" ON public.franchisee_orders;
CREATE POLICY "Admin manages all orders" ON public.franchisee_orders FOR ALL
    USING (public.is_admin_master());

DROP POLICY IF EXISTS "Franchisees view own order items" ON public.franchisee_order_items;
CREATE POLICY "Franchisees view own order items" ON public.franchisee_order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.franchisee_orders
            WHERE id = order_id AND (franchisee_user_id = auth.uid() OR public.is_admin_master())
        )
    );

-- 6. COPILOT CLEANUP
DROP POLICY IF EXISTS "Allow admins full access to insights" ON public.copilot_insights;
CREATE POLICY "Allow admins full access to insights" ON public.copilot_insights FOR ALL
    USING (franchisee_user_id = public.get_my_franchisee_id());
