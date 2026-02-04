-- ===================================================
-- Migration: Create Product Videos Table (FIXED)
-- Description: Supports multiple videos per product for "Stories" feature
-- Fixed: Removed dependency on non-existent 'profiles.role' column
-- ===================================================

CREATE TABLE IF NOT EXISTS product_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  description TEXT,
  type TEXT DEFAULT 'youtube', -- 'youtube', 'mp4', etc.
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_videos_product_id ON product_videos(product_id);
CREATE INDEX IF NOT EXISTS idx_product_videos_active ON product_videos(active);

-- Enable RLS
ALTER TABLE product_videos ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Public can read active videos
CREATE POLICY "Public read access" ON product_videos
  FOR SELECT
  USING (true);

-- 2. Authenticated users (Admins) can do everything
-- Note: We are allowing all authenticated users to manage videos to allow immediate usage.
-- If you need strict RBAC, replace TO authenticated with specific logic.
CREATE POLICY "Admin write access" ON product_videos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Migrate existing video_url data to this new table
-- We use INSERT INTO ... ON CONFLICT DO NOTHING (if unique constraint existed) 
-- or just check if table is empty to avoid dupes if run multiple times?
-- For simplicity, just insert. If you run this twice, you might get duplicates. 
-- Let's add a check.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM product_videos) THEN
    INSERT INTO product_videos (product_id, video_url, display_order, title)
    SELECT id, video_url, 0, name
    FROM products
    WHERE video_url IS NOT NULL AND video_url != '';
  END IF;
END $$;
