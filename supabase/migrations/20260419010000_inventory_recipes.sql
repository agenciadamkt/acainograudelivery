-- Migration: Create Inventory Recipes for Stock Deduction
-- This table links Menu Products to the new Inventory Items

-- 1. Create INVENTORY_RECIPES table
CREATE TABLE IF NOT EXISTS public.inventory_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, item_id)
);

-- 2. Enable RLS
ALTER TABLE public.inventory_recipes ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Unidade visualiza suas receitas" ON public.inventory_recipes 
  FOR SELECT USING (store_id IN (SELECT id FROM public.stores));

CREATE POLICY "Gestor gerencia receitas" ON public.inventory_recipes 
  FOR ALL USING (store_id IN (SELECT id FROM public.stores));

-- 4. Indexes for performance
CREATE INDEX idx_inventory_recipes_product ON public.inventory_recipes(product_id);
CREATE INDEX idx_inventory_recipes_item ON public.inventory_recipes(item_id);
CREATE INDEX idx_inventory_recipes_store ON public.inventory_recipes(store_id);

-- 5. Trigger for updated_at
CREATE TRIGGER update_inventory_recipes_modtime
    BEFORE UPDATE ON public.inventory_recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
