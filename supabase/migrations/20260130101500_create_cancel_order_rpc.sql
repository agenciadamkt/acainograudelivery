-- Atualização: Incluir verificação de roles administrativos (Admin, Manager) além do dono da loja
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
    v_is_admin BOOLEAN := FALSE;
BEGIN
    v_user_id := auth.uid();

    SELECT * INTO v_order FROM public.orders WHERE id = order_id_input;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Pedido não encontrado.';
    END IF;

    -- 1. Verificar se é Sócio/Franqueado da loja específica
    SELECT EXISTS(SELECT 1 FROM public.stores WHERE id = v_order.store_id AND franchisee_user_id = v_user_id)
    INTO v_is_store_owner;

    -- 2. Verificar se é Admin/Manager Global (Tabela user_roles)
    -- Verifica se existe registro em user_roles com permissão elevada
    SELECT EXISTS(
        SELECT 1 FROM public.user_roles 
        WHERE user_id = v_user_id AND role::text IN ('admin', 'manager', 'franchisee_master')
    ) INTO v_is_admin;

    -- Permissão: Dono do Pedido OU Franquado da Loja OU Admin Global
    IF v_order.customer_id IS DISTINCT FROM v_user_id AND NOT v_is_store_owner AND NOT v_is_admin THEN
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
