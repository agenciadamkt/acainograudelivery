-- Create order_feedback table
CREATE TABLE IF NOT EXISTS public.order_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id),
    customer_id UUID REFERENCES public.customers(id),
    nps_score INTEGER, -- 5 (Amei), 3 (Neutro), 1 (Problema)
    category TEXT NOT NULL, -- 'positive', 'neutral', 'negative'
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.order_feedback
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert for service role" ON public.order_feedback
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Add updated_at trigger if needed (omitted for simplicity)
