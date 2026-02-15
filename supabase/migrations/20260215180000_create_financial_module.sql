-- Migration: Create Financial Module Tables
-- Description: Sets up tables for Daily Cash Flow (Distribuidora) with Audit Logs and Clients

-- 1. Financial Clients (Simple Registry)
CREATE TABLE IF NOT EXISTS public.financial_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    document TEXT, -- CPF/CNPJ
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Financial Records (Ledger)
CREATE TABLE IF NOT EXISTS public.financial_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL, -- Who created (Operational)
    client_id UUID REFERENCES public.financial_clients(id),
    
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'write_off', 'other')), -- Venda, Baixa, Outros
    amount DECIMAL(12,2) NOT NULL,
    
    order_number TEXT, -- Optional PDV order link
    description TEXT, -- Observation
    evidence_url TEXT, -- Attachment path
    
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Financial Audit Logs (History)
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID REFERENCES public.financial_records(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'approve', 'reject', 'cancel', 'restore')),
    justification TEXT, -- Required for Edit/Cancel/Reject
    
    previous_status TEXT,
    new_status TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.financial_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Helper Function for Admin Check (Hardcoded for single Admin Master as per requirements)
CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT email FROM auth.users WHERE id = auth.uid()) = 'agenciadamkt@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS Policies

-- Financial Clients
-- Admin: Full access
CREATE POLICY "Admin manages clients" ON public.financial_clients
    FOR ALL USING (public.is_admin_master());

-- Operational: View and Insert
CREATE POLICY "Operational views clients" ON public.financial_clients
    FOR SELECT USING (true); -- Everyone can see clients to select in dropdown

CREATE POLICY "Operational creates clients" ON public.financial_clients
    FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Financial Records
-- Admin: Full access
CREATE POLICY "Admin manages records" ON public.financial_records
    FOR ALL USING (public.is_admin_master());

-- Operational: 
-- View: All records (to see history) ?? Requirement says "Visualizar registros". 
-- It says "Visualizar todos os registros" for Admin, and "Visualizar registros" for User.
-- Assuming User can see all or just there own? "Usuário Operacional (Financeiro / Loja)" implies a team. 
-- Let's allow viewing all records for transparency in the distributor context, or restricted to own?
-- "Visualizar registros" + "Ver status". 
-- Usually Finance team needs to see all.
CREATE POLICY "Operational views records" ON public.financial_records
    FOR SELECT USING (true);

-- Insert: Create pending records
CREATE POLICY "Operational creates records" ON public.financial_records
    FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Update: Only if PENDING and OWN record? Or any record? 
-- "Recebimento de venda" - maybe mistakes happen. 
-- "Ao clicar em editar ... abrir modal". 
-- Requirement: "Registro Aprovado: Não pode ser editado". "Apenas Admin pode alterar status".
-- So Operational can edit if status is 'pending' OR 'rejected'? 
-- "Rejeitar" -> "Alterar status para Cancelado" by user? 
-- Let's say: User can edit if status is 'pending'.
CREATE POLICY "Operational edits pending records" ON public.financial_records
    FOR UPDATE USING (
        (auth.uid() = user_id OR public.is_admin_master() = false) -- operational
        AND status = 'pending'
    );

-- Delete: Valid requirement "Excluir registro: Não apagar do banco. Alterar status para Cancelado".
-- So NO DELETE policy for Operational. 'Cancel' will be an UPDATE to status='cancelled'.

-- Financial Audit Logs
-- Admin: View all
CREATE POLICY "Admin views logs" ON public.financial_audit_logs
    FOR SELECT USING (public.is_admin_master());

-- Operational: View logs? "Visualizar registros" -> "Ver status". Does NOT explicitly say "Ver histórico completo".
-- Requirement: "Admin pode abrir Histórico completo."
-- Operational probably sees the current status and maybe their own logs? 
-- Let's allow operational to view logs for records they have access to (which is all).
CREATE POLICY "Everyone views logs" ON public.financial_audit_logs
    FOR SELECT USING (true);

-- System/Trigger insertion usually bypasses RLS if done via Security Definer function, 
-- but if we insert from client directly (which we shouldn't for logs ideally), we need INSERT.
-- We will implement logging via client-side or triggers?
-- "Cada registro deve armazenar: Criado por, Editado por...".
-- "Admin pode abrir Histórico completo." -> implies separate table.
-- Let's allow INSERT for authenticated users so the app can log actions.
CREATE POLICY "Users insert logs" ON public.financial_audit_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Indexes
CREATE INDEX idx_financial_records_user_id ON public.financial_records(user_id);
CREATE INDEX idx_financial_records_client_id ON public.financial_records(client_id);
CREATE INDEX idx_financial_records_status ON public.financial_records(status);
CREATE INDEX idx_financial_records_date ON public.financial_records(transaction_date);
CREATE INDEX idx_financial_logs_record_id ON public.financial_audit_logs(record_id);
