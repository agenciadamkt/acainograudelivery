-- Log de eventos da rota do motorista (Frota) — generalizado de propósito
-- (não "incidents"): hoje cobre ocorrências durante a entrega, mas serve de
-- base pra auditoria/timeline/relatórios futuros do módulo sem precisar de
-- nova migration. Nenhuma tabela existente é alterada.

CREATE TABLE IF NOT EXISTS public.fleet_route_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id       UUID        NOT NULL REFERENCES public.delivery_routes(id),
  driver_id      UUID        NOT NULL REFERENCES public.fleet_drivers(id),

  -- Nem todo evento é de uma parada específica (ex: problema no veículo
  -- afeta a rota inteira) — por isso nullable, com tipo da origem.
  order_id       UUID,
  order_type     TEXT        CHECK (order_type IN ('order','manual','franchisee')),

  tipo           TEXT        NOT NULL
                   CHECK (tipo IN ('cliente_ausente','endereco_incorreto','veiculo_problema','pedido_recusado','observacao','atraso','outro')),
  severity       TEXT        NOT NULL DEFAULT 'info'
                   CHECK (severity IN ('info','warning','critical')),
  observacao     TEXT,

  -- Capturados automaticamente da última posição de GPS conhecida no
  -- momento do registro — não é campo manual do motorista.
  latitude       DOUBLE PRECISION,
  longitude      DOUBLE PRECISION,

  -- Reservada pra foto do evento — formulário desta rodada não usa ainda,
  -- evita ter que migrar de novo quando precisar.
  attachment_url TEXT,

  -- NULL = aberta; setado quando o admin marca como resolvida.
  resolved_at    TIMESTAMPTZ,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_route_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_fleet_route_events" ON public.fleet_route_events;
CREATE POLICY "auth_all_fleet_route_events" ON public.fleet_route_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fleet_route_events_route_id  ON public.fleet_route_events(route_id);
CREATE INDEX IF NOT EXISTS idx_fleet_route_events_driver_id ON public.fleet_route_events(driver_id);
CREATE INDEX IF NOT EXISTS idx_fleet_route_events_open      ON public.fleet_route_events(resolved_at) WHERE resolved_at IS NULL;
