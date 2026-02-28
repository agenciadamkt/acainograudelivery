-- Migration: Fix Expense Balance Trigger
-- Updates the update_account_balance trigger to also deduct expenses paid with cash balance
-- and fixes the current balance of Caixa Geral.

CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    caixa_geral_id UUID;
BEGIN
    -- Get the ID of the Caixa Geral account
    SELECT id INTO caixa_geral_id FROM public.financial_accounts WHERE name = 'Caixa Geral' LIMIT 1;
    IF caixa_geral_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- ─── 1. Handle Cash Closings ───
    IF TG_TABLE_NAME = 'cash_closings' THEN
        IF TG_OP = 'INSERT' THEN
            -- Increase balance of Caixa Geral with the NET balance (cash after local expenses)
            UPDATE public.financial_accounts SET balance = balance + NEW.balance WHERE id = caixa_geral_id;
        ELSIF TG_OP = 'UPDATE' THEN
            -- Adjust balance for the difference
            UPDATE public.financial_accounts SET balance = balance - OLD.balance + NEW.balance WHERE id = caixa_geral_id;
        ELSIF TG_OP = 'DELETE' THEN
            -- Decrease balance
            UPDATE public.financial_accounts SET balance = balance - OLD.balance WHERE id = caixa_geral_id;
        END IF;
    END IF;

    -- ─── 2. Handle Transfers ───
    IF TG_TABLE_NAME = 'financial_transfers' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.financial_accounts SET balance = balance - NEW.amount WHERE id = NEW.from_account_id;
            UPDATE public.financial_accounts SET balance = balance + NEW.amount WHERE id = NEW.to_account_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.financial_accounts SET balance = balance + OLD.amount WHERE id = OLD.from_account_id;
            UPDATE public.financial_accounts SET balance = balance - OLD.amount WHERE id = OLD.to_account_id;
        END IF;
    END IF;

    -- ─── 3. Handle Expenses ───
    IF TG_TABLE_NAME = 'expenses' THEN
        IF TG_OP = 'INSERT' THEN
            -- If already paid with cash balance on insert
            IF NEW.paid AND NEW.paid_with_cash_balance THEN
                UPDATE public.financial_accounts SET balance = balance - NEW.amount WHERE id = caixa_geral_id;
            END IF;
        
        ELSIF TG_OP = 'UPDATE' THEN
            -- Case A: Was NOT paid with cash, now IS -> Deduct NEW amount
            IF (NOT COALESCE(OLD.paid, false) OR NOT COALESCE(OLD.paid_with_cash_balance, false)) 
               AND (NEW.paid AND NEW.paid_with_cash_balance) THEN
                UPDATE public.financial_accounts SET balance = balance - NEW.amount WHERE id = caixa_geral_id;
            
            -- Case B: WAS paid with cash, now IS NOT -> Add back OLD amount
            ELSIF (OLD.paid AND OLD.paid_with_cash_balance) 
                  AND (NOT NEW.paid OR NOT NEW.paid_with_cash_balance) THEN
                UPDATE public.financial_accounts SET balance = balance + OLD.amount WHERE id = caixa_geral_id;
            
            -- Case C: WAS and IS paid with cash, but amount changed -> Adjust difference
            ELSIF (OLD.paid AND OLD.paid_with_cash_balance) 
                  AND (NEW.paid AND NEW.paid_with_cash_balance) THEN
                UPDATE public.financial_accounts SET balance = balance + OLD.amount - NEW.amount WHERE id = caixa_geral_id;
            END IF;
            
        ELSIF TG_OP = 'DELETE' THEN
            -- If was paid with cash balance, we must restore it
            IF OLD.paid AND OLD.paid_with_cash_balance THEN
                UPDATE public.financial_accounts SET balance = balance + OLD.amount WHERE id = caixa_geral_id;
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists on expenses
DROP TRIGGER IF EXISTS tr_update_balance_on_expense ON public.expenses;
CREATE TRIGGER tr_update_balance_on_expense
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

-- Fix current balance for existing data
-- We set the balance to exactly: Sum(Closings Balance) - Sum(Paid Cash Expenses)
UPDATE public.financial_accounts 
SET balance = (
    SELECT 
        COALESCE((SELECT SUM(balance) FROM public.cash_closings), 0) -
        COALESCE((SELECT SUM(amount) FROM public.expenses WHERE paid = true AND paid_with_cash_balance = true), 0)
)
WHERE name = 'Caixa Geral';
