-- Migration: Fix Cash Closing Balance Logic
-- Request: "Total Saídas" should be informational only and not subtracted from "Saldo".
-- Previous Logic: balance = total_cash - total_expenses
-- New Logic: balance = total_cash

ALTER TABLE public.cash_closings DROP COLUMN balance;

ALTER TABLE public.cash_closings 
ADD COLUMN balance DECIMAL(12,2) GENERATED ALWAYS AS (total_cash) STORED;
