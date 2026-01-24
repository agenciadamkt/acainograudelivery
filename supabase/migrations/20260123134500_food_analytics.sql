-- 1. Create a view for Customer Analytics (LTV, Recency, Status)
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
        oi.name as product_name
    FROM 
        public.orders o
    JOIN 
        public.order_items oi ON o.id = oi.order_id
    GROUP BY 
        o.customer_id, oi.name
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
    END as status,
    fp.product_name as favorite_product
FROM 
    customer_stats cs
LEFT JOIN 
    favorite_products fp ON cs.id = fp.customer_id;

-- 2. Update marketing_campaigns table for advanced features
ALTER TABLE public.marketing_campaigns 
ADD COLUMN IF NOT EXISTS schedule_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS template_type TEXT DEFAULT 'manual', -- 'birthday', 'champion', 'winback', etc.
ADD COLUMN IF NOT EXISTS smart_variables JSONB DEFAULT '[]'::jsonb; -- e.g. ['name', 'favorite_product']

-- 3. Grant access to the view
GRANT SELECT ON public.customer_analytics TO authenticated;
GRANT SELECT ON public.customer_analytics TO service_role;
