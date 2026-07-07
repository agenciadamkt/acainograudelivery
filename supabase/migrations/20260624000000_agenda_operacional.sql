-- ============================================================
-- Agenda Operacional GrauOS — módulo independente.
-- CAF/CAF Connect são apenas a primeira "origem" de eventos (origem_modulo),
-- não donos da agenda. Nenhuma tabela existente é alterada.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.agenda_eventos (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo           TEXT        NOT NULL,
  descricao        TEXT,
  tipo             TEXT        NOT NULL DEFAULT 'compromisso'
                     CHECK (tipo IN ('compromisso','tarefa','retorno')),
  data_hora        TIMESTAMPTZ NOT NULL, -- horário (compromisso/retorno) ou prazo (tarefa)
  status           TEXT        NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente','concluido','cancelado')),
  concluido_em     TIMESTAMPTZ,
  responsavel_id   UUID        REFERENCES auth.users(id),

  -- Origem polimórfica — CAF é só a primeira; Frota/Financeiro/etc. usam o
  -- mesmo mecanismo depois, sem alterar esta tabela.
  origem_modulo    TEXT        NOT NULL DEFAULT 'caf',
  origem_tabela    TEXT,
  origem_id        UUID,

  -- Reservado pra Fase 2 (sync real com Google Calendar API) — não usado agora.
  google_calendar_id TEXT,
  google_event_id    TEXT,
  sync_status        TEXT NOT NULL DEFAULT 'nao_sincronizado'
                       CHECK (sync_status IN ('nao_sincronizado','sincronizado','erro')),
  last_sync_at        TIMESTAMPTZ,

  created_by       UUID        REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.agenda_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER trg_agenda_eventos_updated_at
  BEFORE UPDATE ON public.agenda_eventos
  FOR EACH ROW EXECUTE FUNCTION public.agenda_set_updated_at();

ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_agenda_eventos" ON public.agenda_eventos;
CREATE POLICY "auth_all_agenda_eventos" ON public.agenda_eventos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_agenda_eventos_data_hora      ON public.agenda_eventos(data_hora);
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_responsavel_id ON public.agenda_eventos(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_origem         ON public.agenda_eventos(origem_modulo, origem_tabela, origem_id);
CREATE INDEX IF NOT EXISTS idx_agenda_eventos_status         ON public.agenda_eventos(status);
