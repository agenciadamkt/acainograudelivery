-- SCRIPT DE CORREÇÃO: ÁREA DE ENTREGA (MAPA)
-- O mapa usa a tabela 'delivery_areas' para posicionar a loja, não a tabela 'stores'.
-- Este script atualiza as coordenadas da área de entrega para a loja de Gurupi.

UPDATE public.delivery_areas
SET 
  center_lat = -11.7588,
  center_lng = -49.0535
WHERE 
  store_id IN (
      SELECT id FROM public.stores WHERE name ILIKE '%Gurupi%' OR city ILIKE '%Gurupi%'
  );

-- Confirmação
SELECT id, name, center_lat, center_lng FROM public.delivery_areas 
WHERE store_id IN (SELECT id FROM public.stores WHERE name ILIKE '%Gurupi%');
