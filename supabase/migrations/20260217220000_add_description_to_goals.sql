-- Add description column to financial_goals if it doesn't exist
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
