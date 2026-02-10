-- Adiciona a coluna birth_date na tabela customers se não existir
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Garante permissão de update para o próprio usuário (RLS)
-- (Assumindo que já existe uma policy de update geral, mas reforçando)
