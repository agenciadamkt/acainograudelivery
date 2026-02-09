-- Migration: Fix RLS policies for product_recipes table
-- Created at: 2026-02-08 22:00:00

-- First, ensure RLS is enabled
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to view product_recipes" ON public.product_recipes;
DROP POLICY IF EXISTS "Allow authenticated users to insert product_recipes" ON public.product_recipes;
DROP POLICY IF EXISTS "Allow authenticated users to update product_recipes" ON public.product_recipes;
DROP POLICY IF EXISTS "Allow authenticated users to delete product_recipes" ON public.product_recipes;

-- Create policies for authenticated users

-- SELECT: Allow any authenticated user to view recipes
CREATE POLICY "Allow authenticated users to view product_recipes"
ON public.product_recipes
FOR SELECT
TO authenticated
USING (true);

-- INSERT: Allow any authenticated user to insert recipes
CREATE POLICY "Allow authenticated users to insert product_recipes"
ON public.product_recipes
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Allow any authenticated user to update recipes
CREATE POLICY "Allow authenticated users to update product_recipes"
ON public.product_recipes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE: Allow any authenticated user to delete recipes
CREATE POLICY "Allow authenticated users to delete product_recipes"
ON public.product_recipes
FOR DELETE
TO authenticated
USING (true);

-- Also fix the ingredients table RLS if needed
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users to view ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Allow authenticated users to insert ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Allow authenticated users to update ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Allow authenticated users to delete ingredients" ON public.ingredients;

CREATE POLICY "Allow authenticated users to view ingredients"
ON public.ingredients
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert ingredients"
ON public.ingredients
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update ingredients"
ON public.ingredients
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete ingredients"
ON public.ingredients
FOR DELETE
TO authenticated
USING (true);
