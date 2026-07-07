-- ============================================================
-- CAF: Central de Atendimento ao Franqueado
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.caf_protocolo_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_caf_protocolo()
RETURNS TEXT LANGUAGE plpgsql AS $$
BEGIN
  RETURN 'AT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('public.caf_protocolo_seq')::TEXT, 6, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.caf_atendimentos (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo            TEXT        UNIQUE NOT NULL DEFAULT public.generate_caf_protocolo(),
  store_id             UUID,

  loja_franqueada      TEXT,
  codigo_loja          TEXT,
  cidade               TEXT,
  estado               TEXT,

  solicitante_nome     TEXT,
  solicitante_cargo    TEXT,

  canal                TEXT    NOT NULL DEFAULT 'WhatsApp',
  categoria            TEXT    NOT NULL,
  subcategoria         TEXT,
  prioridade           TEXT    NOT NULL DEFAULT 'Média',
  descricao            TEXT,
  solucao              TEXT,
  status               TEXT    NOT NULL DEFAULT 'Aberto',

  atendente_id         UUID,
  atendente_nome       TEXT,

  respondido_em        TIMESTAMPTZ,
  resolvido_em         TIMESTAMPTZ,
  encerrado_em         TIMESTAMPTZ,
  tempo_resposta_min   INTEGER,
  tempo_resolucao_min  INTEGER,

  satisfacao_token     TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.caf_satisfacao (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id      UUID NOT NULL REFERENCES public.caf_atendimentos(id) ON DELETE CASCADE,
  problema_resolvido  TEXT,
  nota                INTEGER CHECK (nota >= 1 AND nota <= 5),
  comentario          TEXT,
  nps                 INTEGER CHECK (nps >= 0 AND nps <= 10),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.caf_artigos (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo                TEXT    NOT NULL,
  conteudo              TEXT    NOT NULL,
  categoria             TEXT,
  subcategoria          TEXT,
  tags                  TEXT[]  DEFAULT '{}',
  visualizacoes         INTEGER DEFAULT 0,
  atendimento_origem_id UUID    REFERENCES public.caf_atendimentos(id) ON DELETE SET NULL,
  criado_por            UUID,
  criado_por_nome       TEXT,
  publicado             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.caf_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER trg_caf_atendimentos_updated_at
  BEFORE UPDATE ON public.caf_atendimentos
  FOR EACH ROW EXECUTE FUNCTION public.caf_set_updated_at();

CREATE OR REPLACE TRIGGER trg_caf_artigos_updated_at
  BEFORE UPDATE ON public.caf_artigos
  FOR EACH ROW EXECUTE FUNCTION public.caf_set_updated_at();

ALTER TABLE public.caf_atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caf_satisfacao    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caf_artigos       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_caf_atendimentos"   ON public.caf_atendimentos;
DROP POLICY IF EXISTS "anon_select_caf_atendimentos" ON public.caf_atendimentos;
CREATE POLICY "auth_all_caf_atendimentos"    ON public.caf_atendimentos FOR ALL  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_caf_atendimentos" ON public.caf_atendimentos FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_insert_caf_satisfacao" ON public.caf_satisfacao;
DROP POLICY IF EXISTS "auth_select_caf_satisfacao" ON public.caf_satisfacao;
CREATE POLICY "anon_insert_caf_satisfacao" ON public.caf_satisfacao FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "auth_select_caf_satisfacao" ON public.caf_satisfacao FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_all_caf_artigos"   ON public.caf_artigos;
DROP POLICY IF EXISTS "anon_select_caf_artigos" ON public.caf_artigos;
CREATE POLICY "auth_all_caf_artigos"    ON public.caf_artigos FOR ALL    TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_select_caf_artigos" ON public.caf_artigos FOR SELECT TO anon USING (publicado = true);

CREATE INDEX IF NOT EXISTS idx_caf_atendimentos_status     ON public.caf_atendimentos(status);
CREATE INDEX IF NOT EXISTS idx_caf_atendimentos_categoria  ON public.caf_atendimentos(categoria);
CREATE INDEX IF NOT EXISTS idx_caf_atendimentos_created_at ON public.caf_atendimentos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_caf_atendimentos_token      ON public.caf_atendimentos(satisfacao_token);
CREATE INDEX IF NOT EXISTS idx_caf_artigos_publicado       ON public.caf_artigos(publicado);
CREATE INDEX IF NOT EXISTS idx_caf_artigos_created_at      ON public.caf_artigos(created_at DESC);
