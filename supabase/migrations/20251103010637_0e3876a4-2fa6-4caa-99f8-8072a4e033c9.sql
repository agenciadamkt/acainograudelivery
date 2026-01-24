-- Fix: Block anonymous access to customers table
-- This adds an explicit policy to prevent unauthenticated users from accessing customer PII

CREATE POLICY "Block anonymous access to customers" 
ON public.customers 
FOR SELECT 
TO anon
USING (false);

-- Verify RLS is enabled (should already be enabled, but ensuring it)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;