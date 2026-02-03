-- Add promotions table for managing discounts and coupon codes
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(50) NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'buy_x_get_y')),
  discount_value DECIMAL(10,2) NOT NULL,
  min_order_value DECIMAL(10,2),
  max_discount DECIMAL(10,2),
  coupon_code VARCHAR(50),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT true,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  applies_to VARCHAR(50) NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'category', 'product')),
  target_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_promotions_store_id ON promotions(store_id);
CREATE INDEX IF NOT EXISTS idx_promotions_coupon_code ON promotions(coupon_code);
CREATE INDEX IF NOT EXISTS idx_promotions_active ON promotions(active, start_date, end_date);

-- Unique coupon code per store
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_coupon_per_store 
ON promotions(store_id, coupon_code) 
WHERE coupon_code IS NOT NULL;

-- Enable RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view promotions" ON promotions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_stores us
      WHERE us.store_id = promotions.store_id
      AND us.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can insert promotions" ON promotions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_stores us
      WHERE us.store_id = promotions.store_id
      AND us.user_id = auth.uid()
      AND us.role IN ('manager', 'franchisee_master')
    )
  );

CREATE POLICY "Managers can update promotions" ON promotions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_stores us
      WHERE us.store_id = promotions.store_id
      AND us.user_id = auth.uid()
      AND us.role IN ('manager', 'franchisee_master')
    )
  );

CREATE POLICY "Managers can delete promotions" ON promotions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_stores us
      WHERE us.store_id = promotions.store_id
      AND us.user_id = auth.uid()
      AND us.role IN ('manager', 'franchisee_master')
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_promotions_updated_at
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_promotions_updated_at();

-- Sample comment
COMMENT ON TABLE promotions IS 'Stores promotions, discounts, and coupon codes for each store';
