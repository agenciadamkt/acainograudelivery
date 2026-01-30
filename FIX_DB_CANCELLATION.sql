-- Execute este script no SQL Editor do Supabase para adicionar a coluna de motivo de cancelamento

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Garantir que usuários podem atualizar seus próprios pedidos (se a política não existir)
-- Normalmente a política de UPDATE 'Enable update for users based on user_id' já cobre isso, 
-- mas precisamos garantir que o usuario pode setar o status para 'cancelled'.

-- Se necessário, ajustar política (exemplo genérico, descomente se tiver problemas de permissão):
-- CREATE POLICY "Users can update their own orders" ON public.orders FOR UPDATE USING (auth.uid() = customer_id);
