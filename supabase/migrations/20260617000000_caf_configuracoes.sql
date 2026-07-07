CREATE TABLE IF NOT EXISTS public.caf_configuracoes (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL DEFAULT 'null'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.caf_configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all_caf_configuracoes" ON public.caf_configuracoes;

CREATE POLICY "auth_all_caf_configuracoes"
  ON public.caf_configuracoes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO public.caf_configuracoes (key, value)
VALUES (
  'caf_cargos',
  to_jsonb(ARRAY['Proprietário','Gerente','Caixa','Supervisor','Atendimento']::text[])
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.caf_configuracoes (key, value)
VALUES (
  'caf_canais',
  to_jsonb(ARRAY['WhatsApp','Telefone','E-mail','Presencial','Grupo de WhatsApp']::text[])
) ON CONFLICT (key) DO NOTHING;

INSERT INTO public.caf_configuracoes (key, value)
VALUES (
  'caf_categorias',
  jsonb_build_object(
    'Suporte ao Sistema', to_jsonb(ARRAY['PDV','Cadastro','Relatórios','Estoque','Aplicativo']::text[]),
    'Marketing',          to_jsonb(ARRAY['Promoções','Redes Sociais','Campanhas','Materiais']::text[]),
    'Financeiro',         to_jsonb(ARRAY['Boletos','Royalties','Taxas']::text[]),
    'Pedidos',            to_jsonb(ARRAY['Realização','Cancelamento','Entrega','Produto']::text[]),
    'Processos',          to_jsonb(ARRAY['Operacional','RH','Treinamento','Auditoria']::text[])
  )
) ON CONFLICT (key) DO NOTHING;
