ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Verify if we need storage buckets or policies, usually public bucket is enough for simple app.
-- Ensure RLS allows reading. Assuming existing policies cover this table.
