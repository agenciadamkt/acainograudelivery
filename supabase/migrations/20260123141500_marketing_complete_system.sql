-- ================================================
-- Migration: Sistema Completo de Marketing
-- Description: Adiciona agendamento, aniversariantes e envio em massa
-- ================================================

-- 1. Adicionar campo birth_date na tabela customers (se não existir)
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Índice para queries de aniversariantes
CREATE INDEX IF NOT EXISTS idx_customers_birth_date ON customers(birth_date);

-- 2. Criar tabela de campanhas agendadas
CREATE TABLE IF NOT EXISTS scheduled_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    image_url TEXT,
    footer_text TEXT,
    choices JSONB DEFAULT '[]'::jsonb,
    segment TEXT NOT NULL, -- 'all', 'new', 'inactive', 'birthday'
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'sending', 'sent', 'failed'
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    executed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Comentários
COMMENT ON TABLE scheduled_campaigns IS 'Campanhas de marketing agendadas para envio futuro';
COMMENT ON COLUMN scheduled_campaigns.segment IS 'Segmento alvo: all (todos), new (novos), inactive (inativos), birthday (aniversariantes)';
COMMENT ON COLUMN scheduled_campaigns.status IS 'Status: pending (aguardando), sending (enviando), sent (enviado), failed (falhou)';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_scheduled_campaigns_scheduled_for ON scheduled_campaigns(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_scheduled_campaigns_status ON scheduled_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_campaigns_created_at ON scheduled_campaigns(created_at DESC);

-- 3. Adicionar coluna segment na tabela marketing_logs
ALTER TABLE marketing_logs 
ADD COLUMN IF NOT EXISTS segment TEXT,
ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'manual'; -- 'manual', 'scheduled', 'automated', 'birthday'

-- 4. Criar view para aniversariantes do dia
CREATE OR REPLACE VIEW birthday_customers_today AS
SELECT 
    c.*,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.birth_date)) as age
FROM customers c
WHERE 
    c.birth_date IS NOT NULL
    AND EXTRACT(MONTH FROM c.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM c.birth_date) = EXTRACT(DAY FROM CURRENT_DATE);

-- 5. Criar view para aniversariantes do mês
CREATE OR REPLACE VIEW birthday_customers_this_month AS
SELECT 
    c.*,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, c.birth_date)) as age,
    c.birth_date as birthday_date
FROM customers c
WHERE 
    c.birth_date IS NOT NULL
    AND EXTRACT(MONTH FROM c.birth_date) = EXTRACT(MONTH FROM CURRENT_DATE)
ORDER BY EXTRACT(DAY FROM c.birth_date);

-- 6. Função para obter estatísticas de campanhas
CREATE OR REPLACE FUNCTION get_campaign_stats(time_range_days INTEGER DEFAULT 30)
RETURNS TABLE (
    total_sent BIGINT,
    total_campaigns BIGINT,
    avg_per_day NUMERIC,
    by_segment JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_sent,
        COUNT(DISTINCT campaign_id)::BIGINT as total_campaigns,
        ROUND(COUNT(*)::NUMERIC / NULLIF(time_range_days, 0), 2) as avg_per_day,
        jsonb_object_agg(
            COALESCE(segment, 'unknown'), 
            segment_count
        ) as by_segment
    FROM (
        SELECT 
            segment,
            COUNT(*) as segment_count
        FROM marketing_logs
        WHERE sent_at >= CURRENT_DATE - (time_range_days || ' days')::INTERVAL
        GROUP BY segment
    ) seg_stats;
END;
$$ LANGUAGE plpgsql;

-- Comentário da função
COMMENT ON FUNCTION get_campaign_stats IS 'Retorna estatísticas de campanhas de marketing para um período específico';

-- 7. Políticas RLS (Row Level Security) para scheduled_campaigns
ALTER TABLE scheduled_campaigns ENABLE ROW LEVEL SECURITY;

-- Permitir visualização para usuários autenticados
CREATE POLICY IF NOT EXISTS "Permitir visualização de campanhas agendadas"
    ON scheduled_campaigns
    FOR SELECT
    TO authenticated
    USING (true);

-- Permitir inserção apenas para managers
CREATE POLICY IF NOT EXISTS "Permitir criação de campanhas agendadas para managers"
    ON scheduled_campaigns
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = auth.users.id
            AND (
                auth.users.raw_user_meta_data->>'role' = 'manager'
                OR auth.users.raw_user_meta_data->>'role' = 'franchisee_master'
            )
        )
    );

-- Permitir atualização apenas para managers ou criador
CREATE POLICY IF NOT EXISTS "Permitir atualização de campanhas agendadas"
    ON scheduled_campaigns
    FOR UPDATE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = auth.users.id
            AND auth.users.raw_user_meta_data->>'role' = 'manager'
        )
    );

-- Permitir exclusão apenas para criador ou managers
CREATE POLICY IF NOT EXISTS "Permitir exclusão de campanhas agendadas"
    ON scheduled_campaigns
    FOR DELETE
    TO authenticated
    USING (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = auth.users.id
            AND auth.users.raw_user_meta_data->>'role' = 'manager'
        )
    );

-- 8. Trigger para atualizar timestamp quando campanha é executada
CREATE OR REPLACE FUNCTION update_scheduled_campaign_executed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'sent' OR NEW.status = 'failed' THEN
        NEW.executed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_executed_at
    BEFORE UPDATE ON scheduled_campaigns
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_scheduled_campaign_executed_at();
