-- 1. Create the bucket 'store-assets'
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-assets', 'store-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on objects (it usually is by default, but good to ensure)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Everyone can view (read) the files
DROP POLICY IF EXISTS "Public Store Assets Access" ON storage.objects;
CREATE POLICY "Public Store Assets Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'store-assets' );

-- 4. Policy: Authenticated users can Upload
DROP POLICY IF EXISTS "Authenticated Upload Store Assets" ON storage.objects;
CREATE POLICY "Authenticated Upload Store Assets"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'store-assets' AND auth.role() = 'authenticated' );

-- 5. Policy: Authenticated users can Update (replace files)
DROP POLICY IF EXISTS "Authenticated Update Store Assets" ON storage.objects;
CREATE POLICY "Authenticated Update Store Assets"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'store-assets' AND auth.role() = 'authenticated' );

-- 6. Policy: Authenticated users can Delete
DROP POLICY IF EXISTS "Authenticated Delete Store Assets" ON storage.objects;
CREATE POLICY "Authenticated Delete Store Assets"
ON storage.objects FOR DELETE
USING ( bucket_id = 'store-assets' AND auth.role() = 'authenticated' );
