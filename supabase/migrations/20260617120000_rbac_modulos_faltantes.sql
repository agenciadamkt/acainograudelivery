-- ═══════════════════════════════════════════════════════════════
-- RBAC — Adiciona módulos que existem no frontend (permissions.ts)
-- mas nunca foram inseridos em rbac_modulos.
--
-- Sintoma: ao salvar permissões de usuário, insert em
-- rbac_usuario_permissoes falhava com
-- "violates foreign key constraint rbac_usuario_permissoes_modulo_codigo_fkey"
-- porque o código do módulo (ex: caf.dashboard, sis.uazapi) não
-- existia em rbac_modulos.
-- ═══════════════════════════════════════════════════════════════

INSERT INTO rbac_modulos (codigo, nome, categoria, rota, ordem) VALUES
  ('op.frota',            'Frota',                  'OPERACAO', '/admin/delivery/frota',           43),
  ('est.bonificacoes',    'Bonificações',            'ESTOQUE',  '/admin/stock/bonificacoes',        44),
  ('cli.comunidade',      'Comunidade',              'CLIENTES', '/admin/comunidade',                45),
  ('caf.dashboard',       'Dashboard CAF',           'CAF',      '/admin/caf',                       46),
  ('caf.atendimentos',    'Atendimentos',            'CAF',      '/admin/caf/atendimentos',          47),
  ('caf.base-conhecimento','Base de Conhecimento',   'CAF',      '/admin/caf/base-conhecimento',     48),
  ('caf.relatorios',      'Relatórios CAF',          'CAF',      '/admin/caf/relatorios',             49),
  ('caf.cadastros',       'Cadastros CAF',           'CAF',      '/admin/caf/cadastros',              50),
  ('sis.uazapi',          'UazAPI / WhatsApp',       'SISTEMA',  '/admin/settings/uazapi',            51),
  ('sis.grauzinho',       'Grauzinho',               'SISTEMA',  '/admin/grauzinho',                  52)
ON CONFLICT (codigo) DO NOTHING;

-- Permissões padrão MASTER (acesso total nos novos módulos)
INSERT INTO rbac_perfil_permissoes (perfil, modulo_codigo, nivel)
SELECT 'MASTER', codigo, 4 FROM rbac_modulos
WHERE codigo IN (
  'op.frota','est.bonificacoes','cli.comunidade','caf.dashboard',
  'caf.atendimentos','caf.base-conhecimento','caf.relatorios',
  'caf.cadastros','sis.uazapi','sis.grauzinho'
)
ON CONFLICT (perfil, modulo_codigo) DO UPDATE SET nivel = 4;

-- Permissões padrão FRANQUEADO
INSERT INTO rbac_perfil_permissoes (perfil, modulo_codigo, nivel) VALUES
  ('FRANQUEADO','op.frota',3),
  ('FRANQUEADO','est.bonificacoes',3),
  ('FRANQUEADO','cli.comunidade',2),
  ('FRANQUEADO','caf.dashboard',2),
  ('FRANQUEADO','caf.atendimentos',4),
  ('FRANQUEADO','caf.base-conhecimento',3),
  ('FRANQUEADO','caf.relatorios',1),
  ('FRANQUEADO','caf.cadastros',1),
  ('FRANQUEADO','sis.uazapi',3),
  ('FRANQUEADO','sis.grauzinho',1)
ON CONFLICT (perfil, modulo_codigo) DO UPDATE SET nivel = EXCLUDED.nivel;

-- Permissões padrão COLABORADOR
INSERT INTO rbac_perfil_permissoes (perfil, modulo_codigo, nivel) VALUES
  ('COLABORADOR','op.frota',1),
  ('COLABORADOR','est.bonificacoes',1),
  ('COLABORADOR','cli.comunidade',1),
  ('COLABORADOR','caf.dashboard',0),
  ('COLABORADOR','caf.atendimentos',2),
  ('COLABORADOR','caf.base-conhecimento',1),
  ('COLABORADOR','caf.relatorios',0),
  ('COLABORADOR','caf.cadastros',0),
  ('COLABORADOR','sis.uazapi',0),
  ('COLABORADOR','sis.grauzinho',0)
ON CONFLICT (perfil, modulo_codigo) DO UPDATE SET nivel = EXCLUDED.nivel;
