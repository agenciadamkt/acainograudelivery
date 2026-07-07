-- ============================================================
-- CAF Connect: sessões colaborativas (Meet + Excalidraw) vinculadas a
-- tickets do CAF. Não altera nenhuma tabela/política existente do CAF.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.caf_sessions (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id               UUID        NOT NULL REFERENCES public.caf_atendimentos(id) ON DELETE CASCADE,
  created_by              UUID        REFERENCES auth.users(id),
  title                   TEXT        NOT NULL,
  description             TEXT,
  session_type            TEXT        NOT NULL DEFAULT 'suporte'
                            CHECK (session_type IN ('suporte','treinamento','demonstracao','outro')),
  status                  TEXT        NOT NULL DEFAULT 'agendada'
                            CHECK (status IN ('agendada','aguardando_participantes','em_andamento','encerrada','cancelada')),
  scheduled_at            TIMESTAMPTZ,
  started_at              TIMESTAMPTZ,
  ended_at                TIMESTAMPTZ,
  duration_min            INTEGER,
  google_event_id         TEXT,
  google_meet_url         TEXT,
  excalidraw_room_id      TEXT,
  excalidraw_room_url     TEXT,
  excalidraw_snapshot_url TEXT,
  excalidraw_last_access  TIMESTAMPTZ,
  participantes           JSONB       NOT NULL DEFAULT '[]',
  summary                 TEXT,
  ai_summary              TEXT,
  next_steps              TEXT,
  recording_url           TEXT,
  recording_provider      TEXT,
  recording_duration_seg  INTEGER,
  recording_size_bytes    BIGINT,
  nps_nota                INTEGER     CHECK (nps_nota BETWEEN 0 AND 10),
  nps_problema_resolvido  BOOLEAN,
  nps_comentario          TEXT,
  nps_respondido_em       TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.caf_connect_eventos (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES public.caf_sessions(id) ON DELETE CASCADE,
  -- tipos válidos: criada | sessao_iniciada | meet_definido | quadro_criado |
  -- quadro_acessado | participante_entrou | participante_saiu | encerrada |
  -- resumo_salvo | reagendada | cancelada
  -- (participante_entrou/saiu reservados pra uma futura integração real com
  -- Meet/Calendar API — hoje, com link manual, não há como detectar entrada
  -- e saída de participantes automaticamente)
  tipo        TEXT        NOT NULL,
  descricao   TEXT,
  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Reaproveita a função de trigger já criada pro CAF (caf_set_updated_at) — não cria uma nova.
CREATE OR REPLACE TRIGGER trg_caf_sessions_updated_at
  BEFORE UPDATE ON public.caf_sessions
  FOR EACH ROW EXECUTE FUNCTION public.caf_set_updated_at();

ALTER TABLE public.caf_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caf_connect_eventos ENABLE ROW LEVEL SECURITY;

-- Mesmo padrão de RLS já usado em caf_atendimentos: aberto pra autenticados.
DROP POLICY IF EXISTS "auth_all_caf_sessions" ON public.caf_sessions;
CREATE POLICY "auth_all_caf_sessions" ON public.caf_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_all_caf_connect_eventos" ON public.caf_connect_eventos;
CREATE POLICY "auth_all_caf_connect_eventos" ON public.caf_connect_eventos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_caf_sessions_ticket_id        ON public.caf_sessions(ticket_id);
CREATE INDEX IF NOT EXISTS idx_caf_sessions_status           ON public.caf_sessions(status);
CREATE INDEX IF NOT EXISTS idx_caf_sessions_created_at       ON public.caf_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_caf_connect_eventos_session_id ON public.caf_connect_eventos(session_id);
