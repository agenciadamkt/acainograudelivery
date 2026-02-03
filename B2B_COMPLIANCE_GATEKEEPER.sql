-- =============================================
-- B2B COMPLIANCE GATEKEEPER SYSTEM
-- Sistema de Validação Jurídica MEI/CNPJ
-- Etapa: Segurança e Compliance
-- =============================================

-- =============================================
-- TAREFA 1: Perfil de Faturamento com CNPJ
-- =============================================

-- Adicionar campos de CNPJ na tabela delivery_drivers
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS razao_social VARCHAR(255);
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS nome_fantasia VARCHAR(255);
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS cnpj_situacao VARCHAR(50);
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS cnpj_validated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS cnpj_validation_data JSONB;
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS cnae_principal VARCHAR(20);
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS cnae_compatible BOOLEAN DEFAULT true;
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS cnae_warning TEXT;
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS b2b_terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS b2b_terms_accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS b2b_terms_version VARCHAR(10);
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS b2b_terms_pdf_url TEXT;
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS mei_status VARCHAR(50) DEFAULT 'pending' CHECK (mei_status IN ('pending', 'active', 'inactive', 'divergent', 'rejected'));
ALTER TABLE delivery_drivers ADD COLUMN IF NOT EXISTS pj_bank_account JSONB;

-- Criar unique index para CNPJ
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_drivers_cnpj ON delivery_drivers(cnpj) WHERE cnpj IS NOT NULL;

-- =============================================
-- TAREFA 2: White-list de CNAEs Permitidos
-- =============================================

CREATE TABLE IF NOT EXISTS allowed_cnaes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  categoria VARCHAR(100),
  is_primary BOOLEAN DEFAULT false,  -- CNAEs prioritários para logística
  requires_warning BOOLEAN DEFAULT false,  -- Se deve gerar alerta mesmo permitindo
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir CNAEs permitidos para logística/transporte
INSERT INTO allowed_cnaes (codigo, descricao, categoria, is_primary) VALUES
-- CNAEs Prioritários (Logística)
('49.30-2-01', 'Transporte rodoviário de carga, exceto produtos perigosos e mudanças, municipal', 'Transporte', true),
('49.30-2-02', 'Transporte rodoviário de carga, exceto produtos perigosos e mudanças, intermunicipal, interestadual e internacional', 'Transporte', true),
('53.20-2-01', 'Serviços de malote não realizados pelo correio nacional', 'Correios', true),
('53.20-2-02', 'Serviços de entrega rápida', 'Entregas', true),
('52.50-8-05', 'Operador de transporte multimodal', 'Logística', true),

-- CNAEs Secundários (Permitidos com menos prioridade)
('82.19-9-99', 'Preparação de documentos e serviços especializados de apoio administrativo não especificados anteriormente', 'Serviços', false),
('74.90-1-04', 'Atividades de intermediação e agenciamento de serviços e negócios em geral', 'Agenciamento', false),
('52.11-7-99', 'Depósitos de mercadorias para terceiros, exceto armazéns gerais e guarda-móveis', 'Armazenagem', false)
ON CONFLICT (codigo) DO NOTHING;

-- Tabela para CNAEs que geram alerta mas não bloqueiam
CREATE TABLE IF NOT EXISTS cnae_divergence_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo VARCHAR(20) NOT NULL,
  descricao TEXT,
  reason TEXT NOT NULL,  -- Motivo do alerta
  allow_registration BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- TAREFA 3: Termos B2B e Aceites
-- =============================================

CREATE TABLE IF NOT EXISTS b2b_terms_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(10) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  effective_date DATE NOT NULL,
  mandatory BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_terms_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
  terms_version_id UUID NOT NULL REFERENCES b2b_terms_versions(id),
  -- Dados do aceite
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_fingerprint VARCHAR(255),
  -- Declaração
  declaration_text TEXT NOT NULL,
  full_scroll_completed BOOLEAN DEFAULT false,
  -- PDF gerado
  pdf_url TEXT,
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  -- Metadados
  cnpj_at_acceptance VARCHAR(18),
  razao_social_at_acceptance VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_driver_terms_driver ON driver_terms_acceptances(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_terms_version ON driver_terms_acceptances(terms_version_id);

-- =============================================
-- TAREFA 4: Validação de Dados Bancários PJ
-- =============================================

CREATE TABLE IF NOT EXISTS driver_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
  -- Dados bancários
  bank_code VARCHAR(10) NOT NULL,
  bank_name VARCHAR(100),
  agency VARCHAR(10) NOT NULL,
  agency_digit VARCHAR(1),
  account_number VARCHAR(20) NOT NULL,
  account_digit VARCHAR(1),
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('corrente', 'poupanca')),
  -- Titular (deve bater com CNPJ/CPF do MEI)
  holder_name VARCHAR(255) NOT NULL,
  holder_document VARCHAR(18) NOT NULL,  -- CNPJ ou CPF do titular MEI
  holder_document_type VARCHAR(4) NOT NULL CHECK (holder_document_type IN ('cnpj', 'cpf')),
  -- Validação
  is_pj_account BOOLEAN DEFAULT false,  -- Conta PJ confirmada
  is_mei_holder BOOLEAN DEFAULT false,  -- Titular é o MEI cadastrado
  validated BOOLEAN DEFAULT false,
  validated_at TIMESTAMP WITH TIME ZONE,
  validation_method VARCHAR(50),  -- 'manual', 'micro_deposit', 'api'
  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'validated', 'rejected', 'inactive')),
  is_primary BOOLEAN DEFAULT false,
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_bank_driver ON driver_bank_accounts(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_bank_document ON driver_bank_accounts(holder_document);

-- =============================================
-- Log de Validações CNPJ
-- =============================================

CREATE TABLE IF NOT EXISTS cnpj_validation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES delivery_drivers(id),
  cnpj VARCHAR(18) NOT NULL,
  -- Resultado da API
  api_source VARCHAR(50),  -- 'brasilapi', 'receitaws', etc.
  api_response JSONB,
  -- Status encontrado
  situacao_cadastral VARCHAR(50),
  razao_social VARCHAR(255),
  nome_fantasia VARCHAR(255),
  cnae_principal VARCHAR(20),
  cnae_secundarios JSONB,
  data_abertura DATE,
  capital_social DECIMAL(15, 2),
  porte VARCHAR(50),
  natureza_juridica VARCHAR(100),
  -- Validação
  is_valid BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT false,
  is_mei BOOLEAN DEFAULT false,
  cnae_compatible BOOLEAN DEFAULT true,
  validation_error TEXT,
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cnpj_log_cnpj ON cnpj_validation_log(cnpj);
CREATE INDEX IF NOT EXISTS idx_cnpj_log_driver ON cnpj_validation_log(driver_id);

-- =============================================
-- RLS Policies
-- =============================================

ALTER TABLE allowed_cnaes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cnae_divergence_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_terms_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_terms_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cnpj_validation_log ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de leitura
CREATE POLICY "Anyone can view allowed cnaes" ON allowed_cnaes FOR SELECT USING (true);
CREATE POLICY "Anyone can view active terms" ON b2b_terms_versions FOR SELECT USING (active = true);

-- Políticas para drivers
CREATE POLICY "Drivers can view own terms" ON driver_terms_acceptances FOR SELECT USING (
  driver_id IN (SELECT id FROM delivery_drivers WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'franchisee_master'))
);

CREATE POLICY "Drivers can insert own terms" ON driver_terms_acceptances FOR INSERT WITH CHECK (
  driver_id IN (SELECT id FROM delivery_drivers WHERE user_id = auth.uid())
);

CREATE POLICY "Drivers can view own bank accounts" ON driver_bank_accounts FOR SELECT USING (
  driver_id IN (SELECT id FROM delivery_drivers WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'franchisee_master'))
);

CREATE POLICY "Drivers can manage own bank accounts" ON driver_bank_accounts FOR ALL USING (
  driver_id IN (SELECT id FROM delivery_drivers WHERE user_id = auth.uid())
);

CREATE POLICY "System can insert validation logs" ON cnpj_validation_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view validation logs" ON cnpj_validation_log FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'franchisee_master'))
);

-- =============================================
-- FUNÇÕES: Validação de CNPJ
-- =============================================

-- Função para verificar se CNAE é permitido
CREATE OR REPLACE FUNCTION check_cnae_compatibility(p_cnae VARCHAR)
RETURNS TABLE (
  is_allowed BOOLEAN,
  is_primary BOOLEAN,
  requires_warning BOOLEAN,
  cnae_descricao TEXT,
  warning_message TEXT
) AS $$
DECLARE
  v_allowed RECORD;
BEGIN
  -- Buscar na whitelist
  SELECT * INTO v_allowed FROM allowed_cnaes 
  WHERE codigo = p_cnae AND active = true;

  IF v_allowed IS NOT NULL THEN
    RETURN QUERY SELECT 
      true, 
      v_allowed.is_primary,
      v_allowed.requires_warning,
      v_allowed.descricao,
      CASE WHEN v_allowed.requires_warning 
        THEN 'CNAE permitido mas requer atenção: ' || v_allowed.descricao
        ELSE NULL
      END;
  ELSE
    -- CNAE não está na whitelist
    RETURN QUERY SELECT 
      false,
      false,
      true,
      'CNAE não identificado na lista de atividades permitidas'::TEXT,
      'Divergência de Atividade: O CNAE ' || p_cnae || ' não está na lista de atividades compatíveis com logística/entrega. O cadastro será permitido com alerta para revisão.'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para registrar validação de CNPJ
CREATE OR REPLACE FUNCTION register_cnpj_validation(
  p_driver_id UUID,
  p_cnpj VARCHAR,
  p_api_source VARCHAR,
  p_api_response JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_situacao VARCHAR;
  v_razao_social VARCHAR;
  v_nome_fantasia VARCHAR;
  v_cnae_principal VARCHAR;
  v_is_valid BOOLEAN;
  v_is_active BOOLEAN;
  v_is_mei BOOLEAN;
  v_cnae_check RECORD;
  v_result JSONB;
BEGIN
  -- Extrair dados do response (estrutura BrasilAPI)
  v_situacao := p_api_response->>'descricao_situacao_cadastral';
  IF v_situacao IS NULL THEN
    v_situacao := p_api_response->>'situacao_cadastral';
  END IF;
  
  v_razao_social := p_api_response->>'razao_social';
  v_nome_fantasia := p_api_response->>'nome_fantasia';
  v_cnae_principal := p_api_response->'cnae_fiscal'->>'codigo';
  IF v_cnae_principal IS NULL THEN
    v_cnae_principal := p_api_response->>'cnae_fiscal';
  END IF;

  -- Verificar se está ativo
  v_is_active := UPPER(v_situacao) IN ('ATIVA', 'ATIVO', '02', 'REGULAR');
  
  -- Verificar se é MEI (natureza jurídica 213-5)
  v_is_mei := (p_api_response->>'natureza_juridica' LIKE '%213-5%') 
           OR (p_api_response->>'natureza_juridica' LIKE '%MEI%')
           OR (p_api_response->>'porte' ILIKE '%MEI%');

  -- Resultado de validação
  v_is_valid := v_is_active;

  -- Verificar CNAE
  SELECT * INTO v_cnae_check FROM check_cnae_compatibility(v_cnae_principal);

  -- Inserir log
  INSERT INTO cnpj_validation_log (
    driver_id, cnpj, api_source, api_response,
    situacao_cadastral, razao_social, nome_fantasia,
    cnae_principal, cnae_secundarios,
    data_abertura, capital_social, porte, natureza_juridica,
    is_valid, is_active, is_mei, cnae_compatible
  ) VALUES (
    p_driver_id, p_cnpj, p_api_source, p_api_response,
    v_situacao, v_razao_social, v_nome_fantasia,
    v_cnae_principal, p_api_response->'cnaes_secundarios',
    (p_api_response->>'data_inicio_atividade')::DATE,
    (p_api_response->>'capital_social')::DECIMAL,
    p_api_response->>'porte',
    p_api_response->>'natureza_juridica',
    v_is_valid, v_is_active, v_is_mei, COALESCE(v_cnae_check.is_allowed, false)
  );

  -- Se válido, atualizar driver
  IF v_is_valid AND p_driver_id IS NOT NULL THEN
    UPDATE delivery_drivers SET
      cnpj = p_cnpj,
      razao_social = v_razao_social,
      nome_fantasia = v_nome_fantasia,
      cnpj_situacao = v_situacao,
      cnpj_validated_at = NOW(),
      cnpj_validation_data = p_api_response,
      cnae_principal = v_cnae_principal,
      cnae_compatible = COALESCE(v_cnae_check.is_allowed, false),
      cnae_warning = v_cnae_check.warning_message,
      mei_status = CASE 
        WHEN v_is_active AND COALESCE(v_cnae_check.is_allowed, false) THEN 'active'
        WHEN v_is_active AND NOT COALESCE(v_cnae_check.is_allowed, false) THEN 'divergent'
        ELSE 'rejected'
      END,
      updated_at = NOW()
    WHERE id = p_driver_id;
  END IF;

  -- Retornar resultado
  v_result := jsonb_build_object(
    'valid', v_is_valid,
    'active', v_is_active,
    'is_mei', v_is_mei,
    'razao_social', v_razao_social,
    'nome_fantasia', v_nome_fantasia,
    'situacao', v_situacao,
    'cnae_principal', v_cnae_principal,
    'cnae_compatible', COALESCE(v_cnae_check.is_allowed, false),
    'cnae_warning', v_cnae_check.warning_message,
    'mei_status', CASE 
      WHEN v_is_active AND COALESCE(v_cnae_check.is_allowed, false) THEN 'active'
      WHEN v_is_active AND NOT COALESCE(v_cnae_check.is_allowed, false) THEN 'divergent'
      WHEN NOT v_is_active THEN 'rejected'
      ELSE 'pending'
    END,
    'rejection_reason', CASE 
      WHEN NOT v_is_active THEN 'Apenas MEIs ativos podem operar no Marketplace'
      ELSE NULL
    END
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNÇÃO: Aceitar Termos B2B
-- =============================================

CREATE OR REPLACE FUNCTION accept_b2b_terms(
  p_driver_id UUID,
  p_terms_version_id UUID,
  p_declaration_text TEXT,
  p_full_scroll_completed BOOLEAN,
  p_ip_address VARCHAR DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_fingerprint VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_terms RECORD;
  v_driver RECORD;
  v_acceptance_id UUID;
BEGIN
  -- Buscar termos
  SELECT * INTO v_terms FROM b2b_terms_versions WHERE id = p_terms_version_id AND active = true;
  IF v_terms IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Versão de termos não encontrada ou inativa');
  END IF;

  -- Buscar driver
  SELECT * INTO v_driver FROM delivery_drivers WHERE id = p_driver_id;
  IF v_driver IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entregador não encontrado');
  END IF;

  -- Verificar se já aceitou esta versão
  IF EXISTS (
    SELECT 1 FROM driver_terms_acceptances 
    WHERE driver_id = p_driver_id AND terms_version_id = p_terms_version_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Termos já aceitos anteriormente');
  END IF;

  -- Inserir aceite
  INSERT INTO driver_terms_acceptances (
    driver_id, terms_version_id, 
    declaration_text, full_scroll_completed,
    ip_address, user_agent, device_fingerprint,
    cnpj_at_acceptance, razao_social_at_acceptance
  ) VALUES (
    p_driver_id, p_terms_version_id,
    p_declaration_text, p_full_scroll_completed,
    p_ip_address, p_user_agent, p_device_fingerprint,
    v_driver.cnpj, v_driver.razao_social
  ) RETURNING id INTO v_acceptance_id;

  -- Atualizar driver
  UPDATE delivery_drivers SET
    b2b_terms_accepted = true,
    b2b_terms_accepted_at = NOW(),
    b2b_terms_version = v_terms.version,
    updated_at = NOW()
  WHERE id = p_driver_id;

  RETURN jsonb_build_object(
    'success', true,
    'acceptance_id', v_acceptance_id,
    'terms_version', v_terms.version,
    'accepted_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNÇÃO: Validar Conta Bancária
-- =============================================

CREATE OR REPLACE FUNCTION validate_bank_account(
  p_driver_id UUID,
  p_bank_code VARCHAR,
  p_bank_name VARCHAR,
  p_agency VARCHAR,
  p_account_number VARCHAR,
  p_account_type VARCHAR,
  p_holder_name VARCHAR,
  p_holder_document VARCHAR,
  p_holder_document_type VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_driver RECORD;
  v_is_pj_account BOOLEAN;
  v_is_mei_holder BOOLEAN;
  v_account_id UUID;
  v_clean_document VARCHAR;
BEGIN
  -- Buscar driver
  SELECT * INTO v_driver FROM delivery_drivers WHERE id = p_driver_id;
  IF v_driver IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Entregador não encontrado');
  END IF;

  -- Limpar documento
  v_clean_document := regexp_replace(p_holder_document, '[^0-9]', '', 'g');

  -- Verificar se é conta PJ
  v_is_pj_account := p_holder_document_type = 'cnpj';

  -- Verificar se o titular corresponde ao MEI cadastrado
  v_is_mei_holder := v_clean_document = regexp_replace(v_driver.cnpj, '[^0-9]', '', 'g');
  
  -- Se não bate com CNPJ, verificar se CPF do titular MEI corresponde
  IF NOT v_is_mei_holder AND p_holder_document_type = 'cpf' THEN
    -- O CPF do titular pode ser do sócio do MEI (verificar se nome bate)
    v_is_mei_holder := UPPER(p_holder_name) LIKE '%' || UPPER(SPLIT_PART(v_driver.name, ' ', 1)) || '%';
  END IF;

  -- Inserir conta
  INSERT INTO driver_bank_accounts (
    driver_id, bank_code, bank_name, agency, account_number, account_type,
    holder_name, holder_document, holder_document_type,
    is_pj_account, is_mei_holder, is_primary,
    status
  ) VALUES (
    p_driver_id, p_bank_code, p_bank_name, p_agency, p_account_number, p_account_type,
    p_holder_name, v_clean_document, p_holder_document_type,
    v_is_pj_account, v_is_mei_holder, true,
    CASE WHEN v_is_mei_holder THEN 'validated' ELSE 'pending' END
  ) RETURNING id INTO v_account_id;

  -- Atualizar driver com dados bancários
  UPDATE delivery_drivers SET
    pj_bank_account = jsonb_build_object(
      'bank_code', p_bank_code,
      'bank_name', p_bank_name,
      'agency', p_agency,
      'account_number', p_account_number,
      'account_type', p_account_type,
      'holder_name', p_holder_name,
      'is_pj', v_is_pj_account,
      'validated', v_is_mei_holder
    ),
    updated_at = NOW()
  WHERE id = p_driver_id;

  RETURN jsonb_build_object(
    'success', true,
    'account_id', v_account_id,
    'is_pj_account', v_is_pj_account,
    'is_mei_holder', v_is_mei_holder,
    'status', CASE WHEN v_is_mei_holder THEN 'validated' ELSE 'pending' END,
    'warning', CASE 
      WHEN NOT v_is_mei_holder THEN 'A conta bancária não corresponde ao MEI cadastrado. Será necessária validação manual.'
      WHEN NOT v_is_pj_account THEN 'Recomendamos o uso de conta PJ para maior segurança jurídica.'
      ELSE NULL
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- FUNÇÃO: Verificar Compliance do Driver
-- =============================================

CREATE OR REPLACE FUNCTION check_driver_compliance(p_driver_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_driver RECORD;
  v_compliance JSONB;
BEGIN
  SELECT * INTO v_driver FROM delivery_drivers WHERE id = p_driver_id;

  IF v_driver IS NULL THEN
    RETURN jsonb_build_object('compliant', false, 'error', 'Entregador não encontrado');
  END IF;

  v_compliance := jsonb_build_object(
    'driver_id', p_driver_id,
    'compliant', (
      v_driver.cnpj IS NOT NULL
      AND v_driver.mei_status = 'active'
      AND v_driver.b2b_terms_accepted = true
      AND v_driver.pj_bank_account IS NOT NULL
    ),
    'checks', jsonb_build_object(
      'cnpj_registered', v_driver.cnpj IS NOT NULL,
      'cnpj_value', v_driver.cnpj,
      'mei_status', v_driver.mei_status,
      'mei_active', v_driver.mei_status = 'active',
      'cnae_compatible', v_driver.cnae_compatible,
      'cnae_warning', v_driver.cnae_warning,
      'terms_accepted', v_driver.b2b_terms_accepted,
      'terms_version', v_driver.b2b_terms_version,
      'bank_configured', v_driver.pj_bank_account IS NOT NULL
    ),
    'blocks', jsonb_build_array(
      CASE WHEN v_driver.cnpj IS NULL THEN 'CNPJ não cadastrado' ELSE NULL END,
      CASE WHEN v_driver.mei_status = 'rejected' THEN 'MEI inativo ou baixado' ELSE NULL END,
      CASE WHEN NOT v_driver.b2b_terms_accepted THEN 'Termos B2B não aceitos' ELSE NULL END,
      CASE WHEN v_driver.pj_bank_account IS NULL THEN 'Conta bancária não configurada' ELSE NULL END
    ),
    'warnings', jsonb_build_array(
      CASE WHEN v_driver.mei_status = 'divergent' THEN 'Divergência de CNAE - Atividade incompatível' ELSE NULL END,
      v_driver.cnae_warning
    ),
    'checked_at', NOW()
  );

  RETURN v_compliance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- INSERIR TERMOS B2B PADRÃO
-- =============================================

INSERT INTO b2b_terms_versions (version, title, content, effective_date, mandatory) VALUES
('1.0', 'Termos de Prestação de Serviços B2B - Parceiro Entregador',
$$
TERMOS E CONDIÇÕES DE PRESTAÇÃO DE SERVIÇOS
MARKETPLACE AÇAÍ NO GRAU
Versão 1.0 - Vigência: 01/02/2026

PARTES:
- CONTRATANTE: Açaí no Grau Franchising Ltda., inscrita no CNPJ sob nº XX.XXX.XXX/0001-XX
- CONTRATADO: Microempreendedor Individual (MEI) devidamente cadastrado na plataforma

1. OBJETO
1.1. O presente termo regula a prestação de serviços de LOGÍSTICA E ENTREGA pelo CONTRATADO (doravante "PARCEIRO") através da plataforma digital do MARKETPLACE Açaí no Grau.

1.2. O PARCEIRO declara-se como EMPRESA INDEPENDENTE, configurando relação estritamente BUSINESS-TO-BUSINESS (B2B), sem qualquer vínculo empregatício, subordinação ou exclusividade.

2. DA NATUREZA JURÍDICA
2.1. O PARCEIRO opera como Microempreendedor Individual (MEI) ou pessoa jurídica equivalente, assumindo integral responsabilidade por suas obrigações fiscais, previdenciárias e trabalhistas.

2.2. NÃO HÁ relação de emprego, trabalho subordinado ou qualquer vínculo de exclusividade entre as partes.

2.3. O PARCEIRO tem liberdade para:
   a) Definir seus próprios horários de disponibilidade
   b) Aceitar ou recusar solicitações de entrega
   c) Prestar serviços para outras plataformas ou empresas
   d) Utilizar veículo próprio ou locado

3. REMUNERAÇÃO
3.1. O PARCEIRO receberá remuneração variável por entrega realizada, conforme tabela vigente na plataforma.

3.2. Os pagamentos serão realizados exclusivamente para:
   a) Conta bancária PJ vinculada ao CNPJ do PARCEIRO; ou
   b) Conta bancária de titularidade do sócio do MEI

3.3. O PARCEIRO é responsável pela emissão de Nota Fiscal de Serviços.

4. OBRIGAÇÕES DO PARCEIRO
4.1. Manter cadastro MEI ativo e regular
4.2. Zelar pela integridade dos produtos transportados
4.3. Cumprir os padrões de qualidade da marca
4.4. Portar documentação em dia (CNH, se aplicável; documentos do veículo)

5. PRAZO E RESCISÃO
5.1. Este termo tem vigência indeterminada, podendo ser rescindido por qualquer das partes a qualquer momento, sem ônus.

6. DECLARAÇÃO FINAL
Ao aceitar este termo, o PARCEIRO declara:

"EU, na qualidade de representante legal do MEI identificado nesta plataforma, DECLARO que sou uma EMPRESA INDEPENDENTE e presto serviços de LOGÍSTICA para o Marketplace Açaí no Grau. Reconheço que NÃO SOU EMPREGADO, não recebo ordens diretas, tenho autonomia para definir minha jornada e assumo os riscos da minha atividade empresarial."

Data de aceite registrada automaticamente pelo sistema.
$$,
'2026-02-01', true)
ON CONFLICT (version) DO NOTHING;

-- Comments
COMMENT ON TABLE allowed_cnaes IS 'White-list de CNAEs permitidos para logística';
COMMENT ON TABLE b2b_terms_versions IS 'Versões dos termos B2B para aceite';
COMMENT ON TABLE driver_terms_acceptances IS 'Registro de aceites dos termos por drivers';
COMMENT ON TABLE driver_bank_accounts IS 'Contas bancárias PJ dos entregadores';
COMMENT ON TABLE cnpj_validation_log IS 'Log de validações de CNPJ via API';
COMMENT ON FUNCTION register_cnpj_validation IS 'Registra e processa validação de CNPJ';
COMMENT ON FUNCTION accept_b2b_terms IS 'Processa aceite dos termos B2B';
COMMENT ON FUNCTION check_driver_compliance IS 'Verifica compliance total do driver';
