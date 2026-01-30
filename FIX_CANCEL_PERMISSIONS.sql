-- Função RPC de Cancelamento (Versão Debug & Permissões Expandidas)
CREATE OR REPLACE FUNCTION cancel_order(order_id_input UUID, reason_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_user_id UUID;
    v_is_store_owner BOOLEAN := FALSE;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- Obter ID do usuário logado
    v_user_id := auth.uid();

    -- Buscar o pedido
    SELECT * INTO v_order FROM public.orders WHERE id = order_id_input;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Pedido não encontrado.';
    END IF;

    -- 1. Verificar roles globais (Admin, Manager, etc)
    -- Verificamos se o usuário tem QUALQUER role de staff para facilitar, ou restringimos aos principais.
    SELECT EXISTS(
        SELECT 1 FROM public.user_roles 
        WHERE user_id = v_user_id 
        AND role::text IN ('admin', 'manager', 'franchisee_master')
    ) INTO v_is_admin;

    -- 2. Verificar se é Dono/Franqueado/Criador da Loja
    SELECT EXISTS(
        SELECT 1 FROM public.stores 
        WHERE id = v_order.store_id 
        AND (
            franchisee_user_id = v_user_id
            OR created_by = v_user_id::text
        )
    ) INTO v_is_store_owner;

    -- Validação de Permissão Principal
    IF v_order.customer_id IS DISTINCT FROM v_user_id -- Não é o cliente
       AND NOT v_is_store_owner                       -- Não é dono da loja
       AND NOT v_is_admin                             -- Não é admin
    THEN
         -- MENSAGEM DE ERRO DETALHADA PARA DEBUG
         -- Isso vai aparecer na tela vermelha caso falhe, nos ajudando a entender quem é o usuário.
         RAISE EXCEPTION 'Acesso negado. User: %, Customer: %, Admin: %, StoreOwner: %', v_user_id, v_order.customer_id, v_is_admin, v_is_store_owner;
    END IF;

    -- Validar Status do Pedido
    IF v_order.status NOT IN ('pending', 'confirmed') THEN
        RAISE EXCEPTION 'Não é possível cancelar. Status atual: %', v_order.status;
    END IF;

    -- Executar Update
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
