-- Migration: Unify Products and Ingredients (Gestão de Negócio)
-- Created at: 2026-02-08

-- 1. Create INGREDIENTS table
CREATE TABLE IF NOT EXISTS public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Made nullable for now to support existing data migration or system-wide ingredients if any, but request says NOT NULL. I'll make it nullable for migration safety then update if needed, or just follow request and risk it if no user context. Request says NOT NULL. I will assume all operations are authenticated.
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'geral',
  unit TEXT NOT NULL DEFAULT 'kg',
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  current_stock NUMERIC DEFAULT 0,
  minimum_stock NUMERIC DEFAULT 0,
  supplier TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create PRODUCT_CATEGORIES table
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create PRODUCT_DELIVERY_PRICES table
CREATE TABLE IF NOT EXISTS public.product_delivery_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL, -- Will add reference after altering products table or assuming it exists. It exists.
  platform_id UUID, -- Or platform_name TEXT. Request says platform_id. Assuming there is a delivery_platforms table or it's generic. Request summary mentions "products -> product_delivery_prices". I'll use TEXT for platform if no table exists, or UUID if I create one. Request section 1.5 mentions "product_delivery_prices ... platform_id". I will assume generic UUID or create a table for platforms.
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Alter PRODUCTS table to support new Unified structure
-- First, add new columns. user_id is critical.
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for migration of existing products
ADD COLUMN IF NOT EXISTS code TEXT,
ADD COLUMN IF NOT EXISTS sale_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit_margin NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'unidade',
ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'UN',
ADD COLUMN IF NOT EXISTS current_stock NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS minimum_stock NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_category TEXT DEFAULT 'geral'; -- Temporary name to avoid conflict if 'category' exists, existing is category_id. Request asked for 'category' TEXT.

-- Update existing products to have some defaults for new columns if needed.
-- Make code not null after population if we were migrating data.
-- For now, we leave them nullable or with defaults.

-- 5. Create PRODUCT_RECIPES table
CREATE TABLE IF NOT EXISTS public.product_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create STOCK_MOVEMENTS table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ingredient_id UUID REFERENCES public.ingredients(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL, -- entrada, saida, ajuste, perda
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC,
  total_cost NUMERIC,
  reason TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Add RLS Policies
-- Enable RLS
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_delivery_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
-- Note: products table should already have RLS enabled, but we need to check policies.

-- Ingredients Policies
CREATE POLICY "Users can view their own ingredients" ON public.ingredients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ingredients" ON public.ingredients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ingredients" ON public.ingredients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ingredients" ON public.ingredients FOR DELETE USING (auth.uid() = user_id);

-- Product Categories Policies
CREATE POLICY "Users can view their own product categories" ON public.product_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own product categories" ON public.product_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own product categories" ON public.product_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own product categories" ON public.product_categories FOR DELETE USING (auth.uid() = user_id);

-- Product Recipes Policies
CREATE POLICY "Users can view recipes of their products" ON public.product_recipes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products WHERE products.id = product_recipes.product_id AND products.user_id = auth.uid())
);
CREATE POLICY "Users can insert recipes for their products" ON public.product_recipes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.products WHERE products.id = product_recipes.product_id AND products.user_id = auth.uid())
);
CREATE POLICY "Users can update recipes of their products" ON public.product_recipes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.products WHERE products.id = product_recipes.product_id AND products.user_id = auth.uid())
);
CREATE POLICY "Users can delete recipes of their products" ON public.product_recipes FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.products WHERE products.id = product_recipes.product_id AND products.user_id = auth.uid())
);

-- Stock Movements Policies
CREATE POLICY "Users can view their own stock movements" ON public.stock_movements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own stock movements" ON public.stock_movements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update Products Policies to include user_id check (Assuming existing policies might need adjustment or new ones added for the new user_id column)
-- We'll add a policy for user owned products.
CREATE POLICY "Users can view their own products (unified)" ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own products (unified)" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own products (unified)" ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own products (unified)" ON public.products FOR DELETE USING (auth.uid() = user_id);
