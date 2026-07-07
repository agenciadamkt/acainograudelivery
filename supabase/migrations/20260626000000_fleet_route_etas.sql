-- ETA por parada via OSRM — persiste só o fato da malha viária (tempo e
-- distância acumulados), nunca o horário previsto (calculado em runtime, a
-- partir de delivery_routes.started_at, pra nunca "envelhecer" no banco).
-- Pedidos de franquia ficam fora (já excluídos da otimização hoje).

CREATE TABLE IF NOT EXISTS public.fleet_route_stop_etas (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id                   UUID NOT NULL REFERENCES public.delivery_routes(id),
  order_id                   UUID NOT NULL,
  order_type                 TEXT NOT NULL CHECK (order_type IN ('order','manual')),
  sequencia                  INTEGER NOT NULL,
  estimated_travel_seconds   INTEGER,
  estimated_distance_meters  DOUBLE PRECISION,
  calculated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (route_id, order_id, order_type)
);

ALTER TABLE public.fleet_route_stop_etas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_fleet_route_stop_etas" ON public.fleet_route_stop_etas;
CREATE POLICY "auth_all_fleet_route_stop_etas" ON public.fleet_route_stop_etas FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fleet_route_stop_etas_route_id ON public.fleet_route_stop_etas(route_id);

-- Marcos de ciclo de vida de uma parada (append-only) — distinto de
-- fleet_route_events (ocorrências, com severidade/resolução). Reservada:
-- nenhuma UI grava aqui ainda nesta rodada.
CREATE TABLE IF NOT EXISTS public.fleet_stop_checkpoints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    UUID NOT NULL REFERENCES public.delivery_routes(id),
  order_id    UUID NOT NULL,
  order_type  TEXT NOT NULL CHECK (order_type IN ('order','manual')),
  tipo        TEXT NOT NULL CHECK (tipo IN ('chegada','saida','tentativa_falhou')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fleet_stop_checkpoints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_fleet_stop_checkpoints" ON public.fleet_stop_checkpoints;
CREATE POLICY "auth_all_fleet_stop_checkpoints" ON public.fleet_stop_checkpoints FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_fleet_stop_checkpoints_stop ON public.fleet_stop_checkpoints(route_id, order_id, order_type);

-- Configuração operacional do Frota — linha única (singleton), cresce por
-- ALTER TABLE conforme surgirem novos parâmetros configuráveis. Thresholds
-- de atraso são regra de negócio, não código.
CREATE TABLE IF NOT EXISTS public.fleet_settings (
  id                       INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_service_time_sec INTEGER NOT NULL DEFAULT 180,
  late_warning_min         INTEGER NOT NULL DEFAULT 5,
  late_critical_min        INTEGER NOT NULL DEFAULT 15,
  extra                    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.fleet_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.fleet_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_fleet_settings" ON public.fleet_settings;
CREATE POLICY "auth_all_fleet_settings" ON public.fleet_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
