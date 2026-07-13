-- ============================================================================
-- RBAC — Módulos do Hub que faltavam na matriz de permissões:
--   Agenda, Performance, Assistente IA e o novo módulo Fiscal.
-- Sem eles não apareciam para marcar nível de permissão por usuário/perfil.
-- Idempotente.
-- ============================================================================
INSERT INTO public.rbac_modulos (codigo, nome, categoria, rota, descricao) VALUES
  ('op.agenda',      'Agenda',                  'OPERACAO',   '/admin/agenda',   'Calendário e compromissos'),
  ('op.performance', 'Performance',             'OPERACAO',   '/admin/performance', 'Métricas e ranking da unidade'),
  ('fin.fiscal',     'Fiscal (NFC-e / NF-e)',   'FINANCEIRO', '/admin/fiscal',   'Emissão de notas fiscais (PlugNotas)'),
  ('sis.assistente', 'Assistente IA (GrauBot)', 'SISTEMA',    '/admin/assistente', 'Assistente inteligente 24/7')
ON CONFLICT (codigo) DO NOTHING;

-- Acesso total padrão para o perfil MASTER nos novos módulos
INSERT INTO public.rbac_perfil_permissoes (perfil, modulo_codigo, nivel)
SELECT 'MASTER', codigo, 4 FROM public.rbac_modulos
WHERE codigo IN ('op.agenda', 'op.performance', 'fin.fiscal', 'sis.assistente')
ON CONFLICT (perfil, modulo_codigo) DO UPDATE SET nivel = 4;
