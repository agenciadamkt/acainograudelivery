-- =====================================================
-- Script COMPLETO: Limpa + Copia dados do cardápio
-- De: Açaí no Grau - Gurupi
-- Para: Açaí no Grau Picos - Praça Josino Ferreira
-- =====================================================
-- ⚠️ IMPORTANTE: Execute este script no Supabase SQL Editor
-- =====================================================

DO $$
DECLARE
    source_store_id UUID;
    target_store_id UUID;
    old_category_id UUID;
    new_category_id UUID;
    old_product_id UUID;
    new_product_id UUID;
    old_topping_cat_id UUID;
    new_topping_cat_id UUID;
    cat_record RECORD;
    prod_record RECORD;
    size_record RECORD;
    top_cat_record RECORD;
    topping_record RECORD;
    prod_top_cat_record RECORD;
    deleted_count INTEGER;
BEGIN
    -- =====================================================
    -- 1. Buscar IDs das lojas
    -- =====================================================
    
    -- Loja de origem (Gurupi)
    SELECT id INTO source_store_id 
    FROM stores 
    WHERE name ILIKE '%Gurupi%'
    LIMIT 1;
    
    IF source_store_id IS NULL THEN
        RAISE EXCEPTION 'Loja de origem (Gurupi) não encontrada!';
    END IF;
    
    -- Loja de destino (Picos)
    SELECT id INTO target_store_id 
    FROM stores 
    WHERE name ILIKE '%Picos%'
    LIMIT 1;
    
    IF target_store_id IS NULL THEN
        RAISE EXCEPTION 'Loja de destino (Picos) não encontrada!';
    END IF;
    
    RAISE NOTICE '📍 Loja origem (Gurupi): %', source_store_id;
    RAISE NOTICE '📍 Loja destino (Picos): %', target_store_id;
    RAISE NOTICE '';
    
    -- =====================================================
    -- PARTE 1: LIMPEZA - Remover dados existentes de Picos
    -- =====================================================
    
    RAISE NOTICE '🗑️ ========================================';
    RAISE NOTICE '🗑️ FASE 1: LIMPEZA DE DADOS EXISTENTES';
    RAISE NOTICE '🗑️ ========================================';
    RAISE NOTICE '';
    
    -- 1.1 Remover product_topping_categories relacionadas a produtos da loja Picos
    DELETE FROM product_topping_categories 
    WHERE product_id IN (
        SELECT p.id FROM products p
        INNER JOIN categories c ON p.category_id = c.id
        WHERE c.store_id = target_store_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Configurações de adicionais: % removidos', deleted_count;
    
    -- 1.2 Remover product_sizes relacionados a produtos da loja Picos
    DELETE FROM product_sizes 
    WHERE product_id IN (
        SELECT p.id FROM products p
        INNER JOIN categories c ON p.category_id = c.id
        WHERE c.store_id = target_store_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Tamanhos de produtos: % removidos', deleted_count;
    
    -- 1.3 Remover produtos da loja Picos
    DELETE FROM products 
    WHERE category_id IN (
        SELECT id FROM categories WHERE store_id = target_store_id
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Produtos: % removidos', deleted_count;
    
    -- 1.4 Remover categorias da loja Picos
    DELETE FROM categories 
    WHERE store_id = target_store_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Categorias: % removidos', deleted_count;
    
    -- 1.5 Remover toppings da loja Picos
    DELETE FROM toppings 
    WHERE store_id = target_store_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Adicionais: % removidos', deleted_count;
    
    -- 1.6 Remover topping_categories da loja Picos
    DELETE FROM topping_categories 
    WHERE store_id = target_store_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '  ✓ Categorias de adicionais: % removidos', deleted_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Limpeza concluída!';
    RAISE NOTICE '';
    
    -- =====================================================
    -- PARTE 2: CÓPIA - Copiar dados de Gurupi para Picos
    -- =====================================================
    
    RAISE NOTICE '📦 ========================================';
    RAISE NOTICE '📦 FASE 2: CÓPIA DE DADOS';
    RAISE NOTICE '📦 ========================================';
    RAISE NOTICE '';
    
    -- =====================================================
    -- 2.1 Criar tabelas temporárias para mapeamento de IDs
    -- =====================================================
    
    CREATE TEMP TABLE IF NOT EXISTS category_mapping (
        old_id UUID,
        new_id UUID
    );
    
    CREATE TEMP TABLE IF NOT EXISTS product_mapping (
        old_id UUID,
        new_id UUID
    );
    
    CREATE TEMP TABLE IF NOT EXISTS topping_category_mapping (
        old_id UUID,
        new_id UUID
    );
    
    -- Limpar tabelas temporárias caso existam de execução anterior
    DELETE FROM category_mapping;
    DELETE FROM product_mapping;
    DELETE FROM topping_category_mapping;
    
    -- =====================================================
    -- 2.2 Copiar CATEGORIAS
    -- =====================================================
    
    RAISE NOTICE '📁 Copiando categorias...';
    
    FOR cat_record IN 
        SELECT * FROM categories WHERE store_id = source_store_id
    LOOP
        new_category_id := gen_random_uuid();
        
        INSERT INTO categories (
            id, name, icon, image_url, active, display_order, store_id, created_at, updated_at
        ) VALUES (
            new_category_id,
            cat_record.name,
            cat_record.icon,
            cat_record.image_url,
            cat_record.active,
            cat_record.display_order,
            target_store_id,
            NOW(),
            NOW()
        );
        
        -- Salvar mapeamento
        INSERT INTO category_mapping (old_id, new_id) 
        VALUES (cat_record.id, new_category_id);
        
        RAISE NOTICE '  ✓ %', cat_record.name;
    END LOOP;
    
    -- =====================================================
    -- 2.3 Copiar PRODUTOS
    -- =====================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '📦 Copiando produtos...';
    
    FOR prod_record IN 
        SELECT p.* 
        FROM products p
        INNER JOIN categories c ON p.category_id = c.id
        WHERE c.store_id = source_store_id
    LOOP
        new_product_id := gen_random_uuid();
        
        -- Buscar nova categoria correspondente
        SELECT new_id INTO new_category_id 
        FROM category_mapping 
        WHERE old_id = prod_record.category_id;
        
        INSERT INTO products (
            id, name, description, base_image_url, category_id, 
            active, display_order, created_at, updated_at
        ) VALUES (
            new_product_id,
            prod_record.name,
            prod_record.description,
            prod_record.base_image_url,
            new_category_id,
            prod_record.active,
            prod_record.display_order,
            NOW(),
            NOW()
        );
        
        -- Salvar mapeamento
        INSERT INTO product_mapping (old_id, new_id) 
        VALUES (prod_record.id, new_product_id);
        
        RAISE NOTICE '  ✓ %', prod_record.name;
    END LOOP;
    
    -- =====================================================
    -- 2.4 Copiar TAMANHOS DOS PRODUTOS (product_sizes)
    -- =====================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '📏 Copiando tamanhos dos produtos...';
    
    FOR size_record IN 
        SELECT ps.* 
        FROM product_sizes ps
        INNER JOIN product_mapping pm ON ps.product_id = pm.old_id
    LOOP
        -- Buscar novo product_id correspondente
        SELECT new_id INTO new_product_id 
        FROM product_mapping 
        WHERE old_id = size_record.product_id;
        
        INSERT INTO product_sizes (
            id, product_id, name, ml_size, price, promotional_price,
            active, display_order, created_at
        ) VALUES (
            gen_random_uuid(),
            new_product_id,
            size_record.name,
            size_record.ml_size,
            size_record.price,
            size_record.promotional_price,
            size_record.active,
            size_record.display_order,
            NOW()
        );
    END LOOP;
    
    RAISE NOTICE '  ✓ Tamanhos copiados';
    
    -- =====================================================
    -- 2.5 Copiar CATEGORIAS DE ADICIONAIS (topping_categories)
    -- =====================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '🏷️ Copiando categorias de adicionais...';
    
    FOR top_cat_record IN 
        SELECT * FROM topping_categories WHERE store_id = source_store_id
    LOOP
        new_topping_cat_id := gen_random_uuid();
        
        INSERT INTO topping_categories (
            id, name, max_selections, display_order, store_id, created_at
        ) VALUES (
            new_topping_cat_id,
            top_cat_record.name,
            top_cat_record.max_selections,
            top_cat_record.display_order,
            target_store_id,
            NOW()
        );
        
        -- Salvar mapeamento
        INSERT INTO topping_category_mapping (old_id, new_id) 
        VALUES (top_cat_record.id, new_topping_cat_id);
        
        RAISE NOTICE '  ✓ %', top_cat_record.name;
    END LOOP;
    
    -- =====================================================
    -- 2.6 Copiar ADICIONAIS (toppings)
    -- =====================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '🍓 Copiando adicionais...';
    
    FOR topping_record IN 
        SELECT * FROM toppings WHERE store_id = source_store_id
    LOOP
        -- Buscar nova categoria de adicional correspondente
        new_topping_cat_id := NULL;
        IF topping_record.category_id IS NOT NULL THEN
            SELECT new_id INTO new_topping_cat_id 
            FROM topping_category_mapping 
            WHERE old_id = topping_record.category_id;
        END IF;
        
        INSERT INTO toppings (
            id, name, price, image_url, category_id, 
            active, display_order, store_id, created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            topping_record.name,
            topping_record.price,
            topping_record.image_url,
            new_topping_cat_id,
            topping_record.active,
            topping_record.display_order,
            target_store_id,
            NOW(),
            NOW()
        );
    END LOOP;
    
    RAISE NOTICE '  ✓ Adicionais copiados';
    
    -- =====================================================
    -- 2.7 Copiar CONFIGURAÇÕES DE ADICIONAIS POR PRODUTO
    --     (product_topping_categories)
    -- =====================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '🔗 Copiando configurações de adicionais por produto...';
    
    FOR prod_top_cat_record IN 
        SELECT ptc.* 
        FROM product_topping_categories ptc
        INNER JOIN product_mapping pm ON ptc.product_id = pm.old_id
    LOOP
        -- Buscar novo product_id correspondente
        SELECT new_id INTO new_product_id 
        FROM product_mapping 
        WHERE old_id = prod_top_cat_record.product_id;
        
        -- Buscar nova topping_category_id correspondente
        SELECT new_id INTO new_topping_cat_id 
        FROM topping_category_mapping 
        WHERE old_id = prod_top_cat_record.topping_category_id;
        
        -- Só inserir se ambos os mapeamentos existirem
        IF new_product_id IS NOT NULL AND new_topping_cat_id IS NOT NULL THEN
            INSERT INTO product_topping_categories (
                id, product_id, topping_category_id, 
                min_quantity, max_quantity, required, active, display_order, created_at
            ) VALUES (
                gen_random_uuid(),
                new_product_id,
                new_topping_cat_id,
                prod_top_cat_record.min_quantity,
                prod_top_cat_record.max_quantity,
                prod_top_cat_record.required,
                prod_top_cat_record.active,
                prod_top_cat_record.display_order,
                NOW()
            );
        END IF;
    END LOOP;
    
    RAISE NOTICE '  ✓ Configurações copiadas';
    
    -- =====================================================
    -- 2.8 Limpar tabelas temporárias
    -- =====================================================
    
    DROP TABLE IF EXISTS category_mapping;
    DROP TABLE IF EXISTS product_mapping;
    DROP TABLE IF EXISTS topping_category_mapping;
    
    -- =====================================================
    -- RESUMO FINAL
    -- =====================================================
    
    RAISE NOTICE '';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ========================================';
    RAISE NOTICE '🎉 OPERAÇÃO CONCLUÍDA COM SUCESSO!';
    RAISE NOTICE '🎉 ========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📍 Origem: Açaí no Grau - Gurupi';
    RAISE NOTICE '📍 Destino: Açaí no Grau Picos';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Dados antigos de Picos foram removidos';
    RAISE NOTICE '✅ Categorias copiadas';
    RAISE NOTICE '✅ Produtos copiados';
    RAISE NOTICE '✅ Tamanhos copiados';
    RAISE NOTICE '✅ Categorias de adicionais copiadas';
    RAISE NOTICE '✅ Adicionais copiados';
    RAISE NOTICE '✅ Configurações de adicionais copiadas';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    
END $$;
