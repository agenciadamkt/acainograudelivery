-- Migration: Update Cash Closing Balance Logic
-- Request: "Saldo" should be the sum of "Total Dinheiro" and "Baixa em Dinheiro"
-- Previous Logic: balance = total_cash
-- New Logic: balance = total_cash + COALESCE(cash_settlement, 0)

ALTER TABLE public.cash_closings DROP COLUMN balance;

ALTER TABLE public.cash_closings 
ADD COLUMN balance DECIMAL(12,2) GENERATED ALWAYS AS (total_cash + COALESCE(cash_settlement, 0)) STORED;

-- Fix current balance for existing data
-- We set the balance to exactly: Sum(Closings Balance) - Sum(Paid Cash Expenses)
UPDATE public.financial_accounts 
SET balance = (
    SELECT 
        COALESCE((SELECT SUM(balance) FROM public.cash_closings), 0) -
        COALESCE((SELECT SUM(amount) FROM public.expenses WHERE paid = true AND paid_with_cash_balance = true), 0)
)
WHERE name = 'Caixa Geral';
