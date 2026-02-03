-- =============================================
-- CAPACITY MONITORING SYSTEM - VERSÃO CORRIGIDA
-- Sem dependência de user_stores (usa user_roles)
-- =============================================

-- Table to store capacity alerts
CREATE TABLE IF NOT EXISTS capacity_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('warning', 'critical', 'resolved')),
  occupancy_rate DECIMAL(5,2) NOT NULL, -- percentage
  active_orders INTEGER NOT NULL,
  available_drivers INTEGER NOT NULL,
  total_drivers INTEGER NOT NULL,
  estimated_wait_time INTEGER, -- in minutes
  message TEXT,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for store capacity settings
CREATE TABLE IF NOT EXISTS store_capacity_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  avg_delivery_time_minutes INTEGER DEFAULT 30,
  max_orders_per_driver INTEGER DEFAULT 3,
  warning_threshold DECIMAL(5,2) DEFAULT 80.00,
  critical_threshold DECIMAL(5,2) DEFAULT 100.00,
  alert_radius_km DECIMAL(5,2) DEFAULT 5.00,
  daily_operating_minutes INTEGER DEFAULT 480,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for mutual support requests between stores
CREATE TABLE IF NOT EXISTS store_support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  supporting_store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'expired')),
  needed_drivers INTEGER DEFAULT 1,
  reason TEXT,
  distance_km DECIMAL(10,2),
  expires_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_capacity_alerts_store ON capacity_alerts(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_capacity_alerts_unresolved ON capacity_alerts(store_id, resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_support_requests_pending ON store_support_requests(status, requesting_store_id) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE capacity_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_capacity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_support_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies usando has_role()
-- capacity_alerts
CREATE POLICY "Authenticated can view capacity alerts" ON capacity_alerts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert capacity alerts" ON capacity_alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Managers can update capacity alerts" ON capacity_alerts
  FOR UPDATE USING (
    has_role('manager', auth.uid()) OR has_role('franchisee_master', auth.uid())
  );

-- store_capacity_settings
CREATE POLICY "Authenticated can view capacity settings" ON store_capacity_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage capacity settings" ON store_capacity_settings
  FOR ALL USING (
    has_role('manager', auth.uid()) OR has_role('franchisee_master', auth.uid())
  );

-- store_support_requests
CREATE POLICY "Authenticated can view support requests" ON store_support_requests
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can create support requests" ON store_support_requests
  FOR INSERT WITH CHECK (
    has_role('manager', auth.uid()) OR has_role('franchisee_master', auth.uid()) OR has_role('staff', auth.uid())
  );

CREATE POLICY "Managers can update support requests" ON store_support_requests
  FOR UPDATE USING (
    has_role('manager', auth.uid()) OR has_role('franchisee_master', auth.uid()) OR has_role('staff', auth.uid())
  );

-- Function to calculate store occupancy rate
CREATE OR REPLACE FUNCTION calculate_store_occupancy(p_store_id UUID)
RETURNS TABLE (
  occupancy_rate DECIMAL,
  active_orders INTEGER,
  available_drivers INTEGER,
  total_drivers INTEGER,
  estimated_wait_time INTEGER,
  status VARCHAR
) AS $$
DECLARE
  v_active_orders INTEGER;
  v_total_drivers INTEGER;
  v_available_drivers INTEGER;
  v_avg_delivery_time INTEGER;
  v_max_orders_per_driver INTEGER;
  v_max_capacity INTEGER;
  v_occupancy_rate DECIMAL;
  v_warning_threshold DECIMAL;
  v_critical_threshold DECIMAL;
  v_status VARCHAR;
  v_estimated_wait INTEGER;
BEGIN
  -- Get settings
  SELECT 
    COALESCE(scs.avg_delivery_time_minutes, 30),
    COALESCE(scs.max_orders_per_driver, 3),
    COALESCE(scs.warning_threshold, 80),
    COALESCE(scs.critical_threshold, 100)
  INTO v_avg_delivery_time, v_max_orders_per_driver, v_warning_threshold, v_critical_threshold
  FROM store_capacity_settings scs
  WHERE scs.store_id = p_store_id;

  -- Default values if no settings
  v_avg_delivery_time := COALESCE(v_avg_delivery_time, 30);
  v_max_orders_per_driver := COALESCE(v_max_orders_per_driver, 3);
  v_warning_threshold := COALESCE(v_warning_threshold, 80);
  v_critical_threshold := COALESCE(v_critical_threshold, 100);

  -- Count active orders (pending, confirmed, preparing, ready, out_for_delivery)
  SELECT COUNT(*)
  INTO v_active_orders
  FROM orders
  WHERE store_id = p_store_id
    AND order_type = 'delivery'
    AND status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery');

  -- Count drivers
  SELECT 
    COUNT(*) FILTER (WHERE status = 'disponivel' AND active = true),
    COUNT(*) FILTER (WHERE active = true)
  INTO v_available_drivers, v_total_drivers
  FROM delivery_drivers
  WHERE store_id = p_store_id;

  -- Calculate max capacity
  v_max_capacity := GREATEST(v_total_drivers * v_max_orders_per_driver, 1);

  -- Calculate occupancy rate
  v_occupancy_rate := (v_active_orders::DECIMAL / v_max_capacity) * 100;

  -- Estimate wait time
  IF v_available_drivers > 0 THEN
    v_estimated_wait := (v_active_orders / v_available_drivers) * v_avg_delivery_time;
  ELSE
    v_estimated_wait := v_active_orders * v_avg_delivery_time;
  END IF;

  -- Determine status
  IF v_occupancy_rate >= v_critical_threshold THEN
    v_status := 'critical';
  ELSIF v_occupancy_rate >= v_warning_threshold THEN
    v_status := 'warning';
  ELSE
    v_status := 'normal';
  END IF;

  RETURN QUERY SELECT v_occupancy_rate, v_active_orders, v_available_drivers, v_total_drivers, v_estimated_wait, v_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get nearby stores
CREATE OR REPLACE FUNCTION get_nearby_stores(
  p_store_id UUID,
  p_radius_km DECIMAL DEFAULT 5
)
RETURNS TABLE (
  store_id UUID,
  store_name VARCHAR,
  distance_km DECIMAL,
  available_drivers INTEGER
) AS $$
DECLARE
  v_store_lat DECIMAL;
  v_store_lng DECIMAL;
BEGIN
  -- Get requesting store coordinates
  SELECT latitude, longitude
  INTO v_store_lat, v_store_lng
  FROM stores
  WHERE id = p_store_id;

  IF v_store_lat IS NULL OR v_store_lng IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    s.id,
    s.name::VARCHAR,
    (
      6371 * acos(
        cos(radians(v_store_lat)) * cos(radians(s.latitude)) *
        cos(radians(s.longitude) - radians(v_store_lng)) +
        sin(radians(v_store_lat)) * sin(radians(s.latitude))
      )
    )::DECIMAL AS dist_km,
    (
      SELECT COUNT(*)::INTEGER
      FROM delivery_drivers dd
      WHERE dd.store_id = s.id
        AND dd.status = 'disponivel'
        AND dd.active = true
    )
  FROM stores s
  WHERE s.id != p_store_id
    AND s.active = true
    AND s.latitude IS NOT NULL
    AND s.longitude IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(v_store_lat)) * cos(radians(s.latitude)) *
        cos(radians(s.longitude) - radians(v_store_lng)) +
        sin(radians(v_store_lat)) * sin(radians(s.latitude))
      )
    ) <= p_radius_km
  ORDER BY dist_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to auto-create alerts when capacity issues detected
CREATE OR REPLACE FUNCTION check_capacity_on_order_change()
RETURNS TRIGGER AS $$
DECLARE
  v_occupancy RECORD;
  v_last_alert RECORD;
  v_settings RECORD;
BEGIN
  -- Only check for delivery orders
  IF NEW.order_type != 'delivery' THEN
    RETURN NEW;
  END IF;

  -- Get current occupancy
  SELECT * INTO v_occupancy FROM calculate_store_occupancy(NEW.store_id);

  -- Get settings
  SELECT * INTO v_settings FROM store_capacity_settings WHERE store_id = NEW.store_id;

  -- Check if there's already an unresolved alert
  SELECT * INTO v_last_alert 
  FROM capacity_alerts 
  WHERE store_id = NEW.store_id 
    AND resolved_at IS NULL 
  ORDER BY created_at DESC 
  LIMIT 1;

  -- Create alert if threshold exceeded and no recent unresolved alert
  IF v_occupancy.status IN ('warning', 'critical') THEN
    IF v_last_alert IS NULL OR v_last_alert.alert_type != v_occupancy.status THEN
      INSERT INTO capacity_alerts (
        store_id,
        alert_type,
        occupancy_rate,
        active_orders,
        available_drivers,
        total_drivers,
        estimated_wait_time,
        message
      ) VALUES (
        NEW.store_id,
        v_occupancy.status,
        v_occupancy.occupancy_rate,
        v_occupancy.active_orders,
        v_occupancy.available_drivers,
        v_occupancy.total_drivers,
        v_occupancy.estimated_wait_time,
        CASE v_occupancy.status
          WHEN 'critical' THEN 'ALERTA CRÍTICO: Capacidade de entrega excedida. Taxa de ocupação: ' || ROUND(v_occupancy.occupancy_rate, 1) || '%'
          WHEN 'warning' THEN 'Aviso: Capacidade de entrega próxima do limite. Taxa de ocupação: ' || ROUND(v_occupancy.occupancy_rate, 1) || '%'
        END
      );
    END IF;
  ELSIF v_occupancy.status = 'normal' AND v_last_alert IS NOT NULL THEN
    -- Resolve previous alert
    UPDATE capacity_alerts
    SET resolved_at = NOW()
    WHERE id = v_last_alert.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_check_capacity_on_order ON orders;
CREATE TRIGGER trigger_check_capacity_on_order
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_capacity_on_order_change();

COMMENT ON TABLE capacity_alerts IS 'Stores capacity alerts when delivery volume exceeds thresholds';
COMMENT ON TABLE store_capacity_settings IS 'Stores capacity configuration for each store';
COMMENT ON TABLE store_support_requests IS 'Stores mutual support requests between nearby franchises';
