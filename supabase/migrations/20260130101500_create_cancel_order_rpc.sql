CREATE OR REPLACE FUNCTION cancel_order(order_id_input UUID, reason_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_user_id UUID;
    v_is_store_owner BOOLEAN;
BEGIN
    v_user_id := auth.uid();

    SELECT * INTO v_order FROM public.orders WHERE id = order_id_input;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Pedido não encontrado.';
    END IF;

    -- Verificar se é dono da loja
    SELECT EXISTS(SELECT 1 FROM public.stores WHERE id = v_order.store_id AND owner_id = v_user_id)
    INTO v_is_store_owner;

    -- Permissão: Dono do Pedido OU Dono da Loja
    IF v_order.customer_id IS DISTINCT FROM v_user_id AND NOT v_is_store_owner THEN
         RAISE EXCEPTION 'Você não tem permissão para cancelar este pedido.';
    END IF;

    -- Regra de Status: Permitir se Pending ou Confirmed. Bloquear se preparando/pronto/entregue.
    IF v_order.status NOT IN ('pending', 'confirmed') THEN
        RAISE EXCEPTION 'Este pedido já entrou em produção e não pode ser cancelado manualmente.';
    END IF;

    UPDATE public.orders
    SET 
        status = 'cancelled',
        cancellation_reason = reason_input,
        cancelled_at = NOW()
    WHERE id = order_id_input
    RETURNING * INTO v_order;

    RETURN to_jsonb(v_order);
END;
$$;
