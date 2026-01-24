-- Function to find customer by phone number (ignoring formatting)
CREATE OR REPLACE FUNCTION public.find_customer_by_phone(phone_input TEXT)
RETURNS TABLE (id UUID, name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.name
    FROM public.customers c
    -- Compare only digits
    WHERE regexp_replace(c.phone, '\D', '', 'g') ILIKE '%' || regexp_replace(phone_input, '\D', '', 'g') || '%'
    LIMIT 1;
END;
$$;
