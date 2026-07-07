-- Fleet Management Tables

CREATE TABLE IF NOT EXISTS public.fleet_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plate TEXT NOT NULL UNIQUE,
    model TEXT,
    current_km NUMERIC DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fleet_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    license_number TEXT,
    phone TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fleet_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.fleet_vehicles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.fleet_drivers(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    departure_time TIME NOT NULL,
    arrival_time TIME,
    km_start NUMERIC NOT NULL,
    km_end NUMERIC,
    km_total NUMERIC GENERATED ALWAYS AS (km_end - km_start) STORED,
    order_number TEXT,
    checked_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_trips ENABLE ROW LEVEL SECURITY;

-- Simple policies for admin (you can refine these based on your existing groups)
CREATE POLICY "Allow authenticated full access" ON public.fleet_vehicles
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated full access" ON public.fleet_drivers
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated full access" ON public.fleet_trips
    FOR ALL USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fleet_trips_vehicle ON public.fleet_trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fleet_trips_driver ON public.fleet_trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_fleet_trips_date ON public.fleet_trips(date);
