-- Migration: Add transfer_date column and fix UPDATE/DELETE policies for financial_transfers
-- Allows users to edit and delete their own transfers

-- 1. Ensure transfer_date column exists (it may already exist from the original migration)
ALTER TABLE public.financial_transfers
ADD COLUMN IF NOT EXISTS transfer_date DATE DEFAULT CURRENT_DATE;

-- 2. Backfill existing rows that have NULL transfer_date
UPDATE public.financial_transfers
SET transfer_date = created_at::date
WHERE transfer_date IS NULL;

-- 3. Fix policies: ensure UPDATE and DELETE are explicitly allowed for own transfers
-- The existing "Users manage own financial transfers" policy covers ALL operations,
-- but we'll make it explicit just in case

DROP POLICY IF EXISTS "Users update own financial transfers" ON public.financial_transfers;
CREATE POLICY "Users update own financial transfers"
    ON public.financial_transfers FOR UPDATE
    USING (
        created_by = public.get_my_franchisee_id()
        OR auth.uid() = created_by
    )
    WITH CHECK (
        created_by = public.get_my_franchisee_id()
        OR auth.uid() = created_by
    );

DROP POLICY IF EXISTS "Users delete own financial transfers" ON public.financial_transfers;
CREATE POLICY "Users delete own financial transfers"
    ON public.financial_transfers FOR DELETE
    USING (
        created_by = public.get_my_franchisee_id()
        OR auth.uid() = created_by
    );
