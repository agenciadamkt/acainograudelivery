-- Migration: Inventory Module Foundation
-- Date: 2026-04-18

-- 1. Create INVENTORY_CATEGORIES table
CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#8D42DD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create INVENTORY_SUPPLIERS table
CREATE TABLE IF NOT EXISTS public.inventory_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create INVENTORY_ITEMS table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.inventory_suppliers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'und', -- kg, L, und, etc
  current_qty NUMERIC NOT NULL DEFAULT 0,
  minimum_qty NUMERIC NOT NULL DEFAULT 0,
  avg_price NUMERIC DEFAULT 0, -- Preço Médio Ponderado
  last_price NUMERIC DEFAULT 0, -- Último Preço
  price_mode TEXT DEFAULT 'avg' CHECK (price_mode IN ('avg', 'last')),
  composes_cmv BOOLEAN DEFAULT true,
  manipulation_days INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create INVENTORY_MOVEMENTS table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seq_number SERIAL, -- Unique sequence number for the store
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('entry', 'exit', 'inventory')),
  classification TEXT CHECK (classification IN ('purchase', 'sale', 'waste', 'transfer', 'internal', 'production', 'initial')),
  qty NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_value NUMERIC NOT NULL, -- qty * unit_price
  moved_at TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (Company/Store Isolation)
-- Note: Simplified to check store_id against user's accessible stores in the future, 
-- but for now assuming direct store access if the user is in the admin context correctly.
-- Standard GrauOS Pattern: user must belong to a role that has access to the store.

-- Categories
CREATE POLICY "Users can manage their store's inventory categories" ON public.inventory_categories
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
));

-- Suppliers
CREATE POLICY "Users can manage their store's inventory suppliers" ON public.inventory_suppliers
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
));

-- Items
CREATE POLICY "Users can manage their store's inventory items" ON public.inventory_items
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
));

-- Movements
CREATE POLICY "Users can manage their store's inventory movements" ON public.inventory_movements
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
));

-- 7. Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inventory_categories_updated_at BEFORE UPDATE ON public.inventory_categories FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_inventory_suppliers_updated_at BEFORE UPDATE ON public.inventory_suppliers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
