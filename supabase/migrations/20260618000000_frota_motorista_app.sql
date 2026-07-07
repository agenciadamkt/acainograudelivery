-- ═══════════════════════════════════════════════════════════════
-- App do Motorista — Módulo Controle de Frota
--
-- Independente do módulo Delivery (driver/dashboard, delivery_drivers).
-- A Rota do Dia (delivery_routes) já referencia fleet_drivers
-- (constraint delivery_routes_driver_id_fleet_fkey) — este módulo dá
-- ao motorista da Frota login, localização ao vivo e comprovante de
-- entrega (hora + foto), tudo dentro do próprio módulo Frota.
-- ═══════════════════════════════════════════════════════════════

-- Localização ao vivo e status do motorista da Frota
ALTER TABLE public.fleet_drivers
  ADD COLUMN IF NOT EXISTS current_location JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'offline'
    CHECK (status IN ('offline', 'disponivel', 'em_rota'));

-- Acesso público mínimo para o app do motorista (sem auth.uid() — login é por
-- telefone, sem sessão Supabase Auth, mesmo trade-off já aceito no Delivery)
CREATE POLICY "Motorista app le proprio cadastro" ON public.fleet_drivers
  FOR SELECT USING (true);

CREATE POLICY "Motorista app atualiza status e localizacao" ON public.fleet_drivers
  FOR UPDATE USING (true) WITH CHECK (true);

-- Comprovante de entrega (hora + foto) nos dois tipos de parada que a Rota do Dia usa
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS proof_photo_url TEXT;

ALTER TABLE public.manual_delivery_orders
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS proof_photo_url TEXT;

-- RLS pública mínima em delivery_routes/manual_delivery_orders para o app do
-- motorista (hoje só permitem auth.uid() com role admin/manager/staff)
CREATE POLICY "Motorista app le rotas" ON public.delivery_routes
  FOR SELECT USING (true);

CREATE POLICY "Motorista app atualiza rotas" ON public.delivery_routes
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Motorista app le pedidos manuais" ON public.manual_delivery_orders
  FOR SELECT USING (true);

CREATE POLICY "Motorista app atualiza pedidos manuais" ON public.manual_delivery_orders
  FOR UPDATE USING (true) WITH CHECK (true);

-- Bucket próprio do módulo Frota para os comprovantes de entrega
INSERT INTO storage.buckets (id, name, public)
VALUES ('frota-comprovantes', 'frota-comprovantes', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Motorista app envia comprovantes" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'frota-comprovantes');

CREATE POLICY "Qualquer um le comprovantes" ON storage.objects
  FOR SELECT USING (bucket_id = 'frota-comprovantes');
