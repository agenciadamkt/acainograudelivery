-- Allow public read access to customers and customer_addresses for the driver app
-- This is necessary because the driver app uses a simplified login flow (public role)
-- and needs to fetch customer details and addresses for delivery.

CREATE POLICY "Allow public to read customers"
ON "public"."customers"
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public to read customer_addresses"
ON "public"."customer_addresses"
FOR SELECT
TO anon, authenticated
USING (true);
