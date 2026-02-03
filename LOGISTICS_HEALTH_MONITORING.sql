-- =============================================
-- LOGISTICS HEALTH MONITORING SYSTEM
-- Baseado na Organização Lógica de Antonio Carlos Souza Ramos
-- =============================================

-- Tabela para registrar os montadores (assemblers) ativos no turno
CREATE TABLE IF NOT EXISTS store_assemblers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'break', 'busy')),
  shift_start TIMESTAMP WITH TIME ZONE,
  shift_end TIMESTAMP WITH TIME ZONE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para configurações de capacidade por loja
CREATE TABLE IF NOT EXISTS store_logistics_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  -- Constantes da Etapa 8 (Ritual de Montagem)
  assembly_time_minutes DECIMAL(5,2) NOT NULL DEFAULT 10.00, -- Tempo por copo em minutos
  target_assembly_time DECIMAL(5,2) NOT NULL DEFAULT 9.6, -- Meta de tempo (não ultrapassar)
  shift_duration_minutes INTEGER NOT NULL DEFAULT 480, -- Jornada produtiva (8h)
  -- Margem de segurança (20% = 1.2)
  safety_margin DECIMAL(3,2) NOT NULL DEFAULT 1.20,
  -- Configurações de alerta
  warning_threshold_percent DECIMAL(5,2) NOT NULL DEFAULT 80.00,
  critical_threshold_percent DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  -- Webhook para geolocalização
  webhook_url TEXT,
  webhook_enabled BOOLEAN DEFAULT false,
  -- Metadados
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para logs de alertas de saúde logística
CREATE TABLE IF NOT EXISTS logistics_health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('prediction', 'warning', 'critical', 'resolved')),
  -- Métricas no momento do alerta
  active_orders INTEGER NOT NULL,
  online_assemblers INTEGER NOT NULL,
  remaining_shift_minutes INTEGER NOT NULL,
  current_capacity INTEGER NOT NULL,
  required_capacity INTEGER NOT NULL,
  occupancy_rate DECIMAL(5,2) NOT NULL,
  estimated_bottleneck_time TIMESTAMP WITH TIME ZONE,
  -- Mensagem e ação
  message TEXT NOT NULL,
  suggested_action TEXT,
  -- Webhook
  webhook_sent BOOLEAN DEFAULT false,
  webhook_response TEXT,
  -- Status
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_assemblers_store ON store_assemblers(store_id, status);
CREATE INDEX IF NOT EXISTS idx_logistics_alerts_store ON logistics_health_alerts(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logistics_alerts_unresolved ON logistics_health_alerts(store_id, resolved_at) WHERE resolved_at IS NULL;

-- Enable RLS
ALTER TABLE store_assemblers ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_logistics_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE logistics_health_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated can view assemblers" ON store_assemblers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can manage assemblers" ON store_assemblers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager', 'franchisee_master', 'admin', 'staff'))
  );

CREATE POLICY "Authenticated can view logistics config" ON store_logistics_config
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage logistics config" ON store_logistics_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager', 'franchisee_master', 'admin'))
  );

CREATE POLICY "Authenticated can view logistics alerts" ON logistics_health_alerts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert logistics alerts" ON logistics_health_alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff can update logistics alerts" ON logistics_health_alerts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('manager', 'franchisee_master', 'admin', 'staff'))
  );

-- =============================================
-- TAREFA 1: Função de Capacidade Operacional em Tempo Real
-- Fórmula: Capacidade = (Montadores_Online * Minutos_Restantes) / Tempo_Por_Copo
-- =============================================

CREATE OR REPLACE FUNCTION calculate_logistics_health(p_store_id UUID)
RETURNS TABLE (
  -- Métricas de Montadores
  online_assemblers INTEGER,
  total_assemblers INTEGER,
  remaining_shift_minutes INTEGER,
  -- Métricas de Pedidos
  active_orders INTEGER,
  pending_assembly INTEGER,
  -- Capacidade
  current_capacity INTEGER,        -- Quantos copos podem ser feitos no tempo restante
  required_capacity INTEGER,       -- Quantos copos precisam ser feitos
  available_capacity INTEGER,      -- Margem disponível
  -- Taxa de Ocupação
  occupancy_rate DECIMAL,
  -- Status e Previsão
  health_status VARCHAR,
  estimated_bottleneck_time TIMESTAMP WITH TIME ZONE,
  minutes_until_bottleneck INTEGER,
  -- Configurações usadas
  assembly_time DECIMAL,
  target_assembly_time DECIMAL,
  safety_margin DECIMAL
) AS $$
DECLARE
  v_config RECORD;
  v_online_assemblers INTEGER;
  v_total_assemblers INTEGER;
  v_shift_start TIME;
  v_shift_end TIME;
  v_remaining_minutes INTEGER;
  v_active_orders INTEGER;
  v_pending_assembly INTEGER;
  v_current_capacity INTEGER;
  v_required_capacity INTEGER;
  v_available_capacity INTEGER;
  v_occupancy_rate DECIMAL;
  v_health_status VARCHAR;
  v_bottleneck_time TIMESTAMP WITH TIME ZONE;
  v_minutes_until_bottleneck INTEGER;
BEGIN
  -- Buscar configurações da loja
  SELECT * INTO v_config FROM store_logistics_config WHERE store_id = p_store_id;
  
  -- Valores padrão se não houver config
  IF v_config IS NULL THEN
    v_config.assembly_time_minutes := 10.00;
    v_config.target_assembly_time := 9.6;
    v_config.shift_duration_minutes := 480;
    v_config.safety_margin := 1.20;
    v_config.warning_threshold_percent := 80.00;
    v_config.critical_threshold_percent := 100.00;
  END IF;

  -- Contar montadores online e total
  SELECT 
    COUNT(*) FILTER (WHERE status = 'online'),
    COUNT(*) FILTER (WHERE active = true)
  INTO v_online_assemblers, v_total_assemblers
  FROM store_assemblers
  WHERE store_id = p_store_id;

  -- Calcular minutos restantes do turno (assumindo turno padrão 08:00-16:00 ou usar shift_end dos montadores)
  SELECT 
    EXTRACT(EPOCH FROM (COALESCE(MAX(shift_end), NOW() + INTERVAL '8 hours') - NOW())) / 60
  INTO v_remaining_minutes
  FROM store_assemblers
  WHERE store_id = p_store_id AND status = 'online';
  
  -- Se não houver montadores ou turno já acabou, usar valor mínimo
  v_remaining_minutes := GREATEST(COALESCE(v_remaining_minutes, v_config.shift_duration_minutes), 0);

  -- Contar pedidos ativos que precisam de montagem
  SELECT COUNT(*) INTO v_active_orders
  FROM orders
  WHERE store_id = p_store_id
    AND status IN ('pending', 'confirmed', 'preparing');

  -- Pedidos especificamente aguardando montagem
  SELECT COUNT(*) INTO v_pending_assembly
  FROM orders
  WHERE store_id = p_store_id
    AND status IN ('pending', 'confirmed');

  -- TAREFA 1: Calcular Capacidade Operacional
  -- Capacidade = (Montadores_Online * Minutos_Restantes) / Tempo_Por_Copo
  IF v_online_assemblers > 0 THEN
    v_current_capacity := FLOOR((v_online_assemblers * v_remaining_minutes) / v_config.assembly_time_minutes);
  ELSE
    v_current_capacity := 0;
  END IF;

  -- Capacidade necessária (com margem de segurança)
  v_required_capacity := CEIL(v_active_orders * v_config.safety_margin);

  -- Capacidade disponível
  v_available_capacity := v_current_capacity - v_required_capacity;

  -- Taxa de ocupação
  IF v_current_capacity > 0 THEN
    v_occupancy_rate := (v_required_capacity::DECIMAL / v_current_capacity) * 100;
  ELSE
    v_occupancy_rate := CASE WHEN v_active_orders > 0 THEN 999 ELSE 0 END;
  END IF;

  -- TAREFA 2: Determinar status de saúde e prever gargalo
  -- Fórmula: (Pedidos_Ativos * 10) > (Montadores * Minutos_Restantes * 1.2)
  IF (v_active_orders * v_config.assembly_time_minutes) > (v_online_assemblers * v_remaining_minutes * v_config.safety_margin) THEN
    v_health_status := 'critical';
    -- Calcular quando vai ocorrer o gargalo
    IF v_online_assemblers > 0 THEN
      v_minutes_until_bottleneck := FLOOR((v_current_capacity - v_active_orders) * v_config.assembly_time_minutes / v_online_assemblers);
      v_minutes_until_bottleneck := GREATEST(v_minutes_until_bottleneck, 0);
    ELSE
      v_minutes_until_bottleneck := 0;
    END IF;
    v_bottleneck_time := NOW() + (v_minutes_until_bottleneck || ' minutes')::INTERVAL;
  ELSIF v_occupancy_rate >= v_config.warning_threshold_percent THEN
    v_health_status := 'warning';
    v_minutes_until_bottleneck := FLOOR(v_available_capacity * v_config.assembly_time_minutes / GREATEST(v_online_assemblers, 1));
    v_bottleneck_time := NOW() + (v_minutes_until_bottleneck || ' minutes')::INTERVAL;
  ELSE
    v_health_status := 'healthy';
    v_minutes_until_bottleneck := NULL;
    v_bottleneck_time := NULL;
  END IF;

  RETURN QUERY SELECT 
    v_online_assemblers,
    v_total_assemblers,
    v_remaining_minutes,
    v_active_orders,
    v_pending_assembly,
    v_current_capacity,
    v_required_capacity,
    v_available_capacity,
    v_occupancy_rate,
    v_health_status,
    v_bottleneck_time,
    v_minutes_until_bottleneck,
    v_config.assembly_time_minutes,
    v_config.target_assembly_time,
    v_config.safety_margin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- TAREFA 2: Trigger para Listener de Pedidos com Alerta Preditivo
-- Dispara quando: (Pedidos_Ativos * 10) > (Montadores * Minutos_Restantes * 1.2)
-- =============================================

CREATE OR REPLACE FUNCTION check_logistics_health_on_order()
RETURNS TRIGGER AS $$
DECLARE
  v_health RECORD;
  v_last_alert RECORD;
  v_config RECORD;
  v_suggested_action TEXT;
  v_webhook_response TEXT;
BEGIN
  -- Só verificar pedidos que precisam de montagem
  IF NEW.status NOT IN ('pending', 'confirmed', 'preparing') THEN
    RETURN NEW;
  END IF;

  -- Calcular saúde logística atual
  SELECT * INTO v_health FROM calculate_logistics_health(NEW.store_id);
  
  -- Buscar config para webhook
  SELECT * INTO v_config FROM store_logistics_config WHERE store_id = NEW.store_id;

  -- Verificar último alerta não resolvido
  SELECT * INTO v_last_alert 
  FROM logistics_health_alerts 
  WHERE store_id = NEW.store_id 
    AND resolved_at IS NULL 
  ORDER BY created_at DESC 
  LIMIT 1;

  -- Determinar ação sugerida
  IF v_health.health_status = 'critical' THEN
    v_suggested_action := 'AÇÃO IMEDIATA: ' ||
      CASE 
        WHEN v_health.online_assemblers < v_health.total_assemblers THEN 
          'Ativar ' || (v_health.total_assemblers - v_health.online_assemblers) || ' montador(es) adicional(is).'
        ELSE 
          'Solicitar suporte de franqueadas próximas via geolocalização.'
      END;
  ELSIF v_health.health_status = 'warning' THEN
    v_suggested_action := 'ATENÇÃO: Capacidade em ' || ROUND(v_health.occupancy_rate, 0) || 
      '%. Considere ativar montadores de reserva. Gargalo previsto em ' || 
      v_health.minutes_until_bottleneck || ' minutos.';
  END IF;

  -- Criar alerta se necessário (TAREFA 2: Listener de Pedidos)
  IF v_health.health_status IN ('warning', 'critical') THEN
    -- Só criar novo alerta se não houver um igual recente ou se o status piorou
    IF v_last_alert IS NULL OR 
       (v_last_alert.alert_type != v_health.health_status) OR
       (v_last_alert.alert_type = 'warning' AND v_health.health_status = 'critical') THEN
      
      INSERT INTO logistics_health_alerts (
        store_id,
        alert_type,
        active_orders,
        online_assemblers,
        remaining_shift_minutes,
        current_capacity,
        required_capacity,
        occupancy_rate,
        estimated_bottleneck_time,
        message,
        suggested_action
      ) VALUES (
        NEW.store_id,
        v_health.health_status,
        v_health.active_orders,
        v_health.online_assemblers,
        v_health.remaining_shift_minutes,
        v_health.current_capacity,
        v_health.required_capacity,
        v_health.occupancy_rate,
        v_health.estimated_bottleneck_time,
        CASE v_health.health_status
          WHEN 'critical' THEN 
            '🚨 GARGALO LOGÍSTICO IMINENTE: ' || v_health.active_orders || ' pedidos ativos, apenas ' || 
            v_health.online_assemblers || ' montador(es). Meta de 9.6min/copo será ultrapassada em ' ||
            COALESCE(v_health.minutes_until_bottleneck::TEXT, '0') || ' minutos.'
          WHEN 'warning' THEN 
            '⚠️ ALERTA PREDITIVO: Capacidade em ' || ROUND(v_health.occupancy_rate, 0) || 
            '%. Risco de gargalo em ' || COALESCE(v_health.minutes_until_bottleneck::TEXT, 'N/A') || ' minutos.'
        END,
        v_suggested_action
      );

      -- TAREFA 3: Disparar Webhook para geolocalização (se configurado)
      -- Nota: Em produção, isso seria feito via Edge Function ou pg_net
      -- Por agora, registramos a intenção de disparo
      IF v_config IS NOT NULL AND v_config.webhook_enabled AND v_config.webhook_url IS NOT NULL AND v_health.health_status = 'critical' THEN
        -- Marcar que webhook deve ser enviado (será processado por Edge Function)
        UPDATE logistics_health_alerts 
        SET webhook_sent = false
        WHERE id = (SELECT id FROM logistics_health_alerts WHERE store_id = NEW.store_id ORDER BY created_at DESC LIMIT 1);
      END IF;

    END IF;
  ELSIF v_health.health_status = 'healthy' AND v_last_alert IS NOT NULL THEN
    -- Resolver alertas anteriores quando a saúde volta ao normal
    UPDATE logistics_health_alerts
    SET resolved_at = NOW()
    WHERE id = v_last_alert.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_check_logistics_health ON orders;
CREATE TRIGGER trigger_check_logistics_health
  AFTER INSERT OR UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_logistics_health_on_order();

-- =============================================
-- Função auxiliar para COO Dashboard
-- Retorna resumo de todas as lojas com problemas
-- =============================================

CREATE OR REPLACE FUNCTION get_coo_logistics_dashboard()
RETURNS TABLE (
  store_id UUID,
  store_name VARCHAR,
  health_status VARCHAR,
  active_orders INTEGER,
  online_assemblers INTEGER,
  current_capacity INTEGER,
  occupancy_rate DECIMAL,
  minutes_until_bottleneck INTEGER,
  unresolved_alerts INTEGER,
  last_alert_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name::VARCHAR,
    lh.health_status,
    lh.active_orders,
    lh.online_assemblers,
    lh.current_capacity,
    lh.occupancy_rate,
    lh.minutes_until_bottleneck,
    (SELECT COUNT(*)::INTEGER FROM logistics_health_alerts la WHERE la.store_id = s.id AND la.resolved_at IS NULL),
    (SELECT MAX(la.created_at) FROM logistics_health_alerts la WHERE la.store_id = s.id AND la.resolved_at IS NULL)
  FROM stores s
  CROSS JOIN LATERAL calculate_logistics_health(s.id) lh
  WHERE s.active = true
  ORDER BY 
    CASE lh.health_status 
      WHEN 'critical' THEN 1 
      WHEN 'warning' THEN 2 
      ELSE 3 
    END,
    lh.occupancy_rate DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE store_assemblers IS 'Montadores ativos por loja - Etapa 8 do Ritual de Montagem';
COMMENT ON TABLE store_logistics_config IS 'Configurações de capacidade logística por loja';
COMMENT ON TABLE logistics_health_alerts IS 'Alertas preditivos de saúde logística - Etapa 4 do Ritual de Alerta';
COMMENT ON FUNCTION calculate_logistics_health IS 'TAREFA 1: Calcula capacidade operacional em tempo real';
COMMENT ON FUNCTION check_logistics_health_on_order IS 'TAREFA 2: Listener de pedidos com alerta preditivo';
COMMENT ON FUNCTION get_coo_logistics_dashboard IS 'TAREFA 3: Dashboard do COO com visão de todas as lojas';
