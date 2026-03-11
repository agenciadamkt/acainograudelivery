-- Migration: Fix Transfer Balances Trigger

-- 1. Redefine the trigger function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER
SECURITY DEFINER -- Elevate privileges to bypass RLS for balance updates
SET search_path = public
AS $$
DECLARE
    v_caixa_geral_id UUID;
BEGIN
    -- ─── 1. Handle Transfers (Independent of Caixa Geral) ───
    IF TG_TABLE_NAME = 'financial_transfers' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.financial_accounts SET balance = balance - NEW.amount WHERE id = NEW.from_account_id;
            UPDATE public.financial_accounts SET balance = balance + NEW.amount WHERE id = NEW.to_account_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.financial_accounts SET balance = balance + OLD.amount WHERE id = OLD.from_account_id;
            UPDATE public.financial_accounts SET balance = balance - OLD.amount WHERE id = OLD.to_account_id;
        END IF;
    END IF;

    -- Get the ID of the Caixa Geral account for the other operations
    SELECT id INTO v_caixa_geral_id FROM public.financial_accounts WHERE name = 'Caixa Geral' LIMIT 1;
    
    -- If Caixa Geral doesn't exist, we skip the rest as they depend on it.
    IF v_caixa_geral_id IS NOT NULL THEN
        -- ─── 2. Handle Cash Closings ───
        IF TG_TABLE_NAME = 'cash_closings' THEN
            IF TG_OP = 'INSERT' THEN
                -- Increase balance of Caixa Geral with the NET balance (cash after local expenses)
                UPDATE public.financial_accounts SET balance = balance + NEW.balance WHERE id = v_caixa_geral_id;
            ELSIF TG_OP = 'UPDATE' THEN
                -- Adjust balance for the difference
                UPDATE public.financial_accounts SET balance = balance - OLD.balance + NEW.balance WHERE id = v_caixa_geral_id;
            ELSIF TG_OP = 'DELETE' THEN
                -- Decrease balance
                UPDATE public.financial_accounts SET balance = balance - OLD.balance WHERE id = v_caixa_geral_id;
            END IF;
        END IF;

        -- ─── 3. Handle Expenses ───
        IF TG_TABLE_NAME = 'expenses' THEN
            IF TG_OP = 'INSERT' THEN
                -- If already paid with cash balance on insert
                IF NEW.paid AND NEW.paid_with_cash_balance THEN
                    UPDATE public.financial_accounts SET balance = balance - NEW.amount WHERE id = v_caixa_geral_id;
                END IF;
            
            ELSIF TG_OP = 'UPDATE' THEN
                -- Case A: Was NOT paid with cash, now IS -> Deduct NEW amount
                IF (NOT COALESCE(OLD.paid, false) OR NOT COALESCE(OLD.paid_with_cash_balance, false)) 
                   AND (NEW.paid AND NEW.paid_with_cash_balance) THEN
                    UPDATE public.financial_accounts SET balance = balance - NEW.amount WHERE id = v_caixa_geral_id;
                
                -- Case B: WAS paid with cash, now IS NOT -> Add back OLD amount
                ELSIF (OLD.paid AND OLD.paid_with_cash_balance) 
                      AND (NOT NEW.paid OR NOT NEW.paid_with_cash_balance) THEN
                    UPDATE public.financial_accounts SET balance = balance + OLD.amount WHERE id = v_caixa_geral_id;
                
                -- Case C: WAS and IS paid with cash, but amount changed -> Adjust difference
                ELSIF (OLD.paid AND OLD.paid_with_cash_balance) 
                      AND (NEW.paid AND NEW.paid_with_cash_balance) THEN
                    UPDATE public.financial_accounts SET balance = balance + OLD.amount - NEW.amount WHERE id = v_caixa_geral_id;
                END IF;
                
            ELSIF TG_OP = 'DELETE' THEN
                -- If was paid with cash balance, we must restore it
                IF OLD.paid AND OLD.paid_with_cash_balance THEN
                    UPDATE public.financial_accounts SET balance = balance + OLD.amount WHERE id = v_caixa_geral_id;
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Recalculate ALL balances from scratch to fix any discrepancies

DO $$
DECLARE
    acc RECORD;
    v_caixa_geral_id UUID;
    total_closings DECIMAL(12,2) := 0;
    total_expenses DECIMAL(12,2) := 0;
    total_transfers_in DECIMAL(12,2) := 0;
    total_transfers_out DECIMAL(12,2) := 0;
    v_new_balance DECIMAL(12,2) := 0;
BEGIN
    -- Get Caixa Geral ID
    SELECT id INTO v_caixa_geral_id FROM public.financial_accounts WHERE name = 'Caixa Geral' LIMIT 1;

    -- Loop through all accounts
    FOR acc IN SELECT id, name FROM public.financial_accounts LOOP
        -- Start with 0
        v_new_balance := 0;

        -- If it's Caixa Geral, add Closings and subtract Cash Expenses
        IF acc.id = v_caixa_geral_id THEN
            SELECT COALESCE(SUM(balance), 0) INTO total_closings FROM public.cash_closings;
            SELECT COALESCE(SUM(amount), 0) INTO total_expenses FROM public.expenses WHERE paid = true AND paid_with_cash_balance = true;
            v_new_balance := v_new_balance + total_closings - total_expenses;
        END IF;

        -- Apply Transfers IN
        SELECT COALESCE(SUM(amount), 0) INTO total_transfers_in FROM public.financial_transfers WHERE to_account_id = acc.id;
        v_new_balance := v_new_balance + total_transfers_in;

        -- Apply Transfers OUT
        SELECT COALESCE(SUM(amount), 0) INTO total_transfers_out FROM public.financial_transfers WHERE from_account_id = acc.id;
        v_new_balance := v_new_balance - total_transfers_out;

        -- Update the account balance
        UPDATE public.financial_accounts SET balance = v_new_balance WHERE id = acc.id;
    END LOOP;
END;
$$;
