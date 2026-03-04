-- 1. CRIAR TABELA DE FORNECEDORES (COM ISOLAMENTO)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'financial_suppliers') THEN
        CREATE TABLE public.financial_suppliers (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            created_at timestamptz DEFAULT now(),
            name text NOT NULL,
            phone text,
            franchisee_user_id uuid REFERENCES auth.users(id),
            created_by uuid REFERENCES auth.users(id)
        );
        
        -- Ativar RLS
        ALTER TABLE public.financial_suppliers ENABLE ROW LEVEL SECURITY;
        
        -- Criar Política de Isolamento
        CREATE POLICY "Franchisee isolation Suppliers" ON public.financial_suppliers FOR ALL
            USING (franchisee_user_id = auth.uid());
    END IF;
END $$;

-- 2. ADICIONAR COLUNA NA TABELA DE DESPESAS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'supplier_id') THEN
        ALTER TABLE public.expenses ADD COLUMN supplier_id uuid REFERENCES public.financial_suppliers(id);
    END IF;
END $$;

-- 3. REPARAR DADOS ÓRFÃOS (OPCIONAL - CASO JÁ TENHA FORNECEDORES NO FUTURO)
DO $$
DECLARE v_admin_id uuid;
BEGIN
    SELECT id INTO v_admin_id FROM auth.users WHERE email = 'agenciadamkt@gmail.com';
    IF v_admin_id IS NOT NULL THEN
        UPDATE public.financial_suppliers SET franchisee_user_id = v_admin_id WHERE franchisee_user_id IS NULL;
    END IF;
END $$;
