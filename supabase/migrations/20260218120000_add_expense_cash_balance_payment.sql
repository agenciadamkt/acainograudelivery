-- Add paid_with_cash_balance column to expenses table
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS paid_with_cash_balance BOOLEAN DEFAULT false;
