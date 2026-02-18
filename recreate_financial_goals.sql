-- EXTREME FIX: DROP AND RECREATE FINANCIAL GOALS TABLE
-- CAUTION: THIS WILL DELETE ALL DATA IN THE FINANCIAL_GOALS TABLE

-- 1. Ensure distribution_centers exists (idempotent)
CREATE TABLE IF NOT EXISTS public.distribution_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Drop the existing table and its policies (CASCADE handles policies)
DROP TABLE IF EXISTS public.financial_goals CASCADE;

-- 3. Create the table with the CORRECT SCHEMA matching MetasPage.tsx
CREATE TABLE public.financial_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    goal_type TEXT NOT NULL CHECK (goal_type IN ('revenue', 'expense_reduction', 'profit', 'custom')),
    target_value NUMERIC NOT NULL DEFAULT 0,
    current_value NUMERIC NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    distribution_center_id UUID REFERENCES public.distribution_centers(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'cancelled')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Re-enable RLS
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- 5. Re-create Policies
CREATE POLICY "financial_goals_select" ON public.financial_goals FOR SELECT USING (true);
CREATE POLICY "financial_goals_insert" ON public.financial_goals FOR INSERT WITH CHECK (true);
CREATE POLICY "financial_goals_update" ON public.financial_goals FOR UPDATE USING (true);
CREATE POLICY "financial_goals_delete" ON public.financial_goals FOR DELETE USING (true);

-- 6. Grant permissions just in case
GRANT ALL ON public.financial_goals TO postgres, anon, authenticated, service_role;
