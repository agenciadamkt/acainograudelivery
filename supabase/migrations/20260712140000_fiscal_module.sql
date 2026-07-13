-- ============================================================================
-- MÓDULO FISCAL (PlugNotas / Tecnospeed) — Migration única (Fase 3)
-- NFC-e / NF-e (foco inicial) · preparado para NFS-e / MDF-e / CF-e
--
-- Princípios:
--  · Desacoplado dos módulos PDV/Delivery/Financeiro — consome orders/pdv_orders.
--  · Token do PlugNotas cifrado (pgcrypto); descriptografia só em edge function.
--  · RLS por loja via public.user_manages_store(auth.uid(), store_id).
--  · Escritas fiscais = manager+ no cliente (edge functions usam SERVICE_ROLE).
--  · Status/eventos legíveis também por staff (exibição no PDV/detalhe do pedido).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ────────────────────────────────────────────────────────────────────────────
-- 0. Campos fiscais que faltavam na loja (emitente)
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS regime_tributario     smallint,      -- CRT: 1=Simples, 2=Simples excesso, 3=Regime Normal
  ADD COLUMN IF NOT EXISTS codigo_municipio_ibge text;          -- código IBGE do município do emitente

COMMENT ON COLUMN public.stores.regime_tributario IS 'CRT: 1=Simples Nacional, 2=Simples excesso, 3=Regime Normal';

-- ────────────────────────────────────────────────────────────────────────────
-- 1. fiscal_companies — empresa vinculada ao PlugNotas (1:1 com stores)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fiscal_companies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              uuid NOT NULL UNIQUE REFERENCES public.stores(id) ON DELETE CASCADE,
  plugnotas_company_id  text,
  ambiente              text NOT NULL DEFAULT 'homologacao'
                          CHECK (ambiente IN ('sandbox','homologacao','producao')),
  token_encrypted       bytea,                                  -- pgp_sym_encrypt(token) — nunca lido no cliente
  webhook_secret        text,
  regime_tributario     smallint,                               -- espelha/override do CRT da loja
  codigo_municipio_ibge text,
  certificado_ativo_id  uuid,                                   -- FK lógica p/ fiscal_certificates (setada depois)
  auto_emitir           boolean NOT NULL DEFAULT false,
  timeout_seg           integer NOT NULL DEFAULT 30,
  danfe_logo_url        text,
  danfe_rodape          text,
  ativo                 boolean NOT NULL DEFAULT true,
  ultimo_sync           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
COMMENT ON COLUMN public.fiscal_companies.token_encrypted IS 'Token PlugNotas cifrado via pgcrypto. Descriptografado somente em edge function.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. fiscal_certificates — certificados digitais (metadados; .pfx fica no PlugNotas)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fiscal_certificates (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id                 uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  fiscal_company_id        uuid REFERENCES public.fiscal_companies(id) ON DELETE CASCADE,
  plugnotas_certificate_id text,
  titular_cnpj             text,
  nome_cn                  text,
  vencimento               date,
  status                   text NOT NULL DEFAULT 'valido'
                             CHECK (status IN ('valido','proximo_vencimento','vencido')),
  ativo                    boolean NOT NULL DEFAULT true,
  uploaded_by              uuid REFERENCES auth.users(id),
  created_at               timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. fiscal_documents — tabela principal (um registro por emissão)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fiscal_documents (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  fiscal_company_id     uuid REFERENCES public.fiscal_companies(id) ON DELETE SET NULL,
  order_id              uuid REFERENCES public.orders(id) ON DELETE SET NULL,       -- origem: delivery/checkout
  pdv_order_id          uuid REFERENCES public.pdv_orders(id) ON DELETE SET NULL,   -- origem: PDV/balcão
  tipo_documento        text NOT NULL
                          CHECK (tipo_documento IN ('NFCE','NFE','NFSE','MDFE','CFE')),
  status                text NOT NULL DEFAULT 'RASCUNHO'
                          CHECK (status IN ('RASCUNHO','PROCESSANDO','AUTORIZADO','REJEITADO','CANCELADO','INUTILIZADO','ERRO')),
  ambiente              text NOT NULL DEFAULT 'homologacao'
                          CHECK (ambiente IN ('sandbox','homologacao','producao')),
  plugnotas_id          text,
  protocolo             text,
  chave                 text,
  numero                integer,
  serie                 integer,
  valor_total           numeric(12,2),
  destinatario_nome     text,
  destinatario_documento text,
  xml_url               text,
  pdf_url               text,
  motivo_rejeicao       text,
  payload_enviado       jsonb,
  payload_recebido      jsonb,
  emitido_por           uuid REFERENCES auth.users(id),
  emitido_em            timestamptz,
  cancelado_por         uuid REFERENCES auth.users(id),
  cancelado_em          timestamptz,
  motivo_cancelamento   text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. fiscal_events — timeline / auditoria do documento
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fiscal_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_document_id  uuid NOT NULL REFERENCES public.fiscal_documents(id) ON DELETE CASCADE,
  tipo                text NOT NULL
                        CHECK (tipo IN ('EMITIDO','AUTORIZADO','REJEITADO','CANCELADO','CONSULTA','WEBHOOK','REPROCESSAMENTO','ERRO')),
  descricao           text,
  payload             jsonb,
  user_id             uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. fiscal_series — numeração por empresa / tipo / ambiente
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fiscal_series (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id           uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  fiscal_company_id  uuid NOT NULL REFERENCES public.fiscal_companies(id) ON DELETE CASCADE,
  tipo_documento     text NOT NULL
                       CHECK (tipo_documento IN ('NFCE','NFE','NFSE','MDFE','CFE')),
  serie              integer NOT NULL DEFAULT 1,
  proximo_numero     integer NOT NULL DEFAULT 1,
  ambiente           text NOT NULL DEFAULT 'homologacao'
                       CHECK (ambiente IN ('sandbox','homologacao','producao')),
  ativo              boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fiscal_company_id, tipo_documento, serie, ambiente)
);

-- ────────────────────────────────────────────────────────────────────────────
-- 6. fiscal_logs — toda comunicação com o PlugNotas
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fiscal_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  fiscal_document_id  uuid REFERENCES public.fiscal_documents(id) ON DELETE SET NULL,
  endpoint            text,
  metodo              text,
  request             jsonb,
  response            jsonb,
  status_code         integer,
  erro                text,
  duracao_ms          integer,
  user_id             uuid REFERENCES auth.users(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- 7. product_fiscal_data — enriquecimento fiscal do produto (tabela separada)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_fiscal_data (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id            uuid NOT NULL UNIQUE REFERENCES public.products(id) ON DELETE CASCADE,
  store_id              uuid REFERENCES public.stores(id) ON DELETE CASCADE,  -- denormalizado p/ RLS simples
  ncm                   text,
  cest                  text,
  cfop_interno          text,
  cfop_interestadual    text,
  origem                smallint,                       -- 0..8 (origem da mercadoria)
  unidade_tributavel    text,
  cst_csosn             text,
  aliquota_icms         numeric(6,2),
  aliquota_pis          numeric(6,2),
  aliquota_cofins       numeric(6,2),
  ativo                 boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────────
-- Índices
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_store       ON public.fiscal_documents(store_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_order       ON public.fiscal_documents(order_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_pdv_order   ON public.fiscal_documents(pdv_order_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_status      ON public.fiscal_documents(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_chave       ON public.fiscal_documents(chave);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_plugnotas   ON public.fiscal_documents(plugnotas_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_documents_created     ON public.fiscal_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fiscal_events_document       ON public.fiscal_events(fiscal_document_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_store            ON public.fiscal_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_logs_document         ON public.fiscal_logs(fiscal_document_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_certificates_store    ON public.fiscal_certificates(store_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_series_company        ON public.fiscal_series(fiscal_company_id);
CREATE INDEX IF NOT EXISTS idx_product_fiscal_data_store    ON public.product_fiscal_data(store_id);

-- ────────────────────────────────────────────────────────────────────────────
-- RLS
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.fiscal_companies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_series       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_fiscal_data ENABLE ROW LEVEL SECURITY;

-- fiscal_companies — gestão manager+; token nunca é lido no cliente (hooks omitem a coluna)
CREATE POLICY "fiscal_companies_manage" ON public.fiscal_companies
  FOR ALL USING (public.user_manages_store(auth.uid(), store_id))
  WITH CHECK (public.user_manages_store(auth.uid(), store_id));

-- fiscal_certificates — gestão manager+
CREATE POLICY "fiscal_certificates_manage" ON public.fiscal_certificates
  FOR ALL USING (public.user_manages_store(auth.uid(), store_id))
  WITH CHECK (public.user_manages_store(auth.uid(), store_id));

-- fiscal_series — gestão manager+
CREATE POLICY "fiscal_series_manage" ON public.fiscal_series
  FOR ALL USING (public.user_manages_store(auth.uid(), store_id))
  WITH CHECK (public.user_manages_store(auth.uid(), store_id));

-- fiscal_logs — leitura/gestão manager+
CREATE POLICY "fiscal_logs_manage" ON public.fiscal_logs
  FOR ALL USING (public.user_manages_store(auth.uid(), store_id))
  WITH CHECK (public.user_manages_store(auth.uid(), store_id));

-- product_fiscal_data — gestão manager+
CREATE POLICY "product_fiscal_data_manage" ON public.product_fiscal_data
  FOR ALL USING (public.user_manages_store(auth.uid(), store_id))
  WITH CHECK (public.user_manages_store(auth.uid(), store_id));

-- fiscal_documents — escrita manager+; leitura também p/ staff (status no PDV/pedido)
CREATE POLICY "fiscal_documents_manage" ON public.fiscal_documents
  FOR ALL USING (public.user_manages_store(auth.uid(), store_id))
  WITH CHECK (public.user_manages_store(auth.uid(), store_id));
CREATE POLICY "fiscal_documents_staff_read" ON public.fiscal_documents
  FOR SELECT USING (public.has_role(auth.uid(), 'staff'::app_role));

-- fiscal_events — escrita manager+ (via doc); leitura p/ staff
CREATE POLICY "fiscal_events_manage" ON public.fiscal_events
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.fiscal_documents d
    WHERE d.id = fiscal_document_id AND public.user_manages_store(auth.uid(), d.store_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.fiscal_documents d
    WHERE d.id = fiscal_document_id AND public.user_manages_store(auth.uid(), d.store_id)
  ));
CREATE POLICY "fiscal_events_staff_read" ON public.fiscal_events
  FOR SELECT USING (public.has_role(auth.uid(), 'staff'::app_role));
