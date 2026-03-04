-- Criar tabela de Fornecedores
CREATE TABLE IF NOT EXISTS public.financial_suppliers (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT now(),
    name text NOT NULL,
    phone text,
    franchisee_user_id uuid REFERENCES auth.users(id),
    created_by uuid REFERENCES auth.users(id)
);

-- Ativar RLS
ALTER TABLE public.financial_suppliers ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Fornecedores (Isolamento por Franqueado)
DROP POLICY IF EXISTS "Franchisee isolation Suppliers" ON public.financial_suppliers;
CREATE POLICY "Franchisee isolation Suppliers" ON public.financial_suppliers FOR ALL
    USING (franchisee_user_id = auth.uid());

-- Adicionar coluna supplier_id na tabela de despesas
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.financial_suppliers(id);

-- Atualizar política de RLS de Despesas (já existe, mas garantindo que o franqueado veja suas despesas mesmo com o novo campo)
-- (Já coberto pelas políticas existentes no ISOLAMENTO_FINAL_ADMINS.sql)
