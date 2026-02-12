-- SCRIPT DE CORREÇÃO FINAL: LOCALIZAÇÃO GURUPI
-- Força a localização para o centro de Gurupi, permitindo ajuste manual fino.
-- Atualiza tanto a loja ('stores') quanto as áreas de entrega ('delivery_areas').

-- Coordenadas Centrais de Gurupi (para garantir que o mapa mostre a cidade certa)
-- Depois você pode arrastar o pino para a rua exata no mapa.

-- 1. Atualizar Tabela de Lojas
UPDATE public.stores
SET 
  address = 'Rua Teófilo dos Santos, 1480, Morada do Sol',
  city = 'Gurupi',
  state = 'TO',
  latitude = -11.729959,
  longitude = -49.070387
WHERE 
  name ILIKE '%Gurupi%' OR city ILIKE '%Gurupi%';

-- 2. Atualizar Áreas de Entrega (importante para o mapa de Entregas)
UPDATE public.delivery_areas
SET 
  center_lat = -11.729959,
  center_lng = -49.070387
WHERE 
  store_id IN (
      SELECT id FROM public.stores WHERE name ILIKE '%Gurupi%' OR city ILIKE '%Gurupi%'
  );

-- Confirmação
SELECT 'Stores' as table_name, name, latitude, longitude FROM public.stores WHERE name ILIKE '%Gurupi%'
UNION ALL
SELECT 'Areas' as table_name, name, center_lat, center_lng FROM public.delivery_areas WHERE store_id IN (SELECT id FROM public.stores WHERE name ILIKE '%Gurupi%');
