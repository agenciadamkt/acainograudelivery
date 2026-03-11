-- Migration: Update is_admin_master function to include financial_users admins
-- Description: Allows users registered as 'admin' in financial_users to also act as master admins for RLS

CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_email TEXT;
    is_fin_admin BOOLEAN;
BEGIN
    -- Get current user email
    SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
    
    -- Check if it's the master
    IF user_email = 'agenciadamkt@gmail.com' THEN
        RETURN true;
    END IF;

    -- Check if user is an admin in financial_users
    SELECT EXISTS (
        SELECT 1 FROM financial_users 
        WHERE email = user_email 
        AND role = 'admin' 
        AND active = true
    ) INTO is_fin_admin;

    RETURN is_fin_admin;
END;
$$;
