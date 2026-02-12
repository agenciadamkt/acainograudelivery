-- SCRIPT DE CORREÇÃO: LOCALIZAÇÃO TERESINA (BAIRRO GURUPI)
-- Identificamos que a loja fica no BAIRRO GURUPI em TERESINA (PI), e não na cidade de Gurupi (TO).
-- Este script corrige a localização para Teresina, Piauí.

-- 1. Atualizar Tabela de Lojas
UPDATE public.stores
SET 
  address = 'Rua Teófilo dos Santos, 1480, Morada do Sol',
  city = 'Teresina',
  state = 'PI',
  latitude = -5.0678,     -- Coordenada aproximada da rua em Teresina
  longitude = -42.76937
WHERE 
  name ILIKE '%Gurupi%' OR city ILIKE '%Gurupi%';

-- 2. Atualizar Áreas de Entrega
UPDATE public.delivery_areas
SET 
  center_lat = -5.0678,
  center_lng = -42.76937
WHERE 
  store_id IN (
      SELECT id FROM public.stores WHERE name ILIKE '%Gurupi%' OR city ILIKE '%Gurupi%'
  );

-- Confirmação
SELECT 'Stores' as tb, name, city, state, latitude FROM public.stores WHERE name ILIKE '%Gurupi%'
UNION ALL
SELECT 'Areas' as tb, name, NULL, NULL, center_lat FROM public.delivery_areas WHERE store_id IN (SELECT id FROM public.stores WHERE name ILIKE '%Gurupi%');
