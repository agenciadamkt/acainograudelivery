-- Migration: Add Receipt to Expenses
-- Adds receipt_url column and creates storage bucket

-- 1. Add receipt_url to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- 2. Create storage bucket for receipts if it doesn't exist
-- SQL to create bucket (works in Supabase)
INSERT INTO storage.buckets (id, name, public)
VALUES ('financial_receipts', 'financial_receipts', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies
DROP POLICY IF EXISTS "Public Read Financial Receipts" ON storage.objects;
CREATE POLICY "Public Read Financial Receipts"
ON storage.objects FOR SELECT
USING ( bucket_id = 'financial_receipts' );

DROP POLICY IF EXISTS "Authenticated Upload Financial Receipts" ON storage.objects;
CREATE POLICY "Authenticated Upload Financial Receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'financial_receipts' );

DROP POLICY IF EXISTS "Authenticated Update Financial Receipts" ON storage.objects;
CREATE POLICY "Authenticated Update Financial Receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'financial_receipts' );

DROP POLICY IF EXISTS "Authenticated Delete Financial Receipts" ON storage.objects;
CREATE POLICY "Authenticated Delete Financial Receipts"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'financial_receipts' );
