-- ──────────────────────────────────────────────────────────────────────────────
-- CAF: Permissões por categoria + Histórico de eventos
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Campos de participação CAF no perfil do usuário
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS caf_ativo       boolean  NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS caf_categorias  text[]   NOT NULL DEFAULT '{}';

-- 2. Tabela de histórico/auditoria de atendimentos
CREATE TABLE IF NOT EXISTS caf_historico (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  atendimento_id  uuid        NOT NULL REFERENCES caf_atendimentos(id) ON DELETE CASCADE,
  tipo            text        NOT NULL,   -- 'TRANSFERENCIA_CATEGORIA' | 'MUDANCA_STATUS'
  usuario_id      uuid,
  usuario_nome    text,
  campo           text,                   -- coluna alterada
  valor_anterior  text,
  valor_novo      text,
  motivo          text,
  criado_em       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caf_historico_atendimento
  ON caf_historico (atendimento_id, criado_em DESC);

-- 3. RLS na tabela de histórico
ALTER TABLE caf_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "caf_historico_read"
  ON caf_historico FOR SELECT TO authenticated USING (true);

CREATE POLICY "caf_historico_insert"
  ON caf_historico FOR INSERT TO authenticated WITH CHECK (true);
