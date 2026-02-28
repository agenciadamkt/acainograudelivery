-- Migration: Create Caixa and Contas Module
-- Adds financial_accounts, financial_transfers and links to cash_closings/records

-- 1. Financial Accounts
CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'bank', 'reserve', etc.
    balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Financial Transfers
CREATE TABLE IF NOT EXISTS public.financial_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_account_id UUID NOT NULL REFERENCES public.financial_accounts(id),
    to_account_id UUID NOT NULL REFERENCES public.financial_accounts(id),
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add account_id to existing tables
ALTER TABLE public.financial_records
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.financial_accounts(id);

ALTER TABLE public.cash_closings
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.financial_accounts(id);

-- 4. Seed Default "Caixa Geral" Account
INSERT INTO public.financial_accounts (name, type)
VALUES ('Caixa Geral', 'cash')
ON CONFLICT DO NOTHING;

-- 5. Enable RLS
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transfers ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "Everyone views accounts" ON public.financial_accounts;
CREATE POLICY "Everyone views accounts" ON public.financial_accounts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages accounts" ON public.financial_accounts;
CREATE POLICY "Admin manages accounts" ON public.financial_accounts FOR ALL USING (public.is_admin_master());

DROP POLICY IF EXISTS "Everyone views transfers" ON public.financial_transfers;
CREATE POLICY "Everyone views transfers" ON public.financial_transfers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages transfers" ON public.financial_transfers;
CREATE POLICY "Admin manages transfers" ON public.financial_transfers FOR ALL USING (public.is_admin_master());
DROP POLICY IF EXISTS "Authenticated inserts transfers" ON public.financial_transfers;
CREATE POLICY "Authenticated inserts transfers" ON public.financial_transfers FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 7. Trigger for automatic balance update (simplified approach)
-- In a real production app, we might use a more complex ledger system, 
-- but for this scale, we can update account balance on every relevant change.

CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
DECLARE
    caixa_geral_id UUID;
BEGIN
    SELECT id INTO caixa_geral_id FROM public.financial_accounts WHERE name = 'Caixa Geral' LIMIT 1;

    -- If it's a cash closing entry
    IF TG_TABLE_NAME = 'cash_closings' THEN
        IF TG_OP = 'INSERT' THEN
            -- Increase balance of Caixa Geral with the total_cash
            UPDATE public.financial_accounts SET balance = balance + NEW.total_cash WHERE id = caixa_geral_id;
        ELSIF TG_OP = 'UPDATE' THEN
            UPDATE public.financial_accounts SET balance = balance - OLD.total_cash + NEW.total_cash WHERE id = caixa_geral_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.financial_accounts SET balance = balance - OLD.total_cash WHERE id = caixa_geral_id;
        END IF;
    END IF;

    -- If it's a transfer
    IF TG_TABLE_NAME = 'financial_transfers' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE public.financial_accounts SET balance = balance - NEW.amount WHERE id = NEW.from_account_id;
            UPDATE public.financial_accounts SET balance = balance + NEW.amount WHERE id = NEW.to_account_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE public.financial_accounts SET balance = balance + OLD.amount WHERE id = OLD.from_account_id;
            UPDATE public.financial_accounts SET balance = balance - OLD.amount WHERE id = OLD.to_account_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 8. Create triggers
DROP TRIGGER IF EXISTS tr_update_balance_on_closing ON public.cash_closings;
CREATE TRIGGER tr_update_balance_on_closing
AFTER INSERT OR UPDATE OR DELETE ON public.cash_closings
FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

DROP TRIGGER IF EXISTS tr_update_balance_on_transfer ON public.financial_transfers;
CREATE TRIGGER tr_update_balance_on_transfer
AFTER INSERT OR DELETE ON public.financial_transfers
FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

-- 9. Initialize account_id for existing closings (pointing to Caixa Geral)
UPDATE public.cash_closings
SET account_id = (SELECT id FROM public.financial_accounts WHERE name = 'Caixa Geral' LIMIT 1)
WHERE account_id IS NULL;
