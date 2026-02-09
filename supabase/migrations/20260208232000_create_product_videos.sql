-- Migration: Create product_videos table
-- Created at: 2026-02-08 23:20:00

-- Table for product videos (Stories style)
CREATE TABLE IF NOT EXISTS public.product_videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.product_videos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_videos
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow authenticated users to view product_videos" ON public.product_videos;
    DROP POLICY IF EXISTS "Allow authenticated users to insert product_videos" ON public.product_videos;
    DROP POLICY IF EXISTS "Allow authenticated users to update product_videos" ON public.product_videos;
    DROP POLICY IF EXISTS "Allow authenticated users to delete product_videos" ON public.product_videos;
    DROP POLICY IF EXISTS "Allow public to view active product_videos" ON public.product_videos;
END $$;

CREATE POLICY "Allow authenticated users to view product_videos"
ON public.product_videos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert product_videos"
ON public.product_videos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update product_videos"
ON public.product_videos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete product_videos"
ON public.product_videos FOR DELETE TO authenticated USING (true);

-- Public can view active videos
CREATE POLICY "Allow public to view active product_videos"
ON public.product_videos FOR SELECT TO anon USING (active = true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_product_videos_product ON public.product_videos(product_id);
CREATE INDEX IF NOT EXISTS idx_product_videos_order ON public.product_videos(product_id, display_order);
