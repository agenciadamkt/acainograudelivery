-- ==============================================================================
-- FIX (V3): LIMPEZA PROFUNDA DE TRIGGERS DA TABELA ORDERS
-- Objetivo: Remover TODOS os triggers da tabela orders que não sejam os 
--           triggers essenciais do sistema, para eliminar conflitos desconhecidos.
-- ==============================================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Itera sobre todos os triggers da tabela orders
    FOR r IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'orders' 
        AND trigger_schema = 'public'
        -- Lista de triggers essenciais que DEVEM ser mantidos:
        AND trigger_name NOT IN (
            'set_order_number_trigger',  -- Gera o número do pedido (AAAA-MMDD-NNNN)
            'update_orders_updated_at'   -- Atualiza o timestamp updated_at
        )
    LOOP
        -- Remove o trigger suspeito
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.orders CASCADE';
        RAISE NOTICE 'Trigger suspeito removido: %', r.trigger_name;
    END LOOP;
END $$;

-- Mensagem de confirmação
SELECT 'Limpeza de triggers concluída. Apenas triggers essenciais foram mantidos.' as result;
