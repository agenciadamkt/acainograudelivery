-- Migration: Force Master Franchisee ID for financial employees
-- Description: Ensures that any records created by financial employees are assigned to the Master Franchisee

CREATE OR REPLACE FUNCTION public.force_master_franchisee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_fin_employee BOOLEAN;
BEGIN
    -- Check if current user is active in financial_users
    SELECT EXISTS (
        SELECT 1 FROM financial_users 
        WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND active = true
    ) INTO is_fin_employee;

    -- If the user is a financial employee (not the master), force the franchisee_user_id to be the master's ID
    IF is_fin_employee AND NEW.franchisee_user_id != '97cc4f78-31e6-4113-a8a6-6d14d4166c38' THEN
        NEW.franchisee_user_id := '97cc4f78-31e6-4113-a8a6-6d14d4166c38';
    END IF;

    RETURN NEW;
END;
$$;

-- Create triggers on tables that use franchisee_user_id
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN (VALUES 
        ('financial_accounts'),
        ('distribution_centers'),
        ('cost_centers'),
        ('chart_of_accounts'),
        ('financial_goals'),
        ('accounts_receivable'),
        ('cash_operators'),
        ('financial_payment_methods')
    )
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_force_master_franchisee ON public.%I;
            CREATE TRIGGER trg_force_master_franchisee
            BEFORE INSERT ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.force_master_franchisee();
        ', t_name, t_name);
    END LOOP;
END;
$$;
