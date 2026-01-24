-- Create marketing_campaigns table
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    footer_text TEXT,
    choices JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Add category to campaigns for type filtering (e.g., 'manual', 'automation')
ALTER TABLE public.marketing_campaigns ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'manual';

-- Create marketing_logs table to track sent messages
CREATE TABLE IF NOT EXISTS public.marketing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.marketing_campaigns(id),
    customer_id UUID REFERENCES public.customers(id),
    status TEXT DEFAULT 'sent', -- 'sent', 'failed', 'clicked'
    details JSONB,
    sent_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_logs ENABLE ROW LEVEL SECURITY;

-- Simple policies for managers (assuming role-based access is handled elsewhere or via service role)
CREATE POLICY "Enable read for authenticated users" ON public.marketing_campaigns FOR SELECT USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.marketing_campaigns FOR ALL USING (true);
CREATE POLICY "Enable all for marketing_logs" ON public.marketing_logs FOR ALL USING (true);
