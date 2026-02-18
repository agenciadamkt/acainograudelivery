-- Add paid and payment_date columns to expenses table
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_date DATE;
