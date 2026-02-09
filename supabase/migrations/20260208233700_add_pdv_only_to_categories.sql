-- Migration: Add pdv_only flag to categories
-- Created at: 2026-02-08 23:37:00
-- Purpose: Allow categories to be marked as PDV only (not shown in delivery app)

-- Add pdv_only column to categories table
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS pdv_only BOOLEAN DEFAULT false;

-- Add comment explaining the field
COMMENT ON COLUMN public.categories.pdv_only IS 'When true, this category and its products will only appear in the PDV, not in the delivery app';

-- Update Self-Service category to be PDV only (if it exists)
UPDATE public.categories 
SET pdv_only = true 
WHERE LOWER(name) LIKE '%self%service%' 
   OR LOWER(name) LIKE '%self-service%'
   OR LOWER(name) = 'selfservice';
