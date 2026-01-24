-- ================================================
-- Migration: Remarketing Automation Cron Job
-- Description: Configura execução automática da Edge Function 
-- de remarketing a cada hora
-- ================================================

-- Habilitar extensão pg_cron se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar job que executa a cada hora
SELECT cron.schedule(
    'remarketing-automation-hourly', -- nome único do job
    '0 * * * *',                     -- executa no minuto 0 de cada hora (a cada 1 hora)
    $$
    SELECT
        net.http_post(
            url := (SELECT CONCAT(current_setting('app.supabase_url'), '/functions/v1/remarketing-automation')),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', CONCAT('Bearer ', current_setting('app.supabase_service_role_key'))
            ),
            body := '{}'::jsonb
        ) as request_id;
    $$
);

-- Criar tabela para rastrear execuções do cron (opcional, mas recomendado)
CREATE TABLE IF NOT EXISTS remarketing_automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentário da tabela
COMMENT ON TABLE remarketing_automation_logs IS 'Log de execuções automáticas do sistema de remarketing de 48h';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_remarketing_logs_executed_at ON remarketing_automation_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_remarketing_logs_status ON remarketing_automation_logs(status);
