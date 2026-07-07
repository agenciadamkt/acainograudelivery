-- Atualiza preço e estoque de vários franchisee_products de uma vez, casando
-- por "code" — usado pela importação de planilha (estoque.xls) em
-- admin/orders/products. Uma chamada só, em vez de centenas de UPDATEs
-- individuais via PostgREST.
CREATE OR REPLACE FUNCTION public.bulk_update_products_from_spreadsheet(p_items jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH incoming AS (
    SELECT
      (item->>'code')::text AS code,
      (item->>'price')::numeric AS price,
      (item->>'current_stock')::numeric AS current_stock
    FROM jsonb_array_elements(p_items) AS item
  )
  UPDATE public.franchisee_products fp
  SET price = incoming.price,
      current_stock = incoming.current_stock
  FROM incoming
  WHERE fp.code = incoming.code;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_update_products_from_spreadsheet(jsonb) TO authenticated;
