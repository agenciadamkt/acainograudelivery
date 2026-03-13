-- Migration: Add management policies for franchisee products and categories
-- Allows master admins to CREATE, UPDATE and DELETE items

-- 1. Products Management
CREATE POLICY "Admins can manage products"
    ON public.franchisee_products FOR ALL
    USING (public.is_admin_master())
    WITH CHECK (public.is_admin_master());

-- 2. Categories Management
CREATE POLICY "Admins can manage categories"
    ON public.franchisee_product_categories FOR ALL
    USING (public.is_admin_master())
    WITH CHECK (public.is_admin_master());
