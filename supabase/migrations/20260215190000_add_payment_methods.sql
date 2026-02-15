-- Migration: Add Payment Methods and Installments
-- Description: Adds a payment methods table and updates financial records to support detailed payment info.

-- 1. Create Payment Methods Table
CREATE TABLE IF NOT EXISTS public.financial_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE, -- 'pix', 'credit_card', etc. for code reference
    is_credit BOOLEAN DEFAULT false, -- To trigger installments logic
    created_at TIMESTAMPTZ DEFAULT now(),
    active BOOLEAN DEFAULT true
);

-- 2. Seed Default Methods
INSERT INTO public.financial_payment_methods (name, slug, is_credit) VALUES
    ('Pix', 'pix', false),
    ('Dinheiro', 'cash', false),
    ('Transferência Bancária', 'transfer', false),
    ('Cartão de Débito', 'debit_card', false),
    ('Cartão de Crédito', 'credit_card', true),
    ('Vale Refeição/Alimentação', 'voucher', false)
ON CONFLICT (slug) DO NOTHING;

-- 3. Update Financial Records Table
ALTER TABLE public.financial_records 
ADD COLUMN IF NOT EXISTS payment_method_id UUID REFERENCES public.financial_payment_methods(id),
ADD COLUMN IF NOT EXISTS installments INTEGER DEFAULT 1;

-- 4. Enable RLS on new table
ALTER TABLE public.financial_payment_methods ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Payment Methods
-- Everyone can view active methods
CREATE POLICY "Everyone views active payment methods" ON public.financial_payment_methods
    FOR SELECT USING (active = true);

-- Admin can manage methods
CREATE POLICY "Admin manages payment methods" ON public.financial_payment_methods
    FOR ALL USING (public.is_admin_master());

-- Operational can create new methods (as requested "option to register new")
CREATE POLICY "Operational creates payment methods" ON public.financial_payment_methods
    FOR INSERT WITH CHECK (true);
