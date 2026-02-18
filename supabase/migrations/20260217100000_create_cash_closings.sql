-- Migration: Create Cash Closing Module (IDEMPOTENT)
-- Adds distribution_centers, cash_operators, cash_closings, cash_closing_documents

-- 1. Distribution Centers (CD)
CREATE TABLE IF NOT EXISTS public.distribution_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Cash Operators (Operadores de Caixa / Conferentes)
CREATE TABLE IF NOT EXISTS public.cash_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Cash Closings (Fechamento de Caixa)
CREATE TABLE IF NOT EXISTS public.cash_closings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    distribution_center_id UUID NOT NULL REFERENCES public.distribution_centers(id),
    closing_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_sales DECIMAL(12,2) NOT NULL DEFAULT 0,
    operator_id UUID REFERENCES public.cash_operators(id),
    total_cash DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_expenses DECIMAL(12,2) NOT NULL DEFAULT 0,
    balance DECIMAL(12,2) GENERATED ALWAYS AS (total_cash - total_expenses) STORED,
    title_settlement DECIMAL(12,2) NOT NULL DEFAULT 0,
    cash_settlement DECIMAL(12,2) NOT NULL DEFAULT 0,
    checked_by_id UUID REFERENCES public.cash_operators(id),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Cash Closing Documents (Anexos)
CREATE TABLE IF NOT EXISTS public.cash_closing_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closing_id UUID NOT NULL REFERENCES public.cash_closings(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT 'image',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.distribution_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closing_documents ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (drop first to be idempotent)

-- Distribution Centers
DROP POLICY IF EXISTS "Everyone views active distribution centers" ON public.distribution_centers;
CREATE POLICY "Everyone views active distribution centers"
    ON public.distribution_centers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages distribution centers" ON public.distribution_centers;
CREATE POLICY "Admin manages distribution centers"
    ON public.distribution_centers FOR ALL USING (public.is_admin_master());
DROP POLICY IF EXISTS "Authenticated inserts distribution centers" ON public.distribution_centers;
CREATE POLICY "Authenticated inserts distribution centers"
    ON public.distribution_centers FOR INSERT WITH CHECK (true);

-- Cash Operators
DROP POLICY IF EXISTS "Everyone views active cash operators" ON public.cash_operators;
CREATE POLICY "Everyone views active cash operators"
    ON public.cash_operators FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages cash operators" ON public.cash_operators;
CREATE POLICY "Admin manages cash operators"
    ON public.cash_operators FOR ALL USING (public.is_admin_master());
DROP POLICY IF EXISTS "Authenticated inserts cash operators" ON public.cash_operators;
CREATE POLICY "Authenticated inserts cash operators"
    ON public.cash_operators FOR INSERT WITH CHECK (true);

-- Cash Closings
DROP POLICY IF EXISTS "Everyone views cash closings" ON public.cash_closings;
CREATE POLICY "Everyone views cash closings"
    ON public.cash_closings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages cash closings" ON public.cash_closings;
CREATE POLICY "Admin manages cash closings"
    ON public.cash_closings FOR ALL USING (public.is_admin_master());
DROP POLICY IF EXISTS "Authenticated inserts cash closings" ON public.cash_closings;
CREATE POLICY "Authenticated inserts cash closings"
    ON public.cash_closings FOR INSERT WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "Authenticated updates own cash closings" ON public.cash_closings;
CREATE POLICY "Authenticated updates own cash closings"
    ON public.cash_closings FOR UPDATE USING (auth.uid() = created_by);

-- Cash Closing Documents
DROP POLICY IF EXISTS "Everyone views cash closing documents" ON public.cash_closing_documents;
CREATE POLICY "Everyone views cash closing documents"
    ON public.cash_closing_documents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manages cash closing documents" ON public.cash_closing_documents;
CREATE POLICY "Admin manages cash closing documents"
    ON public.cash_closing_documents FOR ALL USING (public.is_admin_master());
DROP POLICY IF EXISTS "Authenticated inserts cash closing documents" ON public.cash_closing_documents;
CREATE POLICY "Authenticated inserts cash closing documents"
    ON public.cash_closing_documents FOR INSERT WITH CHECK (true);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_cash_closings_center ON public.cash_closings(distribution_center_id);
CREATE INDEX IF NOT EXISTS idx_cash_closings_date ON public.cash_closings(closing_date);
CREATE INDEX IF NOT EXISTS idx_cash_closings_operator ON public.cash_closings(operator_id);
CREATE INDEX IF NOT EXISTS idx_cash_closing_docs_closing ON public.cash_closing_documents(closing_id);

-- 8. Storage bucket for cash closing documents
INSERT INTO storage.buckets (id, name, public) VALUES ('cash-closing-docs', 'cash-closing-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Anyone can view cash closing docs" ON storage.objects;
CREATE POLICY "Anyone can view cash closing docs" ON storage.objects
    FOR SELECT USING (bucket_id = 'cash-closing-docs');
DROP POLICY IF EXISTS "Authenticated upload cash closing docs" ON storage.objects;
CREATE POLICY "Authenticated upload cash closing docs" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'cash-closing-docs' AND auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Authenticated delete cash closing docs" ON storage.objects;
CREATE POLICY "Authenticated delete cash closing docs" ON storage.objects
    FOR DELETE USING (bucket_id = 'cash-closing-docs' AND auth.role() = 'authenticated');

-- 9. Add distribution_center_id to existing financial_records table
ALTER TABLE public.financial_records
ADD COLUMN IF NOT EXISTS distribution_center_id UUID REFERENCES public.distribution_centers(id);
CREATE INDEX IF NOT EXISTS idx_financial_records_center ON public.financial_records(distribution_center_id);
