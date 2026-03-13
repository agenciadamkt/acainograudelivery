-- Migration: Final fix for Order Management visibility
-- 1. Rock-solid is_admin_master function
-- 2. Open up profiles for master admins
-- 3. Ensure orders are fully visible to master admins

-- 1. UPDATE is_admin_master (most robust version)
CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Standard check by email in JWT (fastest)
    IF (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' THEN
        RETURN true;
    END IF;

    -- Backup check by email in table
    RETURN EXISTS (
        SELECT 1 FROM public.financial_users 
        WHERE email = (auth.jwt() ->> 'email') 
        AND role = 'admin' 
        AND active = true
    );
END;
$$;

-- 2. PERMISSIONS FOR PROFILES (Crucial for the join)
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON public.profiles;
CREATE POLICY "Admins podem ver todos os perfis"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_admin_master());

-- 3. PERMISSIONS FOR FRANCHISEE ORDERS
DROP POLICY IF EXISTS "Franchisees view own orders" ON public.franchisee_orders;
DROP POLICY IF EXISTS "Admin manages all orders" ON public.franchisee_orders;

CREATE POLICY "Anyone view orders select"
ON public.franchisee_orders FOR SELECT
USING (auth.uid() = franchisee_user_id OR public.is_admin_master());

CREATE POLICY "Admin manage orders all"
ON public.franchisee_orders FOR ALL
USING (public.is_admin_master())
WITH CHECK (public.is_admin_master());

-- 4. PERMISSIONS FOR ORDER ITEMS
DROP POLICY IF EXISTS "Franchisees view own order items" ON public.franchisee_order_items;

CREATE POLICY "Anyone view order items"
ON public.franchisee_order_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.franchisee_orders
        WHERE id = order_id AND (franchisee_user_id = auth.uid() OR public.is_admin_master())
    )
);
