-- Create storage bucket for University Materials (PDFs, docs, etc)
INSERT INTO storage.buckets (id, name, public)
VALUES ('university-materials', 'university-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public Access University Materials"
ON storage.objects FOR SELECT
USING ( bucket_id = 'university-materials' );

-- Allow authenticated users to upload
CREATE POLICY "Authenticated Upload University Materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'university-materials' );

-- Allow authenticated users to delete
CREATE POLICY "Authenticated Delete University Materials"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'university-materials' );
