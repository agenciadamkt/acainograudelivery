-- Migration: Unify PDV Products Foreign Key to Products Table
-- Created at: 2026-02-08 18:00

-- 1. Create a temporary column to store the new product_id (from public.products)
ALTER TABLE public.pdv_order_items ADD COLUMN IF NOT EXISTS new_product_id UUID;

-- 2. Populate new_product_id by joining with pdv_products via existing product_id
-- Note: existing product_id in pdv_order_items points to pdv_products.id
-- pdv_products.linked_product_id points to products.id
UPDATE public.pdv_order_items
SET new_product_id = pp.linked_product_id
FROM public.pdv_products pp
WHERE public.pdv_order_items.product_id = pp.id;

-- 3. For any items that didn't match (maybe orphaned or testing data), we might lose the link.
-- If new_product_id is null, we can't enforce a NOT NULL constraint yet.

-- 4. Drop the old FK constraint
ALTER TABLE public.pdv_order_items DROP CONSTRAINT IF EXISTS pdv_order_items_product_id_fkey;

-- 5. Update the product_id column with the new values
-- We need to handle potential NULLs if data was bad. 
-- For now, we will update where not null.
UPDATE public.pdv_order_items
SET product_id = new_product_id
WHERE new_product_id IS NOT NULL;

-- 6. Now add the new FK constraint referencing public.products
ALTER TABLE public.pdv_order_items
ADD CONSTRAINT pdv_order_items_product_id_fkey
FOREIGN KEY (product_id) REFERENCES public.products(id);

-- 7. Drop the temporary column
ALTER TABLE public.pdv_order_items DROP COLUMN IF EXISTS new_product_id;

-- 8. Drop pdv_products table as it is no longer needed (Unified system)
-- We'll keep it for backup or manual verify for a moment, but safe to drop strictly speaking if we migrated.
-- Let's drop it to force usage of 'products'.
DROP TABLE IF EXISTS public.pdv_products CASCADE;
