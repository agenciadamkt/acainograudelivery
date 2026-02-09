-- Migration: Create delivery platforms and product prices tables
-- Created at: 2026-02-08 23:10:00

-- Table for delivery platforms (iFood, 99Food, Rappi, etc.)
CREATE TABLE IF NOT EXISTS public.delivery_platforms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for product prices per platform
CREATE TABLE IF NOT EXISTS public.product_platform_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    platform_id UUID NOT NULL REFERENCES public.delivery_platforms(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, platform_id)
);

-- Enable RLS
ALTER TABLE public.delivery_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_platform_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_platforms
CREATE POLICY "Allow authenticated users to view delivery_platforms"
ON public.delivery_platforms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert delivery_platforms"
ON public.delivery_platforms FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update delivery_platforms"
ON public.delivery_platforms FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete delivery_platforms"
ON public.delivery_platforms FOR DELETE TO authenticated USING (true);

-- RLS Policies for product_platform_prices
CREATE POLICY "Allow authenticated users to view product_platform_prices"
ON public.product_platform_prices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert product_platform_prices"
ON public.product_platform_prices FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update product_platform_prices"
ON public.product_platform_prices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete product_platform_prices"
ON public.product_platform_prices FOR DELETE TO authenticated USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_platform_prices_product ON public.product_platform_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_product_platform_prices_platform ON public.product_platform_prices(platform_id);
CREATE INDEX IF NOT EXISTS idx_delivery_platforms_store ON public.delivery_platforms(store_id);

-- Insert some default platforms (can be managed per store later)
INSERT INTO public.delivery_platforms (name, icon) VALUES 
    ('iFood', '🍔'),
    ('99 Food', '🛵'),
    ('Rappi', '🏍️'),
    ('Aiqfome', '🍕'),
    ('WhatsApp', '📱')
ON CONFLICT DO NOTHING;
