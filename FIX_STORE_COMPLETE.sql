-- SCRIPT DE CADASTRO COMPLETO DA LOJA (TERESINA - PI)
-- Este script atualiza todas as informações da loja, incluindo CEP e Estado.

-- 1. Garante que a coluna de CEP existe (zip_code)
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS zip_code TEXT;

-- 2. Atualiza TODOS os dados da loja
UPDATE public.stores
SET 
  name = 'Açaí no Grau - Gurupi / Teresina', -- Opcional: Atualizar nome para evitar confusão futura (se quiser)
  address = 'Rua Teófilo dos Santos, 1480, Morada do Sol',
  zip_code = '64056-450',
  city = 'Teresina',
  state = 'PI',
  latitude = -5.0678,
  longitude = -42.76937
WHERE 
  name ILIKE '%Gurupi%' OR zip_code = '64056450';

-- 3. Atualiza também as Áreas de Entrega para centralizar no novo endereço
UPDATE public.delivery_areas
SET 
  center_lat = -5.0678,
  center_lng = -42.76937
WHERE 
  store_id IN (
      SELECT id FROM public.stores 
      WHERE name ILIKE '%Gurupi%' OR zip_code = '64056-450'
  );

-- Confirmação
SELECT name, address, zip_code, city, state, latitude, longitude 
FROM public.stores 
WHERE name ILIKE '%Gurupi%' OR zip_code = '64056-450';
