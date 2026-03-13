-- Migration: Ensure products storage bucket exists and is public
-- Adds policies for authenticated users to upload and anyone to view

DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('products', 'products', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
END $$;

-- Policies for public access to products
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'products' );

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'products' );

CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'products' );

CREATE POLICY "Authenticated users can delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'products' );
