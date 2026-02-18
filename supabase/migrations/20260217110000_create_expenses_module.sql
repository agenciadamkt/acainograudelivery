-- Migration: Create Expenses Module (IDEMPOTENT)
-- Adds cost_centers, chart_of_accounts, expenses tables

-- 1. Cost Centers (Centro de Custos) — vinculado ao CD
CREATE TABLE IF NOT EXISTS public.cost_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    distribution_center_id UUID NOT NULL REFERENCES public.distribution_centers(id),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Chart of Accounts (Plano de Contas) — vinculado ao Centro de Custos
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cost_center_id UUID NOT NULL REFERENCES public.cost_centers(id),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Expenses (Despesas)
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribution_center_id UUID NOT NULL REFERENCES public.distribution_centers(id),
    expense_type TEXT NOT NULL CHECK (expense_type IN ('fixed', 'variable', 'investment')),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    purpose TEXT NOT NULL,
    cost_center_id UUID NOT NULL REFERENCES public.cost_centers(id),
    chart_of_accounts_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (idempotent with DROP IF EXISTS)

-- Cost Centers
DROP POLICY IF EXISTS "Everyone views cost centers" ON public.cost_centers;
CREATE POLICY "Everyone views cost centers"
    ON public.cost_centers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages cost centers" ON public.cost_centers;
CREATE POLICY "Admin manages cost centers"
    ON public.cost_centers FOR ALL USING (public.is_admin_master());
DROP POLICY IF EXISTS "Authenticated inserts cost centers" ON public.cost_centers;
CREATE POLICY "Authenticated inserts cost centers"
    ON public.cost_centers FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated updates cost centers" ON public.cost_centers;
CREATE POLICY "Authenticated updates cost centers"
    ON public.cost_centers FOR UPDATE USING (true);

-- Chart of Accounts
DROP POLICY IF EXISTS "Everyone views chart of accounts" ON public.chart_of_accounts;
CREATE POLICY "Everyone views chart of accounts"
    ON public.chart_of_accounts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages chart of accounts" ON public.chart_of_accounts;
CREATE POLICY "Admin manages chart of accounts"
    ON public.chart_of_accounts FOR ALL USING (public.is_admin_master());
DROP POLICY IF EXISTS "Authenticated inserts chart of accounts" ON public.chart_of_accounts;
CREATE POLICY "Authenticated inserts chart of accounts"
    ON public.chart_of_accounts FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated updates chart of accounts" ON public.chart_of_accounts;
CREATE POLICY "Authenticated updates chart of accounts"
    ON public.chart_of_accounts FOR UPDATE USING (true);

-- Expenses
DROP POLICY IF EXISTS "Everyone views expenses" ON public.expenses;
CREATE POLICY "Everyone views expenses"
    ON public.expenses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages expenses" ON public.expenses;
CREATE POLICY "Admin manages expenses"
    ON public.expenses FOR ALL USING (public.is_admin_master());
DROP POLICY IF EXISTS "Authenticated inserts expenses" ON public.expenses;
CREATE POLICY "Authenticated inserts expenses"
    ON public.expenses FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Authenticated updates own expenses" ON public.expenses;
CREATE POLICY "Authenticated updates own expenses"
    ON public.expenses FOR UPDATE USING (auth.uid() = created_by);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_cost_centers_dc ON public.cost_centers(distribution_center_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_cc ON public.chart_of_accounts(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_expenses_dc ON public.expenses(distribution_center_id);
CREATE INDEX IF NOT EXISTS idx_expenses_cc ON public.expenses(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_expenses_coa ON public.expenses(chart_of_accounts_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_type ON public.expenses(expense_type);
