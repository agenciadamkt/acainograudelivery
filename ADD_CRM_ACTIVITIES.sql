-- =============================================================
-- CRM Fase 1 — Atividades, Score e Melhorias
-- Execute no Supabase SQL Editor
-- =============================================================

-- 1. Tabela de Atividades (ligações, WhatsApp, notas, reuniões)
CREATE TABLE IF NOT EXISTS crm_activities (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id          UUID REFERENCES crm_leads(id) ON DELETE CASCADE NOT NULL,
  tipo             TEXT NOT NULL DEFAULT 'nota', -- ligacao | whatsapp | email | reuniao | nota | sms
  titulo           TEXT,
  descricao        TEXT,
  resultado        TEXT,  -- falha_contato | em_progresso | interesse | sem_interesse | reuniao_agendada
  data_horario     TIMESTAMPTZ DEFAULT NOW(),
  duracao_minutos  INTEGER,
  prox_seguimento  TIMESTAMPTZ,  -- próxima ação agendada
  usuario_nome     TEXT,
  score_delta      INTEGER DEFAULT 0,  -- quanto alterou o score
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_crm_activities" ON crm_activities
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_crm_activities_lead ON crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_prox ON crm_activities(prox_seguimento)
  WHERE prox_seguimento IS NOT NULL;

-- 2. Adicionar campos extras ao crm_leads
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS probabilidade INTEGER DEFAULT 5;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS tags         TEXT[] DEFAULT '{}';
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- 3. Melhorar motivo_perda — garantir que exista
ALTER TABLE crm_leads ALTER COLUMN motivo_perda TYPE TEXT;
