-- get_network_ranking excluía toda loja sem stores.franchisee_user_id
-- preenchido (operadores ligados via user_unidades, ex: conta promovida de
-- cliente comum a operadora, mesmo padrão já corrigido em
-- OrderManagement.tsx / OrdersReportsPage.tsx / useRotaDoDia.ts). Também
-- somava receita por pdv_orders.user_id em vez de store_id (ambos já
-- existem na tabela) — store_id é o vínculo direto e correto.

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
            -- Receita por store_id direto — funciona pra qualquer loja,
            -- independente de como o operador está vinculado.
            COALESCE(
                (SELECT SUM(o.total)
                 FROM public.pdv_orders o
                 WHERE o.store_id = s.id
                 AND o.status = 'paid'),
            0) as total_revenue,
            -- Treinamentos: conta o dono legado (franchisee_user_id) E
            -- qualquer operador vinculado via user_unidades.
            (
                SELECT COUNT(*)
                FROM public.uni_progress p
                WHERE p.completed = true
                AND (
                    p.user_id = s.franchisee_user_id
                    OR p.user_id IN (SELECT uu.usuario_id FROM public.user_unidades uu WHERE uu.store_id = s.id)
                )
            ) as total_lessons,
            EXISTS (
                SELECT 1 FROM public.user_unidades uu
                WHERE uu.store_id = s.id AND uu.usuario_id = auth.uid()
            ) as operator_is_me
        FROM
            public.stores s
        WHERE
            s.active = true
            AND s.status = 'active'
    )
    SELECT
        s_id,
        s_name,
        s_city,
        total_revenue,
        total_lessons,
        (total_revenue / 100) + (total_lessons * 50) as calculated_score,
        RANK() OVER (ORDER BY ((total_revenue / 100) + (total_lessons * 50)) DESC) as rank_pos,
        ((auth.uid() = f_uid) OR operator_is_me) as is_me
    FROM
        store_stats
    ORDER BY
        rank_pos ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_network_ranking() TO authenticated;
