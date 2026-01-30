-- Função RPC para cancelar pedido com validações de segurança e regras de negócio
CREATE OR REPLACE FUNCTION cancel_order(order_id_input UUID, reason_input TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões elevadas para garantir update
SET search_path = public
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_user_id UUID;
BEGIN
    -- Pegar usuário logado
    v_user_id := auth.uid();

    -- Buscar pedido
    SELECT * INTO v_order FROM public.orders WHERE id = order_id_input;

    IF v_order IS NULL THEN
        RAISE EXCEPTION 'Pedido não encontrado.';
    END IF;

    -- Verificar se o usuário é o dono do pedido
    -- (Opcional: Adicionar lógica para permitir Admins cancelarem também se necessário, mas hoje o Admin faz update direto)
    IF v_order.customer_id IS DISTINCT FROM v_user_id THEN
         -- Se não for o dono, pode ser um erro ou tentativa de hack, mas vamos dar uma mensagem genérica
         RAISE EXCEPTION 'Você não tem permissão para cancelar este pedido.';
    END IF;

    -- Validar Status (Regra: Não pode cancelar se já estiver preparando, pronto, entregue ou cancelado)
    IF v_order.status NOT IN ('pending', 'confirmed') THEN
        RAISE EXCEPTION 'Este pedido já entrou em produção e não pode ser cancelado manualmente. Entre em contato com o estabelecimento.';
    END IF;

    -- Executar Cancelamento
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
