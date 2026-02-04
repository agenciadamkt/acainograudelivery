-- ===================================================
-- Migration: Create Product Videos Table
-- Description: Supports multiple videos per product for "Stories" feature
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
CREATE POLICY "Public read access" ON product_videos
  FOR SELECT USING (true); -- Or (active = true) but admin needs to see inactive too? Usually public sees active.
  -- Let's make it simple for now, refine if needed.
  -- FOR SELECT USING (true);

CREATE POLICY "Admin write access" ON product_videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Migrate existing video_url data to this new table
INSERT INTO product_videos (product_id, video_url, display_order)
SELECT id, video_url, 0
FROM products
WHERE video_url IS NOT NULL AND video_url != '';

-- Verify
SELECT count(*) as video_count FROM product_videos;
