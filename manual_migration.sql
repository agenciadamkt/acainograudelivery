-- RODE ESTE SCRIPT NO EDITOR SQL DO SUPABASE SE AS TABELAS NÃO EXISTIREM

-- 1. Financial Clients
CREATE TABLE IF NOT EXISTS public.financial_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    document TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Payment Methods
CREATE TABLE IF NOT EXISTS public.financial_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    is_credit BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    active BOOLEAN DEFAULT true
);

INSERT INTO public.financial_payment_methods (name, slug, is_credit) VALUES
    ('Pix', 'pix', false),
    ('Dinheiro', 'cash', false),
    ('Transferência Bancária', 'transfer', false),
    ('Cartão de Débito', 'debit_card', false),
    ('Cartão de Crédito', 'credit_card', true),
    ('Vale Refeição/Alimentação', 'voucher', false)
ON CONFLICT (slug) DO NOTHING;

-- 3. Financial Records
CREATE TABLE IF NOT EXISTS public.financial_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    client_id UUID REFERENCES public.financial_clients(id),
    payment_method_id UUID REFERENCES public.financial_payment_methods(id),
    installments INTEGER DEFAULT 1,
    
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'write_off', 'other')),
    amount DECIMAL(12,2) NOT NULL,
    
    order_number TEXT,
    description TEXT,
    evidence_url TEXT,
    
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    
    created_by_email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Financial Audit Logs
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES public.financial_records(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    justification TEXT,
    previous_status TEXT,
    new_status TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS (Security)
ALTER TABLE public.financial_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All" ON public.financial_clients FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.financial_records FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.financial_audit_logs FOR ALL USING (true);
CREATE POLICY "Allow All" ON public.financial_payment_methods FOR ALL USING (true);

-- 6. Financial Users (Funcionários autorizados)
CREATE TABLE IF NOT EXISTS public.financial_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.financial_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow All" ON public.financial_users FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_financial_users_email ON public.financial_users(email);
