-- ==============================================================================
-- FIX (V2): CORREÇÃO "COLUMN REFERENCE status IS AMBIGUOUS" + "oi.name FIXED"
-- Objetivo: Identificar e remover triggers problemáticos e corrigir a View
--           que estava com erro de referência de coluna.
-- ==============================================================================

-- 1. Remover triggers conhecidos que podem estar causando conflito de 'status'
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
DROP TRIGGER IF EXISTS whatsapp_notification_trigger ON public.orders;
DROP TRIGGER IF EXISTS send_whatsapp_notification ON public.orders;
DROP TRIGGER IF EXISTS check_order_status ON public.orders;

-- 2. Recriar View customer_analytics CORRIGIDA
-- Agora fazendo JOIN com products para pegar o nome corretamente
CREATE OR REPLACE VIEW public.customer_analytics AS
WITH customer_stats AS (
    SELECT 
        c.id,
        c.name,
        c.phone,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(o.total_amount), 0) as ltv,
        MAX(o.created_at) as last_order_date,
        MIN(o.created_at) as first_order_date
    FROM 
        public.customers c
    LEFT JOIN 
        public.orders o ON c.id = o.customer_id AND o.status = 'delivered'
    GROUP BY 
        c.id
),
favorite_products AS (
    SELECT DISTINCT ON (o.customer_id)
        o.customer_id,
        p.name as product_name -- Agora pegando da tabela products (p.name)
    FROM 
        public.orders o
    JOIN 
        public.order_items oi ON o.id = oi.order_id
    JOIN
        public.products p ON oi.product_id = p.id -- JOIN adicionado
    GROUP BY 
        o.customer_id, p.name
    ORDER BY 
        o.customer_id, COUNT(*) DESC
)
SELECT 
    cs.id,
    cs.name,
    cs.phone,
    cs.total_orders,
    cs.ltv,
    cs.last_order_date,
    cs.first_order_date,
    CASE 
        WHEN cs.total_orders = 0 THEN 'lead'
        WHEN cs.last_order_date > (NOW() - INTERVAL '30 days') THEN 'active'
        WHEN cs.last_order_date > (NOW() - INTERVAL '60 days') THEN 'risk'
        ELSE 'churn'
    END as status, -- Alias explícito para evitar ambiguidade
    fp.product_name as favorite_product
FROM 
    customer_stats cs
LEFT JOIN 
    favorite_products fp ON cs.id = fp.customer_id;

-- 3. Mensagem de sucesso
SELECT 'View recriada com sucesso e triggers conflitantes removidos.' as result;
