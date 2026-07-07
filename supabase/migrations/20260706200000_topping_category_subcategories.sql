-- Allow topping categories to nest under a parent category (subcategories),
-- e.g. "Cremes" -> "Cremes Especiais".
ALTER TABLE public.topping_categories
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.topping_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_topping_categories_parent_id ON public.topping_categories(parent_id);
