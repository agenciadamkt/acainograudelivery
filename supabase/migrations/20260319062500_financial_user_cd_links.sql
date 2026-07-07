-- Migration: Financial User CD Links and Updated RLS
-- Description: Creates a many-to-many relationship between financial users and distribution centers to allow restricted access.

-- 1. Create the mapping table
CREATE TABLE IF NOT EXISTS public.financial_user_cd_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    distribution_center_id UUID REFERENCES public.distribution_centers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id, distribution_center_id)
);

-- 2. Enable RLS
ALTER TABLE public.financial_user_cd_links ENABLE ROW LEVEL SECURITY;

-- 3. RLS for CD Links
CREATE POLICY "Admin manages CD links" ON public.financial_user_cd_links
    FOR ALL USING (
        (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' 
        OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
    );

CREATE POLICY "Users view own CD links" ON public.financial_user_cd_links
    FOR SELECT USING (user_id = auth.uid());

-- 4. Update RLS for Distribution Centers
DROP POLICY IF EXISTS "Users view own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users view assigned distribution centers"
    ON public.distribution_centers FOR SELECT
    USING (
        franchisee_user_id = auth.uid() 
        OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' 
        OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
        OR EXISTS (
            SELECT 1 FROM public.financial_user_cd_links 
            WHERE user_id = auth.uid() AND distribution_center_id = public.distribution_centers.id
        )
    );

DROP POLICY IF EXISTS "Users manage own distribution centers" ON public.distribution_centers;
CREATE POLICY "Users manage assigned distribution centers"
    ON public.distribution_centers FOR ALL
    USING (
        franchisee_user_id = auth.uid() 
        OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' 
        OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
        OR EXISTS (
            SELECT 1 FROM public.financial_user_cd_links 
            WHERE user_id = auth.uid() AND distribution_center_id = public.distribution_centers.id
        )
    );

-- 5. Update RLS for Financial Records
DROP POLICY IF EXISTS "Users manage own CD financial records" ON public.financial_records;
CREATE POLICY "Users manage assigned CD records"
    ON public.financial_records FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND (
                dc.franchisee_user_id = auth.uid() 
                OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' 
                OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
                OR EXISTS (
                    SELECT 1 FROM public.financial_user_cd_links fucl 
                    WHERE fucl.user_id = auth.uid() AND fucl.distribution_center_id = dc.id
                )
            )
        )
    );

-- 6. Update RLS for Expenses
DROP POLICY IF EXISTS "Users manage own CD expenses" ON public.expenses;
CREATE POLICY "Users manage assigned CD expenses"
    ON public.expenses FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND (
                dc.franchisee_user_id = auth.uid() 
                OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' 
                OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
                OR EXISTS (
                    SELECT 1 FROM public.financial_user_cd_links fucl 
                    WHERE fucl.user_id = auth.uid() AND fucl.distribution_center_id = dc.id
                )
            )
        )
    );

-- 7. Update RLS for Cash Closings
DROP POLICY IF EXISTS "Users manage own CD cash closings" ON public.cash_closings;
CREATE POLICY "Users manage assigned CD cash closings"
    ON public.cash_closings FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND (
                dc.franchisee_user_id = auth.uid() 
                OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' 
                OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
                OR EXISTS (
                    SELECT 1 FROM public.financial_user_cd_links fucl 
                    WHERE fucl.user_id = auth.uid() AND fucl.distribution_center_id = dc.id
                )
            )
        )
    );

-- 8. Update RLS for Financial Goals
DROP POLICY IF EXISTS "Users view own CD goals" ON public.financial_goals;
CREATE POLICY "Users view assigned CD goals"
    ON public.financial_goals FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.distribution_centers dc 
            WHERE dc.id = distribution_center_id 
            AND (
                dc.franchisee_user_id = auth.uid() 
                OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com' 
                OR (auth.jwt() ->> 'email') = 'acainograuwagner@gmail.com'
                OR EXISTS (
                    SELECT 1 FROM public.financial_user_cd_links fucl 
                    WHERE fucl.user_id = auth.uid() AND fucl.distribution_center_id = dc.id
                )
            )
        )
        OR (franchisee_user_id = auth.uid()) 
        OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com'
    );
