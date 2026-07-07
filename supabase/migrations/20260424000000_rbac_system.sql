-- ═══════════════════════════════════════════════════════════════
-- RBAC System — GrauOS
-- ═══════════════════════════════════════════════════════════════

-- ── 1. user_profiles ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  nome         TEXT NOT NULL DEFAULT '',
  cpf          TEXT,
  telefone     TEXT,
  foto         TEXT,
  perfil       TEXT NOT NULL DEFAULT 'COLABORADOR'
                 CHECK (perfil IN ('MASTER','FRANQUEADO','COLABORADOR')),
  unidade_id   UUID REFERENCES stores(id) ON DELETE SET NULL,
  ativo        BOOLEAN NOT NULL DEFAULT true,
  is_protected BOOLEAN NOT NULL DEFAULT false,
  ultimo_acesso TIMESTAMPTZ,
  criado_por   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "master_read_all_profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.perfil = 'MASTER'
    )
  );

CREATE POLICY "master_write_profiles"
  ON user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.perfil = 'MASTER'
    )
  );

-- Franqueado pode ler/editar colaboradores da mesma unidade
CREATE POLICY "franqueado_manage_unit_users"
  ON user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.perfil = 'FRANQUEADO'
        AND up.unidade_id = user_profiles.unidade_id
        AND user_profiles.perfil = 'COLABORADOR'
    )
  );

-- ── 2. rbac_modulos ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rbac_modulos (
  codigo      TEXT PRIMARY KEY,
  nome        TEXT NOT NULL,
  categoria   TEXT NOT NULL,
  rota        TEXT,
  descricao   TEXT,
  ordem       INT NOT NULL DEFAULT 0
);

-- ── 3. rbac_perfil_permissoes ───────────────────────────────────
CREATE TABLE IF NOT EXISTS rbac_perfil_permissoes (
  perfil        TEXT NOT NULL,
  modulo_codigo TEXT NOT NULL REFERENCES rbac_modulos(codigo) ON DELETE CASCADE,
  nivel         INT NOT NULL DEFAULT 0 CHECK (nivel BETWEEN 0 AND 4),
  PRIMARY KEY (perfil, modulo_codigo)
);

-- ── 4. rbac_usuario_permissoes ──────────────────────────────────
CREATE TABLE IF NOT EXISTS rbac_usuario_permissoes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modulo_codigo TEXT NOT NULL REFERENCES rbac_modulos(codigo) ON DELETE CASCADE,
  nivel         INT NOT NULL DEFAULT 0 CHECK (nivel BETWEEN 0 AND 4),
  UNIQUE (usuario_id, modulo_codigo)
);

ALTER TABLE rbac_usuario_permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_manage_all_permissions"
  ON rbac_usuario_permissoes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.perfil = 'MASTER'
    )
  );

CREATE POLICY "franqueado_manage_unit_permissions"
  ON rbac_usuario_permissoes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles requester
      JOIN user_profiles target ON target.id = rbac_usuario_permissoes.usuario_id
      WHERE requester.id = auth.uid()
        AND requester.perfil = 'FRANQUEADO'
        AND target.unidade_id = requester.unidade_id
        AND target.perfil = 'COLABORADOR'
    )
  );

CREATE POLICY "users_read_own_permissions"
  ON rbac_usuario_permissoes FOR SELECT
  USING (usuario_id = auth.uid());

-- ── 5. rbac_auditoria ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rbac_auditoria (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  alterado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao         TEXT NOT NULL,
  dados_antes  JSONB,
  dados_depois JSONB,
  ip           TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rbac_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "master_read_audit"
  ON rbac_auditoria FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.perfil IN ('MASTER','FRANQUEADO')
    )
  );

-- ── 6. SEED — Módulos (42) ──────────────────────────────────────
INSERT INTO rbac_modulos (codigo, nome, categoria, rota, ordem) VALUES
  -- PDV
  ('pdv.nova-venda',    'Nova Venda',         'PDV',        '/admin/pdv/nova-venda',              1),
  ('pdv.mesas',         'Mesas',              'PDV',        '/admin/pdv/mesas',                   2),
  ('pdv.caixa',         'Caixa',              'PDV',        '/admin/pdv/caixa',                   3),
  ('pdv.historico',     'Histórico PDV',      'PDV',        '/admin/pdv/historico',               4),
  -- Operação
  ('op.dashboard',      'Dashboard Op.',      'OPERACAO',   '/admin/dashboard',                   5),
  ('op.pedidos',        'Pedidos Online',     'OPERACAO',   '/admin/orders',                      6),
  ('op.kds',            'KDS Cozinha',        'OPERACAO',   '/admin/kds',                         7),
  ('op.entregas',       'Entregas',           'OPERACAO',   '/admin/delivery',                    8),
  ('op.areas-entrega',  'Áreas de Entrega',   'OPERACAO',   '/admin/delivery/areas',              9),
  -- Cardápio
  ('cardapio.cats',     'Categorias',         'CARDAPIO',   '/admin/menu/categories',            10),
  ('cardapio.produtos', 'Produtos',           'CARDAPIO',   '/admin/menu/products',              11),
  ('cardapio.toppings', 'Complementos',       'CARDAPIO',   '/admin/menu/toppings',              12),
  ('cardapio.ingreds',  'Ingredientes',       'CARDAPIO',   '/admin/menu/ingredients',           13),
  ('cardapio.promo',    'Promoções',          'CARDAPIO',   '/admin/promotions',                 14),
  -- Financeiro
  ('fin.dashboard',     'Dashboard Fin.',     'FINANCEIRO', '/admin/financeiro',                 15),
  ('fin.lancamentos',   'Lançamentos',        'FINANCEIRO', '/admin/financeiro/lancamentos',     16),
  ('fin.fluxo-semanal', 'Fluxo Semanal',      'FINANCEIRO', '/admin/financeiro/fluxo-semanal',   17),
  ('fin.despesas',      'Despesas',           'FINANCEIRO', '/admin/financeiro/despesas',        18),
  ('fin.fechamentos',   'Fechamentos Caixa',  'FINANCEIRO', '/admin/financeiro/fluxo',           19),
  ('fin.dre',           'DRE',                'FINANCEIRO', '/admin/financeiro/dre',             20),
  ('fin.receber',       'Contas a Receber',   'FINANCEIRO', '/admin/financeiro/receber',         21),
  ('fin.cadastros',     'Cadastros Fin.',     'FINANCEIRO', '/admin/financeiro/cadastros',       22),
  -- Estoque
  ('est.central',       'Estoque Central',    'ESTOQUE',    '/admin/stock/inventory',            23),
  ('est.movimentos',    'Movimentações',      'ESTOQUE',    '/admin/stock/movements',            24),
  ('est.contagem',      'Contagem Física',    'ESTOQUE',    '/admin/stock/counts',               25),
  ('est.cmv',           'Gestão de CMV',      'ESTOQUE',    '/admin/stock/cmv',                  26),
  ('est.compras',       'Lista de Compras',   'ESTOQUE',    '/admin/stock/purchases',            27),
  ('est.hist-compras',  'Histórico Compras',  'ESTOQUE',    '/admin/stock/purchase-history',     28),
  ('est.rotinas',       'Rotinas Op.',        'ESTOQUE',    '/admin/stock/checklists/execution', 29),
  -- Clientes & Marketing
  ('cli.crm',           'Clientes (CRM)',     'CLIENTES',   '/admin/customers',                  30),
  ('cli.nps',           'Avaliações NPS',     'CLIENTES',   '/admin/feedback',                   31),
  ('mkt.campanhas',     'Campanhas',          'CLIENTES',   '/admin/marketing',                  32),
  ('mkt.analytics',     'Food Analytics',     'CLIENTES',   '/admin/analytics',                  33),
  -- Franquia & Distribuição
  ('fra.pedidos',       'Pedido Insumos',     'FRANQUIA',   '/admin/orders/catalog',             34),
  ('fra.meus-pedidos',  'Meus Pedidos',       'FRANQUIA',   '/admin/orders/history',             35),
  ('mas.cargas',        'Gestão de Cargas',   'FRANQUIA',   '/admin/orders/management',          36),
  ('mas.catalogo',      'Catálogo Insumos',   'FRANQUIA',   '/admin/orders/products',            37),
  ('mas.franqueados',   'Franqueados',        'FRANQUIA',   '/admin/franchisees',                38),
  -- Sistema
  ('sis.config-geral',  'Config. Gerais',     'SISTEMA',    '/admin/settings',                   39),
  ('sis.config-pdv',    'Config. PDV',        'SISTEMA',    '/admin/pdv/configuracoes',          40),
  ('sis.universidade',  'Universidade Grau',  'SISTEMA',    '/admin/universidade',               41),
  ('sis.usuarios',      'Usuários',           'SISTEMA',    '/admin/settings/usuarios',          42)
ON CONFLICT (codigo) DO NOTHING;

-- ── 7. SEED — Permissões MASTER (tudo nível 4) ──────────────────
INSERT INTO rbac_perfil_permissoes (perfil, modulo_codigo, nivel)
SELECT 'MASTER', codigo, 4 FROM rbac_modulos
ON CONFLICT (perfil, modulo_codigo) DO UPDATE SET nivel = 4;

-- ── 8. SEED — Permissões FRANQUEADO ─────────────────────────────
INSERT INTO rbac_perfil_permissoes (perfil, modulo_codigo, nivel) VALUES
  ('FRANQUEADO','pdv.nova-venda',4),('FRANQUEADO','pdv.mesas',4),
  ('FRANQUEADO','pdv.caixa',4),('FRANQUEADO','pdv.historico',3),
  ('FRANQUEADO','op.dashboard',1),('FRANQUEADO','op.pedidos',4),
  ('FRANQUEADO','op.kds',3),('FRANQUEADO','op.entregas',4),
  ('FRANQUEADO','op.areas-entrega',3),
  ('FRANQUEADO','cardapio.cats',4),('FRANQUEADO','cardapio.produtos',4),
  ('FRANQUEADO','cardapio.toppings',4),('FRANQUEADO','cardapio.ingreds',4),
  ('FRANQUEADO','cardapio.promo',4),
  ('FRANQUEADO','fin.dashboard',1),('FRANQUEADO','fin.lancamentos',4),
  ('FRANQUEADO','fin.fluxo-semanal',1),('FRANQUEADO','fin.despesas',4),
  ('FRANQUEADO','fin.fechamentos',1),('FRANQUEADO','fin.dre',1),
  ('FRANQUEADO','fin.receber',3),('FRANQUEADO','fin.cadastros',4),
  ('FRANQUEADO','est.central',4),('FRANQUEADO','est.movimentos',2),
  ('FRANQUEADO','est.contagem',4),('FRANQUEADO','est.cmv',1),
  ('FRANQUEADO','est.compras',3),('FRANQUEADO','est.hist-compras',1),
  ('FRANQUEADO','est.rotinas',4),
  ('FRANQUEADO','cli.crm',3),('FRANQUEADO','cli.nps',3),
  ('FRANQUEADO','mkt.campanhas',4),('FRANQUEADO','mkt.analytics',1),
  ('FRANQUEADO','fra.pedidos',4),('FRANQUEADO','fra.meus-pedidos',3),
  ('FRANQUEADO','mas.cargas',0),('FRANQUEADO','mas.catalogo',0),
  ('FRANQUEADO','mas.franqueados',0),
  ('FRANQUEADO','sis.config-geral',3),('FRANQUEADO','sis.config-pdv',4),
  ('FRANQUEADO','sis.universidade',3),('FRANQUEADO','sis.usuarios',3)
ON CONFLICT (perfil, modulo_codigo) DO UPDATE SET nivel = EXCLUDED.nivel;

-- ── 9. SEED — Permissões COLABORADOR ────────────────────────────
INSERT INTO rbac_perfil_permissoes (perfil, modulo_codigo, nivel) VALUES
  ('COLABORADOR','pdv.nova-venda',4),('COLABORADOR','pdv.mesas',4),
  ('COLABORADOR','pdv.caixa',2),('COLABORADOR','pdv.historico',1),
  ('COLABORADOR','op.dashboard',1),('COLABORADOR','op.pedidos',3),
  ('COLABORADOR','op.kds',3),('COLABORADOR','op.entregas',2),
  ('COLABORADOR','op.areas-entrega',0),
  ('COLABORADOR','cardapio.cats',1),('COLABORADOR','cardapio.produtos',2),
  ('COLABORADOR','cardapio.toppings',1),('COLABORADOR','cardapio.ingreds',1),
  ('COLABORADOR','cardapio.promo',1),
  ('COLABORADOR','fin.dashboard',0),('COLABORADOR','fin.lancamentos',0),
  ('COLABORADOR','fin.fluxo-semanal',0),('COLABORADOR','fin.despesas',0),
  ('COLABORADOR','fin.fechamentos',1),('COLABORADOR','fin.dre',0),
  ('COLABORADOR','fin.receber',0),('COLABORADOR','fin.cadastros',0),
  ('COLABORADOR','est.central',1),('COLABORADOR','est.movimentos',2),
  ('COLABORADOR','est.contagem',2),('COLABORADOR','est.cmv',0),
  ('COLABORADOR','est.compras',1),('COLABORADOR','est.hist-compras',0),
  ('COLABORADOR','est.rotinas',3),
  ('COLABORADOR','cli.crm',2),('COLABORADOR','cli.nps',1),
  ('COLABORADOR','mkt.campanhas',0),('COLABORADOR','mkt.analytics',0),
  ('COLABORADOR','fra.pedidos',1),('COLABORADOR','fra.meus-pedidos',1),
  ('COLABORADOR','mas.cargas',0),('COLABORADOR','mas.catalogo',0),
  ('COLABORADOR','mas.franqueados',0),
  ('COLABORADOR','sis.config-geral',0),('COLABORADOR','sis.config-pdv',1),
  ('COLABORADOR','sis.universidade',3),('COLABORADOR','sis.usuarios',0)
ON CONFLICT (perfil, modulo_codigo) DO UPDATE SET nivel = EXCLUDED.nivel;

-- ── 10. SEED — Usuário Master protegido ──────────────────────────
INSERT INTO user_profiles (id, email, nome, perfil, ativo, is_protected)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', 'Master Admin'),
  'MASTER',
  true,
  true
FROM auth.users au
WHERE au.email = 'agenciadamkt@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  perfil = 'MASTER',
  is_protected = true,
  ativo = true;

-- ── 11. Migração — usuários existentes ──────────────────────────
-- Cria perfis para todos os usuários existentes que ainda não têm
INSERT INTO user_profiles (id, email, nome, perfil, ativo)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email,'@',1)),
  CASE
    WHEN ur.role = 'franchisee_master' THEN 'MASTER'
    WHEN ur.role IN ('admin','manager')  THEN 'FRANQUEADO'
    ELSE 'COLABORADOR'
  END,
  true
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
WHERE au.email != 'agenciadamkt@gmail.com'
ON CONFLICT (id) DO NOTHING;
