-- FIX SCRIPT: RUN THIS IN THE SUPABASE SQL EDITOR TO REPAIR THE TABLE

-- 1. Ensure distribution_center_id exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'financial_goals'
        AND column_name = 'distribution_center_id'
    ) THEN
        ALTER TABLE public.financial_goals ADD COLUMN distribution_center_id UUID REFERENCES public.distribution_centers(id);
    END IF;
END $$;

-- 2. Ensure description exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'financial_goals'
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.financial_goals ADD COLUMN description TEXT;
    END IF;
END $$;

-- 3. Ensure current_value exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'financial_goals'
        AND column_name = 'current_value'
    ) THEN
        ALTER TABLE public.financial_goals ADD COLUMN current_value NUMERIC NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 4. Ensure target_value exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'financial_goals'
        AND column_name = 'target_value'
    ) THEN
        ALTER TABLE public.financial_goals ADD COLUMN target_value NUMERIC NOT NULL DEFAULT 0;
    END IF;
END $$;

-- 5. Ensure updated_at exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'financial_goals'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.financial_goals ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- Ensure Policies exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'financial_goals_select' AND tablename = 'financial_goals') THEN
        CREATE POLICY "financial_goals_select" ON public.financial_goals FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'financial_goals_insert' AND tablename = 'financial_goals') THEN
        CREATE POLICY "financial_goals_insert" ON public.financial_goals FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'financial_goals_update' AND tablename = 'financial_goals') THEN
        CREATE POLICY "financial_goals_update" ON public.financial_goals FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'financial_goals_delete' AND tablename = 'financial_goals') THEN
        CREATE POLICY "financial_goals_delete" ON public.financial_goals FOR DELETE USING (true);
    END IF;
END $$;
