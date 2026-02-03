-- =============================================
-- FLEET DISPLACEMENT RITUAL SYSTEM
-- Ritual de Deslocamento de Frota
-- Objetivo: Eliminar Vazios de Cobertura em Teresina
-- =============================================

-- =============================================
-- TABELA 1: Geo-Fences (Zonas/Bairros)
-- =============================================

CREATE TABLE IF NOT EXISTS geo_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,                    -- Nome da zona/bairro
  city VARCHAR(255) NOT NULL DEFAULT 'Teresina',
  state VARCHAR(2) NOT NULL DEFAULT 'PI',
  -- Coordenadas do centro da zona
  center_lat DECIMAL(10, 8) NOT NULL,
  center_lng DECIMAL(11, 8) NOT NULL,
  -- Raio da zona em km
  radius_km DECIMAL(5, 2) NOT NULL DEFAULT 2.0,
  -- Configurações
  min_drivers_required INTEGER NOT NULL DEFAULT 2,  -- Mínimo de drivers para não ser vazio
  priority_level INTEGER DEFAULT 1,                  -- 1=baixa, 2=média, 3=alta
  -- Status
  active BOOLEAN DEFAULT true,
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA 2: Status de Cobertura das Zonas (Snapshot)
-- =============================================

CREATE TABLE IF NOT EXISTS zone_coverage_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES geo_zones(id) ON DELETE CASCADE,
  -- Contagens
  stores_online INTEGER NOT NULL DEFAULT 0,
  drivers_available INTEGER NOT NULL DEFAULT 0,
  drivers_busy INTEGER NOT NULL DEFAULT 0,
  pending_orders INTEGER NOT NULL DEFAULT 0,
  -- Status calculado
  coverage_status VARCHAR(50) NOT NULL CHECK (coverage_status IN ('healthy', 'warning', 'critical_void', 'no_stores')),
  -- Deficiência
  driver_deficit INTEGER DEFAULT 0,
  -- Timestamp
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA 3: Missões de Deslocamento
-- =============================================

CREATE TABLE IF NOT EXISTS displacement_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Zona alvo
  target_zone_id UUID NOT NULL REFERENCES geo_zones(id) ON DELETE CASCADE,
  -- Driver convidado
  driver_id UUID NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
  -- Origem do driver
  origin_lat DECIMAL(10, 8),
  origin_lng DECIMAL(11, 8),
  origin_zone_id UUID REFERENCES geo_zones(id),
  -- Status da missão
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Notificação enviada, aguardando resposta
    'accepted',     -- Driver aceitou
    'rejected',     -- Driver recusou
    'in_transit',   -- Driver a caminho
    'arrived',      -- Driver chegou na zona
    'expired',      -- Expirou sem resposta
    'cancelled'     -- Cancelada pelo sistema
  )),
  -- Distância e tempo estimado
  distance_km DECIMAL(5, 2),
  estimated_time_minutes INTEGER,
  -- Timestamps de tracking
  notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  arrived_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  -- Priority status concedido
  priority_granted BOOLEAN DEFAULT false,
  priority_expires_at TIMESTAMP WITH TIME ZONE,
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA 4: Log de Eficácia (Etapa 14 - Qualidade)
-- =============================================

CREATE TABLE IF NOT EXISTS displacement_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Referências
  zone_id UUID NOT NULL REFERENCES geo_zones(id) ON DELETE CASCADE,
  coverage_snapshot_id UUID REFERENCES zone_coverage_status(id),
  -- Quando o vazio foi detectado
  void_detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  -- Métricas de convite
  drivers_notified INTEGER NOT NULL DEFAULT 0,
  drivers_accepted INTEGER NOT NULL DEFAULT 0,
  drivers_rejected INTEGER NOT NULL DEFAULT 0,
  drivers_expired INTEGER NOT NULL DEFAULT 0,
  -- Métricas de resolução
  void_filled_at TIMESTAMP WITH TIME ZONE,
  time_to_fill_minutes INTEGER,
  -- Métricas de resultado
  first_arrival_at TIMESTAMP WITH TIME ZONE,
  orders_served_after INTEGER DEFAULT 0,
  -- Status final
  resolution_status VARCHAR(50) CHECK (resolution_status IN (
    'filled',       -- Vazio preenchido
    'partial',      -- Parcialmente preenchido
    'unfilled',     -- Não resolvido
    'self_resolved' -- Resolveu sozinho (drivers chegaram normalmente)
  )),
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes para performance
CREATE INDEX IF NOT EXISTS idx_geo_zones_location ON geo_zones(center_lat, center_lng);
CREATE INDEX IF NOT EXISTS idx_zone_coverage_status_zone ON zone_coverage_status(zone_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_displacement_missions_driver ON displacement_missions(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_displacement_missions_zone ON displacement_missions(target_zone_id, status);
CREATE INDEX IF NOT EXISTS idx_displacement_analytics_zone ON displacement_analytics(zone_id, void_detected_at DESC);

-- Enable RLS
ALTER TABLE geo_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_coverage_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE displacement_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE displacement_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated can view geo_zones" ON geo_zones FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Managers can manage geo_zones" ON geo_zones FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager', 'franchisee_master', 'admin'))
);

CREATE POLICY "Authenticated can view zone_coverage" ON zone_coverage_status FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System can manage zone_coverage" ON zone_coverage_status FOR ALL USING (true);

CREATE POLICY "Authenticated can view missions" ON displacement_missions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System can manage missions" ON displacement_missions FOR ALL USING (true);

CREATE POLICY "Authenticated can view analytics" ON displacement_analytics FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "System can manage analytics" ON displacement_analytics FOR ALL USING (true);

-- =============================================
-- FUNÇÃO: Calcular distância entre dois pontos (Haversine)
-- =============================================

CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 DECIMAL, lng1 DECIMAL,
  lat2 DECIMAL, lng2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN 6371 * acos(
    cos(radians(lat1)) * cos(radians(lat2)) *
    cos(radians(lng2) - radians(lng1)) +
    sin(radians(lat1)) * sin(radians(lat2))
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================
-- TAREFA 1: Função de Monitoramento de Zonas (Cron Job)
-- Verifica cobertura de todas as zonas a cada 2 minutos
-- =============================================

CREATE OR REPLACE FUNCTION check_zone_coverage()
RETURNS TABLE (
  zone_id UUID,
  zone_name VARCHAR,
  stores_online INTEGER,
  drivers_available INTEGER,
  coverage_status VARCHAR,
  driver_deficit INTEGER
) AS $$
DECLARE
  v_zone RECORD;
  v_stores_online INTEGER;
  v_drivers_available INTEGER;
  v_drivers_busy INTEGER;
  v_pending_orders INTEGER;
  v_status VARCHAR;
  v_deficit INTEGER;
  v_snapshot_id UUID;
BEGIN
  -- Iterar sobre todas as zonas ativas
  FOR v_zone IN SELECT * FROM geo_zones WHERE active = true LOOP
    
    -- Contar lojas online dentro da zona
    SELECT COUNT(*) INTO v_stores_online
    FROM stores s
    WHERE s.active = true
      AND s.is_open = true
      AND s.latitude IS NOT NULL
      AND s.longitude IS NOT NULL
      AND calculate_distance_km(v_zone.center_lat, v_zone.center_lng, s.latitude, s.longitude) <= v_zone.radius_km;

    -- Contar drivers disponíveis dentro do raio de 2km
    SELECT 
      COUNT(*) FILTER (WHERE dd.status = 'disponivel'),
      COUNT(*) FILTER (WHERE dd.status IN ('em_rota', 'ocupado'))
    INTO v_drivers_available, v_drivers_busy
    FROM delivery_drivers dd
    WHERE dd.active = true
      AND dd.current_lat IS NOT NULL
      AND dd.current_lng IS NOT NULL
      AND calculate_distance_km(v_zone.center_lat, v_zone.center_lng, dd.current_lat, dd.current_lng) <= 2.0;

    -- Contar pedidos pendentes nas lojas da zona
    SELECT COUNT(*) INTO v_pending_orders
    FROM orders o
    JOIN stores s ON o.store_id = s.id
    WHERE o.status IN ('pending', 'confirmed', 'preparing', 'ready')
      AND o.order_type = 'delivery'
      AND calculate_distance_km(v_zone.center_lat, v_zone.center_lng, s.latitude, s.longitude) <= v_zone.radius_km;

    -- Determinar status de cobertura
    IF v_stores_online = 0 THEN
      v_status := 'no_stores';
      v_deficit := 0;
    ELSIF v_drivers_available < v_zone.min_drivers_required THEN
      IF v_drivers_available = 0 THEN
        v_status := 'critical_void';
      ELSE
        v_status := 'warning';
      END IF;
      v_deficit := v_zone.min_drivers_required - v_drivers_available;
    ELSE
      v_status := 'healthy';
      v_deficit := 0;
    END IF;

    -- Inserir snapshot de status
    INSERT INTO zone_coverage_status (
      zone_id, stores_online, drivers_available, drivers_busy, 
      pending_orders, coverage_status, driver_deficit
    ) VALUES (
      v_zone.id, v_stores_online, v_drivers_available, v_drivers_busy,
      v_pending_orders, v_status, v_deficit
    ) RETURNING id INTO v_snapshot_id;

    -- Se for CRITICAL_VOID com lojas online, iniciar processo de deslocamento
    IF v_status = 'critical_void' AND v_stores_online > 0 THEN
      PERFORM initiate_displacement_ritual(v_zone.id, v_snapshot_id, v_deficit);
    END IF;

    -- Retornar resultado
    zone_id := v_zone.id;
    zone_name := v_zone.name;
    stores_online := v_stores_online;
    drivers_available := v_drivers_available;
    coverage_status := v_status;
    driver_deficit := v_deficit;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TAREFA 2: Algoritmo de Deslocamento
-- Identifica e notifica drivers elegíveis
-- =============================================

CREATE OR REPLACE FUNCTION initiate_displacement_ritual(
  p_zone_id UUID,
  p_snapshot_id UUID,
  p_drivers_needed INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_zone RECORD;
  v_driver RECORD;
  v_distance DECIMAL;
  v_drivers_notified INTEGER := 0;
  v_analytics_id UUID;
  v_critical_zone_ids UUID[];
BEGIN
  -- Buscar zona alvo
  SELECT * INTO v_zone FROM geo_zones WHERE id = p_zone_id;
  
  IF v_zone IS NULL THEN
    RETURN 0;
  END IF;

  -- Verificar se já existe análise em andamento para esta zona
  SELECT id INTO v_analytics_id
  FROM displacement_analytics
  WHERE zone_id = p_zone_id
    AND closed_at IS NULL
  LIMIT 1;

  -- Se não existe, criar nova entrada de analytics
  IF v_analytics_id IS NULL THEN
    INSERT INTO displacement_analytics (
      zone_id,
      coverage_snapshot_id,
      void_detected_at
    ) VALUES (
      p_zone_id,
      p_snapshot_id,
      NOW()
    ) RETURNING id INTO v_analytics_id;
  END IF;

  -- Identificar outras zonas críticas (para não roubar drivers delas)
  SELECT ARRAY_AGG(DISTINCT zcs.zone_id) INTO v_critical_zone_ids
  FROM zone_coverage_status zcs
  WHERE zcs.coverage_status = 'critical_void'
    AND zcs.zone_id != p_zone_id
    AND zcs.checked_at > NOW() - INTERVAL '5 minutes';

  -- Buscar drivers elegíveis:
  -- a) Online e Sem Pedido (Idle)
  -- b) Localizados entre 3km e 5km da zona
  -- c) NÃO estejam em zona crítica
  FOR v_driver IN 
    SELECT 
      dd.id,
      dd.current_lat,
      dd.current_lng,
      calculate_distance_km(v_zone.center_lat, v_zone.center_lng, dd.current_lat, dd.current_lng) as dist
    FROM delivery_drivers dd
    WHERE dd.active = true
      AND dd.status = 'disponivel'
      AND dd.current_lat IS NOT NULL
      AND dd.current_lng IS NOT NULL
      -- Entre 3km e 5km
      AND calculate_distance_km(v_zone.center_lat, v_zone.center_lng, dd.current_lat, dd.current_lng) BETWEEN 3.0 AND 5.0
      -- Não tem missão pendente ou aceita
      AND NOT EXISTS (
        SELECT 1 FROM displacement_missions dm
        WHERE dm.driver_id = dd.id
          AND dm.status IN ('pending', 'accepted', 'in_transit')
      )
      -- Não está em zona crítica
      AND NOT EXISTS (
        SELECT 1 FROM geo_zones gz
        WHERE gz.id = ANY(COALESCE(v_critical_zone_ids, ARRAY[]::UUID[]))
          AND calculate_distance_km(gz.center_lat, gz.center_lng, dd.current_lat, dd.current_lng) <= 2.0
      )
    ORDER BY dist ASC
    LIMIT p_drivers_needed * 2 -- Convida 2x para garantir cobertura
  LOOP
    -- Calcular tempo estimado (assumindo 25 km/h em média na cidade)
    v_distance := v_driver.dist;
    
    -- Criar missão de deslocamento
    INSERT INTO displacement_missions (
      target_zone_id,
      driver_id,
      origin_lat,
      origin_lng,
      distance_km,
      estimated_time_minutes,
      expires_at
    ) VALUES (
      p_zone_id,
      v_driver.id,
      v_driver.current_lat,
      v_driver.current_lng,
      v_distance,
      CEIL((v_distance / 25.0) * 60), -- Tempo em minutos
      NOW() + INTERVAL '10 minutes'   -- Expira em 10 minutos
    );
    
    v_drivers_notified := v_drivers_notified + 1;
  END LOOP;

  -- Atualizar analytics
  UPDATE displacement_analytics
  SET drivers_notified = v_drivers_notified
  WHERE id = v_analytics_id;

  RETURN v_drivers_notified;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TAREFA 3: Funções para App do Entregador
-- =============================================

-- Função para driver aceitar missão
CREATE OR REPLACE FUNCTION accept_displacement_mission(
  p_mission_id UUID,
  p_driver_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_mission RECORD;
  v_analytics_id UUID;
BEGIN
  -- Verificar se a missão existe e pertence ao driver
  SELECT * INTO v_mission
  FROM displacement_missions
  WHERE id = p_mission_id
    AND driver_id = p_driver_id
    AND status = 'pending';

  IF v_mission IS NULL THEN
    RETURN false;
  END IF;

  -- Atualizar status da missão
  UPDATE displacement_missions
  SET 
    status = 'accepted',
    responded_at = NOW(),
    started_at = NOW()
  WHERE id = p_mission_id;

  -- Atualizar status do driver
  UPDATE delivery_drivers
  SET status = 'em_rota'
  WHERE id = p_driver_id;

  -- Atualizar analytics
  UPDATE displacement_analytics
  SET drivers_accepted = drivers_accepted + 1
  WHERE zone_id = v_mission.target_zone_id
    AND closed_at IS NULL;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para driver rejeitar missão
CREATE OR REPLACE FUNCTION reject_displacement_mission(
  p_mission_id UUID,
  p_driver_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_mission RECORD;
BEGIN
  SELECT * INTO v_mission
  FROM displacement_missions
  WHERE id = p_mission_id
    AND driver_id = p_driver_id
    AND status = 'pending';

  IF v_mission IS NULL THEN
    RETURN false;
  END IF;

  UPDATE displacement_missions
  SET 
    status = 'rejected',
    responded_at = NOW()
  WHERE id = p_mission_id;

  -- Atualizar analytics
  UPDATE displacement_analytics
  SET drivers_rejected = drivers_rejected + 1
  WHERE zone_id = v_mission.target_zone_id
    AND closed_at IS NULL;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para check-in automático quando driver chega na zona
CREATE OR REPLACE FUNCTION driver_zone_checkin(
  p_driver_id UUID,
  p_lat DECIMAL,
  p_lng DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  v_mission RECORD;
  v_zone RECORD;
  v_distance DECIMAL;
  v_analytics RECORD;
  v_result JSONB := '{}';
BEGIN
  -- Atualizar localização do driver
  UPDATE delivery_drivers
  SET 
    current_lat = p_lat,
    current_lng = p_lng,
    updated_at = NOW()
  WHERE id = p_driver_id;

  -- Verificar se há missão aceita/em trânsito
  SELECT dm.*, gz.center_lat, gz.center_lng, gz.radius_km, gz.name as zone_name
  INTO v_mission
  FROM displacement_missions dm
  JOIN geo_zones gz ON dm.target_zone_id = gz.id
  WHERE dm.driver_id = p_driver_id
    AND dm.status IN ('accepted', 'in_transit')
  LIMIT 1;

  IF v_mission IS NULL THEN
    RETURN jsonb_build_object('checked_in', false, 'message', 'Nenhuma missão ativa');
  END IF;

  -- Calcular distância até a zona alvo
  v_distance := calculate_distance_km(v_mission.center_lat, v_mission.center_lng, p_lat, p_lng);

  -- Se entrou na zona (dentro do raio)
  IF v_distance <= v_mission.radius_km THEN
    -- Atualizar missão como chegou
    UPDATE displacement_missions
    SET 
      status = 'arrived',
      arrived_at = NOW(),
      priority_granted = true,
      priority_expires_at = NOW() + INTERVAL '2 hours' -- Priority por 2 horas
    WHERE id = v_mission.id;

    -- Atualizar status do driver para disponível
    UPDATE delivery_drivers
    SET 
      status = 'disponivel',
      priority_status = true,
      priority_expires_at = NOW() + INTERVAL '2 hours'
    WHERE id = p_driver_id;

    -- Atualizar analytics - primeiro a chegar
    UPDATE displacement_analytics
    SET 
      first_arrival_at = COALESCE(first_arrival_at, NOW()),
      void_filled_at = NOW(),
      time_to_fill_minutes = EXTRACT(EPOCH FROM (NOW() - void_detected_at)) / 60,
      resolution_status = 'filled'
    WHERE zone_id = v_mission.target_zone_id
      AND closed_at IS NULL
      AND first_arrival_at IS NULL;

    v_result := jsonb_build_object(
      'checked_in', true,
      'zone_name', v_mission.zone_name,
      'priority_granted', true,
      'priority_duration_hours', 2,
      'message', 'Parabéns! Você chegou na zona ' || v_mission.zone_name || '. Priority Status ativado por 2 horas!'
    );
  ELSE
    -- Ainda em trânsito
    UPDATE displacement_missions
    SET status = 'in_transit'
    WHERE id = v_mission.id AND status = 'accepted';

    v_result := jsonb_build_object(
      'checked_in', false,
      'zone_name', v_mission.zone_name,
      'distance_remaining_km', ROUND(v_distance::NUMERIC, 2),
      'message', 'Continue até a zona. Faltam ' || ROUND(v_distance::NUMERIC, 1) || ' km'
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Função para buscar missões do driver
-- =============================================

CREATE OR REPLACE FUNCTION get_driver_missions(p_driver_id UUID)
RETURNS TABLE (
  mission_id UUID,
  zone_id UUID,
  zone_name VARCHAR,
  zone_center_lat DECIMAL,
  zone_center_lng DECIMAL,
  distance_km DECIMAL,
  estimated_time_minutes INTEGER,
  status VARCHAR,
  expires_at TIMESTAMP WITH TIME ZONE,
  priority_granted BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dm.id,
    dm.target_zone_id,
    gz.name::VARCHAR,
    gz.center_lat,
    gz.center_lng,
    dm.distance_km,
    dm.estimated_time_minutes,
    dm.status::VARCHAR,
    dm.expires_at,
    dm.priority_granted,
    dm.created_at
  FROM displacement_missions dm
  JOIN geo_zones gz ON dm.target_zone_id = gz.id
  WHERE dm.driver_id = p_driver_id
    AND dm.status IN ('pending', 'accepted', 'in_transit')
  ORDER BY dm.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Função para Mapa de Calor - zonas com demanda
-- =============================================

CREATE OR REPLACE FUNCTION get_heatmap_data()
RETURNS TABLE (
  zone_id UUID,
  zone_name VARCHAR,
  center_lat DECIMAL,
  center_lng DECIMAL,
  radius_km DECIMAL,
  coverage_status VARCHAR,
  drivers_available INTEGER,
  drivers_needed INTEGER,
  pending_orders INTEGER,
  heat_level INTEGER -- 1-5, onde 5 = mais quente (mais demanda/menos cobertura)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gz.id,
    gz.name::VARCHAR,
    gz.center_lat,
    gz.center_lng,
    gz.radius_km,
    COALESCE(zcs.coverage_status, 'unknown')::VARCHAR,
    COALESCE(zcs.drivers_available, 0),
    COALESCE(zcs.driver_deficit, 0),
    COALESCE(zcs.pending_orders, 0),
    CASE 
      WHEN zcs.coverage_status = 'critical_void' THEN 5
      WHEN zcs.coverage_status = 'warning' AND zcs.pending_orders > 3 THEN 4
      WHEN zcs.coverage_status = 'warning' THEN 3
      WHEN zcs.coverage_status = 'healthy' AND zcs.pending_orders > 5 THEN 2
      ELSE 1
    END::INTEGER
  FROM geo_zones gz
  LEFT JOIN LATERAL (
    SELECT * FROM zone_coverage_status 
    WHERE zone_id = gz.id 
    ORDER BY checked_at DESC 
    LIMIT 1
  ) zcs ON true
  WHERE gz.active = true
  ORDER BY 
    CASE WHEN zcs.coverage_status = 'critical_void' THEN 1
         WHEN zcs.coverage_status = 'warning' THEN 2
         ELSE 3 END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Função para Analytics do COO (Etapa 14)
-- =============================================

CREATE OR REPLACE FUNCTION get_displacement_analytics_report(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  zone_id UUID,
  zone_name VARCHAR,
  total_voids INTEGER,
  total_drivers_notified INTEGER,
  total_drivers_accepted INTEGER,
  acceptance_rate DECIMAL,
  avg_time_to_fill_minutes DECIMAL,
  voids_filled INTEGER,
  voids_unfilled INTEGER,
  effectiveness_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gz.id,
    gz.name::VARCHAR,
    COUNT(da.id)::INTEGER as total_voids,
    COALESCE(SUM(da.drivers_notified), 0)::INTEGER,
    COALESCE(SUM(da.drivers_accepted), 0)::INTEGER,
    CASE WHEN SUM(da.drivers_notified) > 0 
         THEN ROUND((SUM(da.drivers_accepted)::DECIMAL / SUM(da.drivers_notified)) * 100, 1)
         ELSE 0 END,
    ROUND(AVG(da.time_to_fill_minutes)::NUMERIC, 1),
    COUNT(*) FILTER (WHERE da.resolution_status = 'filled')::INTEGER,
    COUNT(*) FILTER (WHERE da.resolution_status IN ('unfilled', 'partial'))::INTEGER,
    CASE WHEN COUNT(*) > 0 
         THEN ROUND((COUNT(*) FILTER (WHERE da.resolution_status = 'filled')::DECIMAL / COUNT(*)) * 100, 1)
         ELSE 0 END
  FROM geo_zones gz
  LEFT JOIN displacement_analytics da ON gz.id = da.zone_id
    AND da.void_detected_at BETWEEN p_start_date AND p_end_date
  GROUP BY gz.id, gz.name
  ORDER BY COUNT(*) FILTER (WHERE da.resolution_status IN ('unfilled', 'partial')) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Trigger para expirar missões antigas
-- =============================================

CREATE OR REPLACE FUNCTION expire_old_missions()
RETURNS TRIGGER AS $$
BEGIN
  -- Expirar missões pendentes que passaram do prazo
  UPDATE displacement_missions
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  -- Atualizar analytics para missões expiradas
  UPDATE displacement_analytics da
  SET drivers_expired = (
    SELECT COUNT(*) FROM displacement_missions dm
    WHERE dm.target_zone_id = da.zone_id
      AND dm.status = 'expired'
      AND dm.created_at > da.void_detected_at
  )
  WHERE da.closed_at IS NULL;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Adicionar coluna priority_status em delivery_drivers se não existir
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' 
    AND column_name = 'priority_status'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN priority_status BOOLEAN DEFAULT false;
    ALTER TABLE delivery_drivers ADD COLUMN priority_expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'delivery_drivers' 
    AND column_name = 'current_lat'
  ) THEN
    ALTER TABLE delivery_drivers ADD COLUMN current_lat DECIMAL(10, 8);
    ALTER TABLE delivery_drivers ADD COLUMN current_lng DECIMAL(11, 8);
  END IF;
END $$;

-- =============================================
-- Inserir zonas de exemplo para Teresina
-- =============================================

INSERT INTO geo_zones (name, city, state, center_lat, center_lng, radius_km, min_drivers_required, priority_level) VALUES
('Centro', 'Teresina', 'PI', -5.0892, -42.8019, 2.0, 3, 3),
('Zona Leste', 'Teresina', 'PI', -5.0700, -42.7600, 2.5, 2, 2),
('Zona Norte', 'Teresina', 'PI', -5.0500, -42.8100, 2.0, 2, 2),
('Zona Sul', 'Teresina', 'PI', -5.1200, -42.8000, 2.5, 2, 2),
('Zona Sudeste', 'Teresina', 'PI', -5.1100, -42.7500, 2.0, 2, 1),
('Jóquei', 'Teresina', 'PI', -5.0600, -42.7800, 1.5, 2, 3),
('Fátima', 'Teresina', 'PI', -5.0800, -42.7700, 1.5, 2, 2),
('Ininga', 'Teresina', 'PI', -5.0450, -42.7900, 2.0, 2, 2),
('Picos', 'Teresina', 'PI', -5.0950, -42.8200, 1.5, 1, 1),
('Dirceu', 'Teresina', 'PI', -5.1000, -42.7300, 2.5, 2, 2)
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE geo_zones IS 'Geo-Fences de zonas/bairros para monitoramento de cobertura';
COMMENT ON TABLE zone_coverage_status IS 'Snapshots de status de cobertura das zonas';
COMMENT ON TABLE displacement_missions IS 'Missões de deslocamento enviadas aos drivers';
COMMENT ON TABLE displacement_analytics IS 'Métricas de eficácia do Ritual de Deslocamento (Etapa 14)';
COMMENT ON FUNCTION check_zone_coverage IS 'TAREFA 1: Função de Cron Job para monitorar zonas a cada 2 min';
COMMENT ON FUNCTION initiate_displacement_ritual IS 'TAREFA 2: Algoritmo de deslocamento de frota';
COMMENT ON FUNCTION driver_zone_checkin IS 'TAREFA 3: Check-in automático e concessão de Priority Status';
