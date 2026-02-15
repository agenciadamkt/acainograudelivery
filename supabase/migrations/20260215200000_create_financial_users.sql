-- Migration: Create Financial Users Table
-- Description: Stores employees authorized to access the financial module.
-- Only Admin Master can manage this table. Authorized users can do everything 
-- EXCEPT change record status (approve/reject/cancel).

CREATE TABLE IF NOT EXISTS public.financial_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(email)
);

-- Enable RLS
ALTER TABLE public.financial_users ENABLE ROW LEVEL SECURITY;

-- Admin can manage all financial users
CREATE POLICY "Admin manages financial users" ON public.financial_users
    FOR ALL USING (public.is_admin_master());

-- Everyone can check if they are authorized (for access check)
CREATE POLICY "Users can check own access" ON public.financial_users
    FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Index for fast lookup
CREATE INDEX idx_financial_users_email ON public.financial_users(email);
CREATE INDEX idx_financial_users_user_id ON public.financial_users(user_id);
