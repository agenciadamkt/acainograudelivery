-- ═══════════════════════════════════════════════════════════════════════════
-- RBAC — Registra no banco (rbac_modulos) os módulos novos que já existem no
-- front (permissions.ts): CheckGrau (14) + Recibos de Baixas.
--
-- Sem isto, salvar permissões falha com:
--   violates foreign key constraint "rbac_usuario_permissoes_modulo_codigo_fkey"
-- porque o modulo_codigo referencia rbac_modulos(codigo).
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO rbac_modulos (codigo, nome, categoria, rota, ordem, descricao) VALUES
  ('fin.recibos',              'Recibos de Baixas',      'FINANCEIRO', '/admin/financeiro/recibos',              59, 'Importa baixas do Cefas e gera recibos de quitação'),
  ('cg.painel',                'Painel Operacional',     'CHECKGRAU',  '/admin/checkgrau',                       60, 'KPIs, conformidade e score da operação'),
  ('cg.rankings',              'Rankings',               'CHECKGRAU',  '/admin/checkgrau/rankings',              61, 'Ranking de unidades por desempenho'),
  ('cg.desempenho',            'Desempenho',             'CHECKGRAU',  '/admin/checkgrau/desempenho',            62, 'Desempenho e score por colaborador'),
  ('cg.rede',                  'Rede',                   'CHECKGRAU',  '/admin/checkgrau/rede',                  63, 'Visão consolidada da rede'),
  ('cg.alertas',               'Alertas',                'CHECKGRAU',  '/admin/checkgrau/alertas',               64, 'Alertas operacionais e no WhatsApp'),
  ('cg.mensagens',             'Mensagens',              'CHECKGRAU',  '/admin/checkgrau/mensagens',             65, 'Avisos do gestor para os colaboradores'),
  ('cg.lojas',                 'Lojas',                  'CHECKGRAU',  '/admin/checkgrau/stores',                66, 'Cadastro de unidades do CheckGrau'),
  ('cg.colaboradores',         'Colaboradores',          'CHECKGRAU',  '/admin/checkgrau/collaborators',         67, 'Cadastro de colaboradores e acessos'),
  ('cg.agenda',                'Agenda',                 'CHECKGRAU',  '/admin/checkgrau/agenda',                68, 'Agenda diária de tarefas por unidade'),
  ('cg.rotinas',               'Rotinas',                'CHECKGRAU',  '/admin/checkgrau/rotinas',               69, 'Rotinas que geram a agenda de tarefas'),
  ('cg.checklists',            'Checklists',             'CHECKGRAU',  '/admin/checkgrau/checklists',            70, 'Modelos de checklist e perguntas'),
  ('cg.setores-turnos',        'Setores & Turnos',       'CHECKGRAU',  '/admin/checkgrau/setores-turnos',        71, 'Setores e turnos operacionais'),
  ('cg.grupos-contagem',       'Grupos de Contagem',     'CHECKGRAU',  '/admin/checkgrau/grupos-contagem',       72, 'Grupos de insumos para contagem'),
  ('cg.contagens-recorrentes', 'Contagens Recorrentes',  'CHECKGRAU',  '/admin/checkgrau/contagens-recorrentes', 73, 'Inventários agendados e recorrentes')
ON CONFLICT (codigo) DO NOTHING;

-- ── Permissões padrão por perfil ────────────────────────────────────────────
-- MASTER: acesso total em todos os novos módulos.
INSERT INTO rbac_perfil_permissoes (perfil, modulo_codigo, nivel)
SELECT 'MASTER', codigo, 4 FROM rbac_modulos
WHERE codigo IN (
  'fin.recibos','cg.painel','cg.rankings','cg.desempenho','cg.rede','cg.alertas',
  'cg.mensagens','cg.lojas','cg.colaboradores','cg.agenda','cg.rotinas','cg.checklists',
  'cg.setores-turnos','cg.grupos-contagem','cg.contagens-recorrentes'
)
ON CONFLICT (perfil, modulo_codigo) DO UPDATE SET nivel = 4;

-- FRANQUEADO: acesso operacional (edição) aos módulos do CheckGrau + Recibos.
INSERT INTO rbac_perfil_permissoes (perfil, modulo_codigo, nivel)
SELECT 'FRANQUEADO', codigo, 3 FROM rbac_modulos
WHERE codigo IN (
  'fin.recibos','cg.painel','cg.rankings','cg.desempenho','cg.rede','cg.alertas',
  'cg.mensagens','cg.lojas','cg.colaboradores','cg.agenda','cg.rotinas','cg.checklists',
  'cg.setores-turnos','cg.grupos-contagem','cg.contagens-recorrentes'
)
ON CONFLICT (perfil, modulo_codigo) DO UPDATE SET nivel = 3;
