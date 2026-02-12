-- ==============================================================================
-- RECREATE FLEET DISPLACEMENT MODULE (Módulo de Frota)
-- ==============================================================================

-- 1. Create tables if they don't exist

-- Geo Zones (Zonas Geográficas para monitoramento)
CREATE TABLE IF NOT EXISTS public.geo_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT,
    state TEXT,
    center_lat DOUBLE PRECISION NOT NULL,
    center_lng DOUBLE PRECISION NOT NULL,
    radius_km DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    min_drivers_required INTEGER NOT NULL DEFAULT 1,
    priority_level INTEGER NOT NULL DEFAULT 1,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Zone Coverage Status (Histórico de cobertura)
CREATE TABLE IF NOT EXISTS public.zone_coverage_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID REFERENCES public.geo_zones(id) ON DELETE CASCADE,
    stores_online INTEGER DEFAULT 0,
    drivers_available INTEGER DEFAULT 0,
    drivers_busy INTEGER DEFAULT 0,
    pending_orders INTEGER DEFAULT 0,
    coverage_status TEXT CHECK (coverage_status IN ('healthy', 'warning', 'critical_void', 'no_stores')),
    driver_deficit INTEGER DEFAULT 0,
    checked_at TIMESTAMPTZ DEFAULT now()
);

-- Displacement Missions (Missões de deslocamento)
CREATE TABLE IF NOT EXISTS public.displacement_missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_zone_id UUID REFERENCES public.geo_zones(id),
    driver_id UUID, -- Reference to delivery_drivers, will add constraint later if table exists
    origin_lat DOUBLE PRECISION,
    origin_lng DOUBLE PRECISION,
    origin_zone_id UUID REFERENCES public.geo_zones(id),
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'in_transit', 'arrived', 'expired', 'cancelled')) DEFAULT 'pending',
    distance_km DOUBLE PRECISION,
    estimated_time_minutes INTEGER,
    notified_at TIMESTAMPTZ DEFAULT now(),
    responded_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    priority_granted BOOLEAN DEFAULT false,
    priority_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Try to add Foreign Key to delivery_drivers if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery_drivers') THEN
        BEGIN
            ALTER TABLE public.displacement_missions 
            ADD CONSTRAINT fk_displacement_missions_driver 
            FOREIGN KEY (driver_id) REFERENCES public.delivery_drivers(id);
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
    END IF;
END $$;

-- 2. Enable RLS
ALTER TABLE public.geo_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_coverage_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.displacement_missions ENABLE ROW LEVEL SECURITY;

-- 3. Create basic policies (permissive for now to ensure functionality)
DROP POLICY IF EXISTS "Public read geo_zones" ON public.geo_zones;
CREATE POLICY "Public read geo_zones" ON public.geo_zones FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth write geo_zones" ON public.geo_zones;
CREATE POLICY "Auth write geo_zones" ON public.geo_zones FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read zone_coverage" ON public.zone_coverage_status;
CREATE POLICY "Public read zone_coverage" ON public.zone_coverage_status FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth write zone_coverage" ON public.zone_coverage_status;
CREATE POLICY "Auth write zone_coverage" ON public.zone_coverage_status FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public read missions" ON public.displacement_missions;
CREATE POLICY "Public read missions" ON public.displacement_missions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth write missions" ON public.displacement_missions;
CREATE POLICY "Auth write missions" ON public.displacement_missions FOR ALL USING (auth.role() = 'authenticated');


-- 4. Helper Function: Haversine Distance (km)
CREATE OR REPLACE FUNCTION public.calculate_distance_km(
    lat1 DOUBLE PRECISION, 
    lng1 DOUBLE PRECISION, 
    lat2 DOUBLE PRECISION, 
    lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    R CONSTANT INTEGER := 6371; -- Radius of the earth in km
    dLat DOUBLE PRECISION;
    dLon DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    dLat := radians(lat2 - lat1);
    dLon := radians(lng2 - lng1);
    a := sin(dLat/2) * sin(dLat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dLon/2) * sin(dLon/2);
    c := 2 * atan2(sqrt(a), sqrt(1 - a));
    RETURN R * c;
END;
$$;

-- 5. RPC Functions

-- check_zone_coverage
-- Simulates checking coverage. In a real scenario, this would check drivers locations.
CREATE OR REPLACE FUNCTION public.check_zone_coverage()
RETURNS TABLE (
    zone_id UUID,
    zone_name TEXT,
    stores_online INTEGER,
    drivers_available INTEGER,
    coverage_status TEXT,
    driver_deficit INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- For now, return the current zones with a default 'healthy' status
    -- Ideally, we would join with delivery_drivers and count those within radius
    RETURN QUERY
    SELECT 
        z.id as zone_id,
        z.name as zone_name,
        1 as stores_online, -- Mock
        0 as drivers_available, -- Mock (todo: implement real count)
        'healthy'::text as coverage_status,
        0 as driver_deficit
    FROM public.geo_zones z
    WHERE z.active = true;
    
    -- Insert simplified history record
    INSERT INTO public.zone_coverage_status (zone_id, stores_online, drivers_available, coverage_status, checked_at)
    SELECT id, 1, 0, 'healthy', now() FROM public.geo_zones WHERE active = true;
END;
$$;

-- get_heatmap_data
CREATE OR REPLACE FUNCTION public.get_heatmap_data()
RETURNS TABLE (
    zone_id UUID,
    zone_name TEXT,
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION,
    coverage_status TEXT,
    drivers_available INTEGER,
    drivers_needed INTEGER,
    pending_orders INTEGER,
    heat_level INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        z.id,
        z.name,
        z.center_lat,
        z.center_lng,
        z.radius_km,
        'healthy'::text,
        0, -- drivers available
        0, -- drivers needed
        0, -- pending orders
        1  -- heat level
    FROM public.geo_zones z
    WHERE z.active = true;
END;
$$;

-- get_displacement_analytics_report
CREATE OR REPLACE FUNCTION public.get_displacement_analytics_report(p_start_date TIMESTAMPTZ, p_end_date TIMESTAMPTZ)
RETURNS TABLE (
    zone_id UUID,
    zone_name TEXT,
    total_voids INTEGER,
    total_drivers_notified INTEGER,
    total_drivers_accepted INTEGER,
    acceptance_rate DOUBLE PRECISION,
    avg_time_to_fill_minutes DOUBLE PRECISION,
    voids_filled INTEGER,
    voids_unfilled INTEGER,
    effectiveness_rate DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        z.id,
        z.name,
        0, 0, 0, 0.0::DOUBLE PRECISION, 0.0::DOUBLE PRECISION, 0, 0, 0.0::DOUBLE PRECISION
    FROM public.geo_zones z;
END;
$$;

-- get_driver_missions
CREATE OR REPLACE FUNCTION public.get_driver_missions(p_driver_id UUID)
RETURNS TABLE (
    mission_id UUID,
    zone_id UUID,
    zone_name TEXT,
    zone_center_lat DOUBLE PRECISION,
    zone_center_lng DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,
    estimated_time_minutes INTEGER,
    status TEXT,
    expires_at TIMESTAMPTZ,
    priority_granted BOOLEAN,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.target_zone_id,
        z.name,
        z.center_lat,
        z.center_lng,
        m.distance_km,
        m.estimated_time_minutes,
        m.status,
        m.expires_at,
        m.priority_granted,
        m.created_at
    FROM public.displacement_missions m
    JOIN public.geo_zones z ON m.target_zone_id = z.id
    WHERE m.driver_id = p_driver_id
    ORDER BY m.created_at DESC;
END;
$$;

-- accept_displacement_mission
CREATE OR REPLACE FUNCTION public.accept_displacement_mission(p_mission_id UUID, p_driver_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_mission public.displacement_missions%ROWTYPE;
BEGIN
    SELECT * INTO v_mission FROM public.displacement_missions WHERE id = p_mission_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Mission not found';
    END IF;
    
    UPDATE public.displacement_missions
    SET status = 'accepted', responded_at = now()
    WHERE id = p_mission_id;
    
    RETURN jsonb_build_object('success', true, 'status', 'accepted');
END;
$$;

-- reject_displacement_mission
CREATE OR REPLACE FUNCTION public.reject_displacement_mission(p_mission_id UUID, p_driver_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.displacement_missions
    SET status = 'rejected', responded_at = now()
    WHERE id = p_mission_id;
    
    RETURN jsonb_build_object('success', true, 'status', 'rejected');
END;
$$;

-- driver_zone_checkin
CREATE OR REPLACE FUNCTION public.driver_zone_checkin(p_driver_id UUID, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_zone RECORD;
    v_distance DOUBLE PRECISION;
    v_checked_in BOOLEAN := false;
BEGIN
    -- Update driver location
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'delivery_drivers') THEN
        EXECUTE 'UPDATE public.delivery_drivers SET current_lat = $1, current_lng = $2, updated_at = now() WHERE id = $3'
        USING p_lat, p_lng, p_driver_id;
    END IF;

    -- Check if inside any active zone
    FOR v_zone IN SELECT * FROM public.geo_zones WHERE active = true LOOP
        v_distance := public.calculate_distance_km(p_lat, p_lng, v_zone.center_lat, v_zone.center_lng);
        
        IF v_distance <= v_zone.radius_km THEN
            v_checked_in := true;
            -- Logic to update mission status if arrived could go here
            RETURN jsonb_build_object(
                'checked_in', true,
                'zone_name', v_zone.name,
                'message', 'Você está dentro da zona ' || v_zone.name
            );
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'checked_in', false,
        'message', 'Você não está em nenhuma zona monitorada'
    );
END;
$$;
