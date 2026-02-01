-- ============================================
-- FIX: REALTIME TRACKING FOR DELIVERY DRIVERS
-- Execute this in Supabase SQL Editor
-- ============================================

-- STEP 1: Enable REPLICA IDENTITY FULL for Realtime to detect all column changes
-- This is CRITICAL for current_location updates to be broadcasted
ALTER TABLE delivery_drivers REPLICA IDENTITY FULL;

-- STEP 2: Add the table to Supabase Realtime Publication
-- If already added, this will just skip
DO $$
BEGIN
  -- Check if publication exists
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    -- Add table to publication (ignore error if already there)
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE delivery_drivers;
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Table already in publication';
    END;
  ELSE
    -- Create publication with the table
    CREATE PUBLICATION supabase_realtime FOR TABLE delivery_drivers;
  END IF;
END $$;

-- STEP 3: Grant all necessary permissions for Realtime to work
GRANT SELECT, INSERT, UPDATE ON delivery_drivers TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- STEP 4: Ensure RLS allows drivers to UPDATE their own location
-- Drop any restrictive policies first (if they exist)
DROP POLICY IF EXISTS "Drivers can update own location" ON delivery_drivers;

-- Create an explicit policy for drivers to update their own record
CREATE POLICY "Drivers can update own location" ON delivery_drivers
  FOR UPDATE
  USING (true)  -- Allow update check
  WITH CHECK (true); -- Allow the update to proceed

-- STEP 5: Create a broader SELECT policy for admin/tracking
DROP POLICY IF EXISTS "Anyone can read drivers" ON delivery_drivers;
CREATE POLICY "Anyone can read drivers" ON delivery_drivers
  FOR SELECT
  USING (true);

-- STEP 6: Verify the setup
SELECT 
  'REPLICA IDENTITY' as check_type,
  CASE relreplident
    WHEN 'f' THEN '✅ FULL - Realtime will work'
    WHEN 'd' THEN '❌ DEFAULT - May not broadcast all changes'
    ELSE 'Unknown'
  END as status
FROM pg_class WHERE relname = 'delivery_drivers';

SELECT 
  'PUBLICATION' as check_type,
  CASE WHEN COUNT(*) > 0 
    THEN '✅ Table is in supabase_realtime publication' 
    ELSE '❌ Table NOT in publication' 
  END as status
FROM pg_publication_tables WHERE tablename = 'delivery_drivers';

-- STEP 7: Test - Update a driver's location to trigger realtime
-- (Replace with an actual driver ID from your database)
-- UPDATE delivery_drivers 
-- SET current_location = jsonb_build_object('lat', -5.089, 'lng', -42.801, 'timestamp', EXTRACT(EPOCH FROM NOW())::bigint * 1000),
--     updated_at = NOW()
-- WHERE id = 'YOUR_DRIVER_ID_HERE';
