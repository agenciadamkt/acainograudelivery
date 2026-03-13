-- Migration: Add display_order to franchisee_products
-- Fixes error when saving products that include a display_order

ALTER TABLE public.franchisee_products 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
