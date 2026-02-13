-- Create storage bucket for University Thumbnails
-- Run this in Supabase SQL Editor

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('university-thumbnails', 'university-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS (Security)
-- (Buckets allow RLS by default, policies are on storage.objects)

-- 3. Create Policies
-- Allow public read access to all images in this bucket
CREATE POLICY "Public Access University Thumbnails"
ON storage.objects FOR SELECT
USING ( bucket_id = 'university-thumbnails' );

-- Allow authenticated users (staff/admins) to upload images
CREATE POLICY "Authenticated Upload University Thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'university-thumbnails' );

-- Allow authenticated users to update/delete their images
CREATE POLICY "Authenticated Delete University Thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'university-thumbnails' );

CREATE POLICY "Authenticated Update University Thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'university-thumbnails' );
