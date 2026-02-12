-- 1. Add 'is_global' column to delivery_drivers
ALTER TABLE public.delivery_drivers 
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- 2. Create junction table for multi-store association
CREATE TABLE IF NOT EXISTS public.delivery_driver_stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID REFERENCES public.delivery_drivers(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(driver_id, store_id)
);

-- 3. Enable RLS on the new table
ALTER TABLE public.delivery_driver_stores ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for delivery_driver_stores
-- Allow staff to see associations (necessary for the UI to show allowed stores)
CREATE POLICY "Staff pode ver associacoes de lojas"
ON public.delivery_driver_stores
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
);

-- Allow managers/admins to manage associations
CREATE POLICY "Managers podem gerenciar associacoes de lojas"
ON public.delivery_driver_stores
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- 5. Migrate existing drivers: Associate them with their 'store_id' (Owner) in the junction table
-- This ensures they remain visible to their original store in the new logic
INSERT INTO public.delivery_driver_stores (driver_id, store_id)
SELECT id, store_id
FROM public.delivery_drivers
WHERE store_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 6. Update Policies on 'delivery_drivers'
-- First, drop the old policy that restricted access strictly to store_id
DROP POLICY IF EXISTS "Staff pode gerenciar entregadores da sua loja" ON public.delivery_drivers;
DROP POLICY IF EXISTS "Staff pode ver entregadores" ON public.delivery_drivers;

-- New SELECT Policy: Global OR Owner OR Associated
CREATE POLICY "Staff pode ver entregadores"
ON public.delivery_drivers
FOR SELECT
USING (
    is_global = true
    OR
    (store_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = delivery_drivers.store_id 
        AND s.franchisee_user_id = auth.uid()
    ))
    OR
    EXISTS (
        SELECT 1 FROM public.delivery_driver_stores dds
        JOIN public.stores s ON s.id = dds.store_id
        WHERE dds.driver_id = delivery_drivers.id
        AND s.franchisee_user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'manager'::app_role)
    OR has_role(auth.uid(), 'staff'::app_role)
);

-- New UPDATE Policy: Allow updates if you have access (e.g. changing status)
CREATE POLICY "Staff pode atualizar entregadores"
ON public.delivery_drivers
FOR UPDATE
USING (
    is_global = true
    OR
    (store_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = delivery_drivers.store_id 
        AND s.franchisee_user_id = auth.uid()
    ))
    OR
    EXISTS (
        SELECT 1 FROM public.delivery_driver_stores dds
        JOIN public.stores s ON s.id = dds.store_id
        WHERE dds.driver_id = delivery_drivers.id
        AND s.franchisee_user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);

-- New INSERT/DELETE Policy: Strictly for Owner/Admin
CREATE POLICY "Staff pode inserir e excluir entregadores"
ON public.delivery_drivers
FOR DELETE
USING (
    (store_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = delivery_drivers.store_id 
        AND s.franchisee_user_id = auth.uid()
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff pode inserir entregadores"
ON public.delivery_drivers
FOR INSERT
WITH CHECK (
    (store_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = delivery_drivers.store_id 
        AND s.franchisee_user_id = auth.uid()
    ))
    OR has_role(auth.uid(), 'admin'::app_role)
);

-- 7. Create RPC function to simplify frontend queries
CREATE OR REPLACE FUNCTION get_available_drivers(p_store_id UUID)
RETURNS SETOF public.delivery_drivers AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT d.*
  FROM public.delivery_drivers d
  LEFT JOIN public.delivery_driver_stores dds ON d.id = dds.driver_id
  WHERE
    d.is_global = true
    OR d.store_id = p_store_id -- Owner store
    OR dds.store_id = p_store_id; -- Associated store
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_available_drivers(UUID) TO authenticated;
