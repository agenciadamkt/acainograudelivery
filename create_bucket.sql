-- Create storage bucket for financial evidence
INSERT INTO storage.buckets (id, name, public) 
VALUES ('financial_evidence', 'financial_evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload evidence" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'financial_evidence');

-- Policy to allow anyone to view evidence (since it's public bucket)
-- Or restricted to authenticated if you prefer privacy
CREATE POLICY "Anyone can view evidence" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'financial_evidence');

-- Policy to allow users to update their own files (optional)
CREATE POLICY "Users can update own evidence" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'financial_evidence' AND auth.uid() = owner);

-- Policy to allow users to delete their own files
CREATE POLICY "Users can delete own evidence" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'financial_evidence' AND auth.uid() = owner);
