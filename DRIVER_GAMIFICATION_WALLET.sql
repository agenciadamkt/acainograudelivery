-- =============================================
-- DRIVER GAMIFICATION & WALLET SYSTEM
-- Sistema de Remuneração Híbrida e Carreira
-- Etapa 11: Retenção da Frota
-- =============================================

-- =============================================
-- TABELA 1: Wallet (Carteira do Entregador)
-- =============================================

CREATE TABLE IF NOT EXISTS driver_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE UNIQUE,
  -- Saldo
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  pending_balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Aguardando liberação
  total_earned DECIMAL(10, 2) NOT NULL DEFAULT 0.00,    -- Total histórico
  -- Gamificação
  current_xp INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,                  -- XP acumulado histórico
  tier VARCHAR(20) NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'prata', 'ouro', 'diamante')),
  tier_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
  -- Streak (Sequência)
  current_streak_days INTEGER DEFAULT 0,
  longest_streak_days INTEGER DEFAULT 0,
  last_active_date DATE,
  -- Contadores
  total_deliveries INTEGER DEFAULT 0,
  total_5star_ratings INTEGER DEFAULT 0,
  total_displacement_missions INTEGER DEFAULT 0,
  -- Datas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA 2: Transações Financeiras
-- =============================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES driver_wallets(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
  -- Tipo de transação
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN (
    'delivery_earning',     -- Ganho por entrega
    'wait_time_bonus',      -- Adicional de espera
    'gamification_bonus',   -- Bônus de gamificação
    'displacement_bonus',   -- Bônus por missão de deslocamento
    'streak_bonus',         -- Bônus por sequência
    'tip',                  -- Gorjeta
    'withdrawal',           -- Saque
    'adjustment',           -- Ajuste manual
    'penalty'               -- Penalidade
  )),
  -- Valores
  amount DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  -- Referências
  order_id UUID REFERENCES orders(id),
  delivery_id UUID,
  mission_id UUID,
  -- Detalhes do cálculo
  calculation_details JSONB,
  -- Metadados
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA 3: Histórico de XP
-- =============================================

CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
  -- Tipo de XP
  xp_type VARCHAR(50) NOT NULL CHECK (xp_type IN (
    'delivery_completed',      -- +10 XP
    'five_star_rating',        -- +20 XP
    'displacement_mission',    -- +50 XP
    'streak_bonus',            -- +100 XP (5 dias seguidos)
    'weekly_bonus',            -- Bônus semanal
    'tier_upgrade',            -- Subiu de tier
    'inactivity_decay',        -- Perda por inatividade
    'referral_bonus'           -- Indicação de outro entregador
  )),
  -- Valores
  xp_amount INTEGER NOT NULL,
  xp_before INTEGER NOT NULL,
  xp_after INTEGER NOT NULL,
  -- Referências
  order_id UUID REFERENCES orders(id),
  mission_id UUID,
  -- Metadados
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA 4: Configuração de Tiers
-- =============================================

CREATE TABLE IF NOT EXISTS gamification_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name VARCHAR(20) NOT NULL UNIQUE,
  min_xp INTEGER NOT NULL,
  max_xp INTEGER, -- NULL para o tier máximo
  multiplier DECIMAL(3, 2) NOT NULL,
  -- Benefícios
  dispatch_priority BOOLEAN DEFAULT false,
  corporate_access BOOLEAN DEFAULT false,
  badge_color VARCHAR(20),
  badge_icon VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TABELA 5: Configuração de Pagamentos
-- =============================================

CREATE TABLE IF NOT EXISTS payment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nome da configuração
  config_name VARCHAR(100) NOT NULL UNIQUE,
  -- Valores base
  base_rate_per_km DECIMAL(5, 2) NOT NULL DEFAULT 1.50,     -- R$ por km
  minimum_delivery_value DECIMAL(5, 2) NOT NULL DEFAULT 5.00, -- Valor mínimo por entrega
  wait_time_rate_per_min DECIMAL(5, 2) NOT NULL DEFAULT 0.20, -- R$ por minuto de espera
  max_wait_time_minutes INTEGER DEFAULT 15,
  -- Bônus
  five_star_bonus DECIMAL(5, 2) DEFAULT 1.00,               -- Bônus por 5 estrelas
  displacement_mission_bonus DECIMAL(5, 2) DEFAULT 5.00,    -- Bônus por missão de deslocamento
  -- XP Values
  xp_per_delivery INTEGER DEFAULT 10,
  xp_per_five_star INTEGER DEFAULT 20,
  xp_per_displacement INTEGER DEFAULT 50,
  xp_streak_5_days INTEGER DEFAULT 100,
  -- Decay
  inactivity_decay_days INTEGER DEFAULT 7,
  inactivity_decay_percent INTEGER DEFAULT 10,
  -- Status
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_driver_wallets_driver ON driver_wallets(driver_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_driver ON wallet_transactions(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_driver ON xp_transactions(driver_id, created_at DESC);

-- Enable RLS
ALTER TABLE driver_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Drivers can view own wallet" ON driver_wallets
  FOR SELECT USING (
    driver_id IN (SELECT id FROM delivery_drivers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'franchisee_master'))
  );

CREATE POLICY "System can manage wallets" ON driver_wallets
  FOR ALL USING (true);

CREATE POLICY "Drivers can view own transactions" ON wallet_transactions
  FOR SELECT USING (
    driver_id IN (SELECT id FROM delivery_drivers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'franchisee_master'))
  );

CREATE POLICY "System can insert transactions" ON wallet_transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Drivers can view own xp" ON xp_transactions
  FOR SELECT USING (
    driver_id IN (SELECT id FROM delivery_drivers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'franchisee_master'))
  );

CREATE POLICY "System can insert xp" ON xp_transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view tiers" ON gamification_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can manage tiers" ON gamification_tiers FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'franchisee_master'))
);

CREATE POLICY "Anyone can view payment config" ON payment_config FOR SELECT USING (true);
CREATE POLICY "Admins can manage payment config" ON payment_config FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'franchisee_master'))
);

-- =============================================
-- INSERIR TIERS PADRÃO
-- =============================================

INSERT INTO gamification_tiers (tier_name, min_xp, max_xp, multiplier, dispatch_priority, corporate_access, badge_color, badge_icon, description) VALUES
('bronze', 0, 1000, 1.00, false, false, '#CD7F32', 'award', 'Nível inicial. Complete entregas para subir!'),
('prata', 1001, 5000, 1.05, true, false, '#C0C0C0', 'star', 'Prioridade no dispatch. +5% por entrega!'),
('ouro', 5001, 15000, 1.10, true, true, '#FFD700', 'trophy', 'Acesso a pedidos corporativos. +10% por entrega!'),
('diamante', 15001, NULL, 1.15, true, true, '#B9F2FF', 'gem', 'Elite! +15% por entrega + benefícios exclusivos.')
ON CONFLICT (tier_name) DO NOTHING;

-- =============================================
-- INSERIR CONFIGURAÇÃO PADRÃO
-- =============================================

INSERT INTO payment_config (config_name, base_rate_per_km, minimum_delivery_value, wait_time_rate_per_min, xp_per_delivery, xp_per_five_star, xp_per_displacement, xp_streak_5_days)
VALUES ('default', 1.50, 5.00, 0.20, 10, 20, 50, 100)
ON CONFLICT (config_name) DO NOTHING;

-- =============================================
-- FUNÇÃO: Calcular pagamento de entrega
-- Fórmula: (Valor_Base_KM * Distância) + (Adicional_Espera) + (Bônus_Gamificação)
-- =============================================

CREATE OR REPLACE FUNCTION calculate_delivery_payment(
  p_driver_id UUID,
  p_distance_km DECIMAL,
  p_wait_time_minutes INTEGER DEFAULT 0,
  p_rating INTEGER DEFAULT NULL,
  p_is_displacement_mission BOOLEAN DEFAULT false
)
RETURNS TABLE (
  base_amount DECIMAL,
  wait_bonus DECIMAL,
  rating_bonus DECIMAL,
  displacement_bonus DECIMAL,
  tier_multiplier DECIMAL,
  gamification_bonus DECIMAL,
  total_before_multiplier DECIMAL,
  total_amount DECIMAL,
  xp_earned INTEGER,
  tier_name VARCHAR
) AS $$
DECLARE
  v_config RECORD;
  v_wallet RECORD;
  v_base_amount DECIMAL;
  v_wait_bonus DECIMAL;
  v_rating_bonus DECIMAL;
  v_displacement_bonus DECIMAL;
  v_tier_multiplier DECIMAL;
  v_gamification_bonus DECIMAL;
  v_total_before DECIMAL;
  v_total DECIMAL;
  v_xp INTEGER := 0;
BEGIN
  -- Buscar configuração
  SELECT * INTO v_config FROM payment_config WHERE active = true LIMIT 1;
  
  -- Buscar wallet do driver
  SELECT * INTO v_wallet FROM driver_wallets WHERE driver_id = p_driver_id;
  
  -- Se não tem wallet, criar uma
  IF v_wallet IS NULL THEN
    INSERT INTO driver_wallets (driver_id) VALUES (p_driver_id)
    RETURNING * INTO v_wallet;
  END IF;

  -- Calcular valor base por distância
  v_base_amount := GREATEST(
    p_distance_km * v_config.base_rate_per_km,
    v_config.minimum_delivery_value
  );

  -- Calcular adicional de espera
  v_wait_bonus := LEAST(p_wait_time_minutes, v_config.max_wait_time_minutes) * v_config.wait_time_rate_per_min;

  -- Bônus por avaliação 5 estrelas
  IF p_rating = 5 THEN
    v_rating_bonus := v_config.five_star_bonus;
    v_xp := v_xp + v_config.xp_per_five_star;
  ELSE
    v_rating_bonus := 0;
  END IF;

  -- Bônus por missão de deslocamento
  IF p_is_displacement_mission THEN
    v_displacement_bonus := v_config.displacement_mission_bonus;
    v_xp := v_xp + v_config.xp_per_displacement;
  ELSE
    v_displacement_bonus := 0;
  END IF;

  -- XP base por entrega
  v_xp := v_xp + v_config.xp_per_delivery;

  -- Tier multiplier
  v_tier_multiplier := v_wallet.tier_multiplier;

  -- Total antes do multiplicador
  v_total_before := v_base_amount + v_wait_bonus + v_rating_bonus + v_displacement_bonus;

  -- Bônus de gamificação (diferença causada pelo multiplicador)
  v_gamification_bonus := v_total_before * (v_tier_multiplier - 1);

  -- Total final
  v_total := v_total_before * v_tier_multiplier;

  RETURN QUERY SELECT 
    ROUND(v_base_amount, 2),
    ROUND(v_wait_bonus, 2),
    ROUND(v_rating_bonus, 2),
    ROUND(v_displacement_bonus, 2),
    v_tier_multiplier,
    ROUND(v_gamification_bonus, 2),
    ROUND(v_total_before, 2),
    ROUND(v_total, 2),
    v_xp,
    v_wallet.tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNÇÃO: Processar pagamento e XP
-- =============================================

CREATE OR REPLACE FUNCTION process_delivery_completion(
  p_driver_id UUID,
  p_order_id UUID,
  p_distance_km DECIMAL,
  p_wait_time_minutes INTEGER DEFAULT 0,
  p_rating INTEGER DEFAULT NULL,
  p_is_displacement_mission BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_payment RECORD;
  v_wallet RECORD;
  v_new_balance DECIMAL;
  v_new_xp INTEGER;
  v_new_tier VARCHAR;
  v_tier_changed BOOLEAN := false;
  v_streak_bonus INTEGER := 0;
BEGIN
  -- Calcular pagamento
  SELECT * INTO v_payment FROM calculate_delivery_payment(
    p_driver_id, p_distance_km, p_wait_time_minutes, p_rating, p_is_displacement_mission
  );

  -- Buscar wallet
  SELECT * INTO v_wallet FROM driver_wallets WHERE driver_id = p_driver_id FOR UPDATE;

  -- Atualizar streak
  IF v_wallet.last_active_date IS NULL OR v_wallet.last_active_date < CURRENT_DATE - 1 THEN
    -- Reset streak se ficou mais de 1 dia sem trabalhar
    UPDATE driver_wallets 
    SET current_streak_days = 1, last_active_date = CURRENT_DATE 
    WHERE driver_id = p_driver_id;
  ELSIF v_wallet.last_active_date < CURRENT_DATE THEN
    -- Incrementar streak
    UPDATE driver_wallets 
    SET 
      current_streak_days = current_streak_days + 1,
      longest_streak_days = GREATEST(longest_streak_days, current_streak_days + 1),
      last_active_date = CURRENT_DATE 
    WHERE driver_id = p_driver_id;
    
    -- Verificar se atingiu 5 dias seguidos
    IF v_wallet.current_streak_days + 1 = 5 THEN
      v_streak_bonus := (SELECT xp_streak_5_days FROM payment_config WHERE active = true LIMIT 1);
    END IF;
  END IF;

  -- Calcular novo saldo
  v_new_balance := v_wallet.balance + v_payment.total_amount;

  -- Inserir transação de ganho principal
  INSERT INTO wallet_transactions (
    wallet_id, driver_id, transaction_type, amount, balance_after, order_id,
    calculation_details, description
  ) VALUES (
    v_wallet.id, p_driver_id, 'delivery_earning', v_payment.total_amount, v_new_balance, p_order_id,
    jsonb_build_object(
      'base_amount', v_payment.base_amount,
      'wait_bonus', v_payment.wait_bonus,
      'rating_bonus', v_payment.rating_bonus,
      'displacement_bonus', v_payment.displacement_bonus,
      'tier_multiplier', v_payment.tier_multiplier,
      'gamification_bonus', v_payment.gamification_bonus,
      'distance_km', p_distance_km,
      'wait_minutes', p_wait_time_minutes,
      'rating', p_rating
    ),
    'Entrega concluída - Pedido #' || p_order_id::text
  );

  -- Calcular novo XP
  v_new_xp := v_wallet.current_xp + v_payment.xp_earned + v_streak_bonus;

  -- Inserir XP por entrega
  INSERT INTO xp_transactions (driver_id, xp_type, xp_amount, xp_before, xp_after, order_id, description)
  VALUES (p_driver_id, 'delivery_completed', v_payment.xp_earned, v_wallet.current_xp, v_new_xp, p_order_id, 'Entrega concluída');

  -- Inserir XP de streak se ganhou
  IF v_streak_bonus > 0 THEN
    INSERT INTO xp_transactions (driver_id, xp_type, xp_amount, xp_before, xp_after, description)
    VALUES (p_driver_id, 'streak_bonus', v_streak_bonus, v_new_xp - v_streak_bonus, v_new_xp, 'Bônus: 5 dias seguidos!');
  END IF;

  -- Determinar novo tier
  SELECT tier_name, multiplier INTO v_new_tier, v_payment.tier_multiplier
  FROM gamification_tiers
  WHERE v_new_xp >= min_xp AND (max_xp IS NULL OR v_new_xp <= max_xp)
  LIMIT 1;

  v_tier_changed := v_new_tier != v_wallet.tier;

  -- Atualizar wallet
  UPDATE driver_wallets SET
    balance = v_new_balance,
    total_earned = total_earned + v_payment.total_amount,
    current_xp = v_new_xp,
    total_xp = total_xp + v_payment.xp_earned + v_streak_bonus,
    tier = v_new_tier,
    tier_multiplier = v_payment.tier_multiplier,
    total_deliveries = total_deliveries + 1,
    total_5star_ratings = total_5star_ratings + CASE WHEN p_rating = 5 THEN 1 ELSE 0 END,
    total_displacement_missions = total_displacement_missions + CASE WHEN p_is_displacement_mission THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE driver_id = p_driver_id;

  -- Log de upgrade de tier
  IF v_tier_changed THEN
    INSERT INTO xp_transactions (driver_id, xp_type, xp_amount, xp_before, xp_after, description)
    VALUES (p_driver_id, 'tier_upgrade', 0, v_wallet.current_xp, v_new_xp, 'Parabéns! Você subiu para ' || v_new_tier || '!');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'payment', jsonb_build_object(
      'base_amount', v_payment.base_amount,
      'wait_bonus', v_payment.wait_bonus,
      'rating_bonus', v_payment.rating_bonus,
      'displacement_bonus', v_payment.displacement_bonus,
      'gamification_bonus', v_payment.gamification_bonus,
      'total_amount', v_payment.total_amount
    ),
    'xp', jsonb_build_object(
      'earned', v_payment.xp_earned + v_streak_bonus,
      'current', v_new_xp,
      'streak_bonus', v_streak_bonus
    ),
    'tier', jsonb_build_object(
      'current', v_new_tier,
      'multiplier', v_payment.tier_multiplier,
      'tier_changed', v_tier_changed
    ),
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNÇÃO: Aplicar decay de XP por inatividade
-- =============================================

CREATE OR REPLACE FUNCTION apply_inactivity_decay()
RETURNS INTEGER AS $$
DECLARE
  v_config RECORD;
  v_driver RECORD;
  v_decay_amount INTEGER;
  v_affected INTEGER := 0;
BEGIN
  SELECT * INTO v_config FROM payment_config WHERE active = true LIMIT 1;

  FOR v_driver IN 
    SELECT dw.* 
    FROM driver_wallets dw
    WHERE dw.last_active_date < CURRENT_DATE - v_config.inactivity_decay_days
      AND dw.current_xp > 0
  LOOP
    -- Calcular decay (% do XP atual)
    v_decay_amount := FLOOR(v_driver.current_xp * v_config.inactivity_decay_percent / 100.0);
    
    IF v_decay_amount > 0 THEN
      -- Aplicar decay
      UPDATE driver_wallets 
      SET 
        current_xp = GREATEST(current_xp - v_decay_amount, 0),
        updated_at = NOW()
      WHERE id = v_driver.id;

      -- Registrar
      INSERT INTO xp_transactions (
        driver_id, xp_type, xp_amount, xp_before, xp_after, description
      ) VALUES (
        v_driver.driver_id, 'inactivity_decay', -v_decay_amount, 
        v_driver.current_xp, GREATEST(v_driver.current_xp - v_decay_amount, 0),
        'Perda por inatividade (' || v_config.inactivity_decay_days || '+ dias)'
      );

      -- Recalcular tier
      UPDATE driver_wallets dw SET
        tier = gt.tier_name,
        tier_multiplier = gt.multiplier
      FROM gamification_tiers gt
      WHERE dw.id = v_driver.id
        AND dw.current_xp >= gt.min_xp 
        AND (gt.max_xp IS NULL OR dw.current_xp <= gt.max_xp);

      v_affected := v_affected + 1;
    END IF;
  END LOOP;

  RETURN v_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNÇÃO: Obter status da carteira do driver
-- =============================================

CREATE OR REPLACE FUNCTION get_driver_wallet_status(p_driver_id UUID)
RETURNS TABLE (
  -- Financeiro
  balance DECIMAL,
  pending_balance DECIMAL,
  total_earned DECIMAL,
  -- Gamificação
  current_xp INTEGER,
  total_xp INTEGER,
  tier VARCHAR,
  tier_multiplier DECIMAL,
  tier_color VARCHAR,
  tier_icon VARCHAR,
  -- Progresso
  xp_for_current_tier INTEGER,
  xp_for_next_tier INTEGER,
  xp_progress_percent INTEGER,
  next_tier VARCHAR,
  next_tier_multiplier DECIMAL,
  -- Streak
  current_streak_days INTEGER,
  longest_streak_days INTEGER,
  days_until_streak_bonus INTEGER,
  -- Estatísticas
  total_deliveries INTEGER,
  total_5star_ratings INTEGER,
  total_displacement_missions INTEGER
) AS $$
DECLARE
  v_wallet RECORD;
  v_current_tier RECORD;
  v_next_tier RECORD;
  v_xp_progress INTEGER;
BEGIN
  -- Buscar wallet
  SELECT * INTO v_wallet FROM driver_wallets WHERE driver_id = p_driver_id;
  
  IF v_wallet IS NULL THEN
    INSERT INTO driver_wallets (driver_id) VALUES (p_driver_id)
    RETURNING * INTO v_wallet;
  END IF;

  -- Buscar tier atual
  SELECT * INTO v_current_tier FROM gamification_tiers WHERE tier_name = v_wallet.tier;

  -- Buscar próximo tier
  SELECT * INTO v_next_tier 
  FROM gamification_tiers 
  WHERE min_xp > v_wallet.current_xp 
  ORDER BY min_xp ASC 
  LIMIT 1;

  -- Calcular progresso
  IF v_next_tier IS NOT NULL THEN
    v_xp_progress := ((v_wallet.current_xp - v_current_tier.min_xp)::DECIMAL / 
                      (v_next_tier.min_xp - v_current_tier.min_xp) * 100)::INTEGER;
  ELSE
    v_xp_progress := 100;
  END IF;

  RETURN QUERY SELECT
    v_wallet.balance,
    v_wallet.pending_balance,
    v_wallet.total_earned,
    v_wallet.current_xp,
    v_wallet.total_xp,
    v_wallet.tier,
    v_wallet.tier_multiplier,
    v_current_tier.badge_color,
    v_current_tier.badge_icon,
    v_current_tier.min_xp,
    COALESCE(v_next_tier.min_xp, v_current_tier.min_xp),
    v_xp_progress,
    COALESCE(v_next_tier.tier_name, v_wallet.tier),
    COALESCE(v_next_tier.multiplier, v_wallet.tier_multiplier),
    v_wallet.current_streak_days,
    v_wallet.longest_streak_days,
    GREATEST(5 - COALESCE(v_wallet.current_streak_days, 0), 0),
    v_wallet.total_deliveries,
    v_wallet.total_5star_ratings,
    v_wallet.total_displacement_missions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNÇÃO: Obter extrato gamer (transações + XP)
-- =============================================

CREATE OR REPLACE FUNCTION get_driver_gamer_statement(
  p_driver_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  transaction_id UUID,
  transaction_date TIMESTAMP WITH TIME ZONE,
  transaction_type VARCHAR,
  -- Financeiro
  amount DECIMAL,
  balance_after DECIMAL,
  -- XP
  xp_earned INTEGER,
  xp_type VARCHAR,
  -- Detalhes
  description TEXT,
  order_id UUID,
  calculation_details JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wt.id,
    wt.created_at,
    wt.transaction_type::VARCHAR,
    wt.amount,
    wt.balance_after,
    COALESCE((
      SELECT xt.xp_amount 
      FROM xp_transactions xt 
      WHERE xt.order_id = wt.order_id 
        AND xt.driver_id = p_driver_id
        AND xt.xp_type = 'delivery_completed'
      LIMIT 1
    ), 0),
    COALESCE((
      SELECT xt.xp_type 
      FROM xp_transactions xt 
      WHERE xt.order_id = wt.order_id 
        AND xt.driver_id = p_driver_id
      LIMIT 1
    ), '')::VARCHAR,
    wt.description,
    wt.order_id,
    wt.calculation_details
  FROM wallet_transactions wt
  WHERE wt.driver_id = p_driver_id
  ORDER BY wt.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE driver_wallets IS 'Carteira financeira e gamificação do entregador';
COMMENT ON TABLE wallet_transactions IS 'Histórico de transações financeiras';
COMMENT ON TABLE xp_transactions IS 'Histórico de XP ganho/perdido';
COMMENT ON TABLE gamification_tiers IS 'Configuração dos níveis Bronze/Prata/Ouro/Diamante';
COMMENT ON TABLE payment_config IS 'Configurações de remuneração e XP';
COMMENT ON FUNCTION calculate_delivery_payment IS 'TAREFA 1: Motor de cálculo de pagamento';
COMMENT ON FUNCTION process_delivery_completion IS 'Processa pagamento + XP após entrega';
COMMENT ON FUNCTION apply_inactivity_decay IS 'Aplica perda de XP por inatividade (7+ dias)';
COMMENT ON FUNCTION get_driver_wallet_status IS 'Retorna status completo da carteira + progresso';
COMMENT ON FUNCTION get_driver_gamer_statement IS 'Retorna extrato gamer com $ e XP';
