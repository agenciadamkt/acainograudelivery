-- =====================================================
-- Script para REMOVER dados duplicados da loja Picos
-- e manter apenas uma cópia de cada item
-- =====================================================
-- ⚠️ IMPORTANTE: Execute este script no Supabase SQL Editor
-- =====================================================

DO $$
DECLARE
    target_store_id UUID;
    deleted_count INTEGER;
BEGIN
    -- =====================================================
    -- 1. Buscar ID da loja de Picos (destino)
    -- =====================================================
    
    SELECT id INTO target_store_id 
    FROM stores 
    WHERE name ILIKE '%Picos%'
    LIMIT 1;
    
    IF target_store_id IS NULL THEN
        RAISE EXCEPTION 'Loja de Picos não encontrada!';
    END IF;
    
    RAISE NOTICE 'Loja Picos encontrada: %', target_store_id;
    RAISE NOTICE '';
    RAISE NOTICE '🗑️ Iniciando limpeza de duplicados...';
    RAISE NOTICE '';
    
    -- =====================================================
    -- 2. Remover TODOS os dados da loja Picos
    --    (para começar do zero e evitar inconsistências)
    -- =====================================================
    
    -- 2.1 Remover product_topping_categories relacionadas a produtos da loja Picos
    DELETE FROM product_topping_categories 
    WHERE product_id IN (
        SELECT p.id FROM products p
        INNER JOIN categories c ON p.category_id = c.id
        WHERE c.store_id = target_store_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Configurações de adicionais: % registros removidos', deleted_count;
    
    -- 2.2 Remover product_sizes relacionados a produtos da loja Picos
    DELETE FROM product_sizes 
    WHERE product_id IN (
        SELECT p.id FROM products p
        INNER JOIN categories c ON p.category_id = c.id
        WHERE c.store_id = target_store_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Tamanhos de produtos: % registros removidos', deleted_count;
    
    -- 2.3 Remover produtos da loja Picos
    DELETE FROM products 
    WHERE category_id IN (
        SELECT id FROM categories WHERE store_id = target_store_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Produtos: % registros removidos', deleted_count;
    
    -- 2.4 Remover categorias da loja Picos
    DELETE FROM categories 
    WHERE store_id = target_store_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Categorias: % registros removidos', deleted_count;
    
    -- 2.5 Remover toppings da loja Picos
    DELETE FROM toppings 
    WHERE store_id = target_store_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Adicionais: % registros removidos', deleted_count;
    
    -- 2.6 Remover topping_categories da loja Picos
    DELETE FROM topping_categories 
    WHERE store_id = target_store_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Categorias de adicionais: % registros removidos', deleted_count;
    
    -- =====================================================
    -- Resumo final
    -- =====================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ LIMPEZA CONCLUÍDA COM SUCESSO!';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE 'Todos os dados do cardápio da loja Picos foram removidos.';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ PRÓXIMO PASSO:';
    RAISE NOTICE 'Execute novamente o script de cópia para transferir';
    RAISE NOTICE 'os dados da loja Gurupi para Picos.';
    RAISE NOTICE '========================================';
    
END $$;
