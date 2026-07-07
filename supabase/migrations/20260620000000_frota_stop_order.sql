-- order_ids e manual_order_ids são guardados em duas colunas JSONB separadas.
-- Isso impede representar a ordem de visita correta quando uma entrega manual
-- é mais próxima da loja do que uma entrega "do sistema": o app sempre montava
-- a sequência exibida concatenando todos os pedidos do sistema primeiro e só
-- depois os manuais, ignorando a otimização real entre os dois tipos.
--
-- stop_order guarda a ordem de visita JÁ INTERCALADA (ids de orders e de
-- manual_delivery_orders misturados, na sequência otimizada de verdade).
-- Colunas antigas continuam existindo (ainda usadas para outras consultas);
-- stop_order é só a referência de ordenação para exibição.
ALTER TABLE public.delivery_routes
  ADD COLUMN IF NOT EXISTS stop_order JSONB;
