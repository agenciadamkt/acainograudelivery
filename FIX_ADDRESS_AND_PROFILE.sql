-- SCRIPT DE CORREÇÃO (VERSÃO 3 - CRIAÇÃO DE COLUNAS)

-- 1. CORREÇÃO DO PERFIL (Mantido)
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS birth_date DATE;

DROP POLICY IF EXISTS "Users can update own profile" ON public.customers;

CREATE POLICY "Users can update own profile" 
ON public.customers 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 2. CORREÇÃO DO ENDEREÇO DA LOJA (Gurupi)

-- Primeiro, garante que as colunas de coordenadas existem
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Agora atualiza os dados
UPDATE public.stores
SET 
  address = 'Rua Teófilo dos Santos, 1480, Morada do Sol',
  city = 'Gurupi',
  state = 'TO',
  latitude = -11.7588,  
  longitude = -49.0535
WHERE 
  name ILIKE '%Gurupi%' OR city ILIKE '%Gurupi%';

-- Confirmação
SELECT name, address, latitude, longitude FROM public.stores WHERE name ILIKE '%Gurupi%';
