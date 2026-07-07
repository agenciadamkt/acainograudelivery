-- franchisee_orders/franchisee_order_items só liberavam SELECT pra
-- franchisee_user_id = auth.uid() (quem literalmente fez o pedido). Uma
-- loja pode ter MAIS DE UM usuário vinculado via user_unidades (ex:
-- proprietário + gerente, ambos operando a mesma unidade) — um deles não
-- via os pedidos feitos pelo outro, mesmo sendo a mesma franquia.
--
-- franchisee_peer_user_ids(p_user_id): todos os ids de usuário que
-- compartilham pelo menos uma loja com p_user_id (via user_unidades e/ou
-- vínculo legado stores.franchisee_user_id), incluindo ele mesmo.

CREATE OR REPLACE FUNCTION public.franchisee_peer_user_ids(p_user_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_stores AS (
    SELECT store_id FROM public.user_unidades WHERE usuario_id = p_user_id
    UNION
    SELECT id FROM public.stores WHERE franchisee_user_id = p_user_id
  )
  SELECT uu.usuario_id
    FROM public.user_unidades uu
   WHERE uu.store_id IN (SELECT store_id FROM my_stores)
  UNION
  SELECT s.franchisee_user_id
    FROM public.stores s
   WHERE s.id IN (SELECT store_id FROM my_stores)
     AND s.franchisee_user_id IS NOT NULL
  UNION
  SELECT p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.franchisee_peer_user_ids(uuid) TO authenticated;

CREATE POLICY "Unidade members can view peer orders"
  ON public.franchisee_orders
  FOR SELECT
  TO authenticated
  USING (franchisee_user_id IN (SELECT user_id FROM public.franchisee_peer_user_ids(auth.uid())));

CREATE POLICY "Unidade members can view peer order items"
  ON public.franchisee_order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.franchisee_orders fo
      WHERE fo.id = franchisee_order_items.order_id
        AND fo.franchisee_user_id IN (SELECT user_id FROM public.franchisee_peer_user_ids(auth.uid()))
    )
  );
