-- Allow public read access to delivery_drivers (for login by phone)
CREATE POLICY "Allow public to read delivery_drivers"
ON "public"."delivery_drivers"
FOR SELECT
TO anon, authenticated
USING (true);

-- Allow public update access to delivery_drivers (for location tracking)
CREATE POLICY "Allow public to update delivery_drivers"
ON "public"."delivery_drivers"
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Ensure orders are readable/writable by public (drivers are 'public' in this flow)
-- Note: existing policies might conflict if they are restrictive. 
-- We add these to ensure access.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'Allow public to update orders'
    ) THEN
        CREATE POLICY "Allow public to update orders"
        ON "public"."orders"
        FOR UPDATE
        TO anon, authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
END
$$;
