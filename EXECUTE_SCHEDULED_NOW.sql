-- ================================================
-- SCRIPT PARA EXECUTAR CAMPANHAS AGENDADAS MANUALMENTE
-- ================================================

-- Execute este SQL no Supabase SQL Editor para processar
-- campanhas agendadas que já passaram do horário

-- 1. Ver campanhas pendentes que deveriam ter sido enviadas
SELECT 
    id,
    name,
    segment,
    scheduled_for,
    status,
    NOW() - scheduled_for as atraso
FROM scheduled_campaigns
WHERE status = 'pending'
  AND scheduled_for <= NOW()
ORDER BY scheduled_for;

-- 2. Chamar a Edge Function para processar essas campanhas
-- COPIE E EXECUTE NO TERMINAL (não no SQL Editor):
/*
curl -X POST \
  https://sixzfcpdjtnftacuwvph.supabase.co/functions/v1/scheduled-campaigns-check \
  -H "Authorization: Bearer [SUA_SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json"
*/
