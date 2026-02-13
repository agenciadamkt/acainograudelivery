-- Function to get network ranking
-- Calculates score based on: Reference (Revenue / 100) + (Completed Lessons * 50)

CREATE OR REPLACE FUNCTION public.get_network_ranking()
RETURNS TABLE (
    store_id UUID,
    store_name TEXT,
    store_city TEXT,
    revenue NUMERIC,
    lessons_completed BIGINT,
    score NUMERIC,
    rank_pos BIGINT,
    is_current_user BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH store_stats AS (
        SELECT 
            s.id as s_id,
            s.name as s_name,
            s.city as s_city,
            s.franchisee_user_id as f_uid,
            -- Sum PAID orders only
            COALESCE(
                (SELECT SUM(o.total) 
                 FROM public.pdv_orders o 
                 WHERE o.user_id = s.franchisee_user_id 
                 AND o.status = 'paid'), 
            0) as total_revenue,
            -- Count completed lessons for the franchisee
            (
                SELECT COUNT(*) 
                FROM public.uni_progress p 
                WHERE p.user_id = s.franchisee_user_id 
                AND p.completed = true
            ) as total_lessons
        FROM 
            public.stores s
        WHERE 
            s.active = true 
            AND s.status = 'active'
            AND s.franchisee_user_id IS NOT NULL
    )
    SELECT 
        s_id,
        s_name,
        s_city,
        total_revenue,
        total_lessons,
        -- Score Calculation: 1 point per R$100 + 50 points per lesson
        (total_revenue / 100) + (total_lessons * 50) as calculated_score,
        RANK() OVER (ORDER BY ((total_revenue / 100) + (total_lessons * 50)) DESC) as rank_pos,
        (auth.uid() = f_uid) as is_me
    FROM 
        store_stats
    ORDER BY 
        rank_pos ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_network_ranking() TO authenticated;
