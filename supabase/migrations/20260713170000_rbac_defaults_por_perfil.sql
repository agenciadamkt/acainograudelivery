-- ============================================================================
-- RBAC — Defaults de permissão por PERFIL (blindagem contra lockout)
-- Agora que as rotas são 100% RBAC, garante que FRANQUEADO e COLABORADOR
-- tenham acesso-padrão aos módulos que usam. MASTER não precisa (can()=4).
-- Idempotente: ON CONFLICT DO NOTHING preserva qualquer ajuste manual já feito.
-- ============================================================================

-- ── FRANQUEADO (dono da unidade) — acesso total à operação da própria loja ──
-- Operacional / financeiro / estoque / cardápio / PDV → nível 4
INSERT INTO public.rbac_perfil_permissoes (perfil, modulo_codigo, nivel)
SELECT 'FRANQUEADO', codigo, 4 FROM public.rbac_modulos
WHERE categoria IN ('PDV', 'OPERACAO', 'CARDAPIO', 'FINANCEIRO', 'ESTOQUE', 'CLIENTES')
ON CONFLICT (perfil, modulo_codigo) DO NOTHING;

-- CAF → nível 3 (abre e acompanha chamados)
INSERT INTO public.rbac_perfil_permissoes (perfil, modulo_codigo, nivel)
SELECT 'FRANQUEADO', codigo, 3 FROM public.rbac_modulos
WHERE categoria = 'CAF'
ON CONFLICT (perfil, modulo_codigo) DO NOTHING;

-- Franquia (pedidos de insumos) e Sistema (seletivo) — mas.* fica de fora (franqueadora)
INSERT INTO public.rbac_perfil_permissoes (perfil, modulo_codigo, nivel) VALUES
  ('FRANQUEADO', 'fra.pedidos',      4),
  ('FRANQUEADO', 'fra.meus-pedidos', 4),
  ('FRANQUEADO', 'sis.config-geral', 4),
  ('FRANQUEADO', 'sis.config-pdv',   4),
  ('FRANQUEADO', 'sis.usuarios',     3),
  ('FRANQUEADO', 'sis.uazapi',       3),
  ('FRANQUEADO', 'sis.assistente',   3),
  ('FRANQUEADO', 'sis.universidade', 2),
  ('FRANQUEADO', 'sis.grauzinho',    2)
ON CONFLICT (perfil, modulo_codigo) DO NOTHING;

-- ── COLABORADOR (staff) — baseline operacional do dia a dia ──────────────────
INSERT INTO public.rbac_perfil_permissoes (perfil, modulo_codigo, nivel) VALUES
  -- PDV
  ('COLABORADOR', 'pdv.nova-venda',   4),
  ('COLABORADOR', 'pdv.mesas',        4),
  ('COLABORADOR', 'pdv.caixa',        4),
  ('COLABORADOR', 'pdv.historico',    2),
  -- Operação
  ('COLABORADOR', 'op.dashboard',     1),
  ('COLABORADOR', 'op.pedidos',       3),
  ('COLABORADOR', 'op.kds',           3),
  ('COLABORADOR', 'op.entregas',      3),
  ('COLABORADOR', 'op.areas-entrega', 1),
  ('COLABORADOR', 'op.agenda',        2),
  ('COLABORADOR', 'op.performance',   1),
  -- Cardápio (visualização)
  ('COLABORADOR', 'cardapio.cats',     1),
  ('COLABORADOR', 'cardapio.produtos', 1),
  ('COLABORADOR', 'cardapio.toppings', 1),
  ('COLABORADOR', 'cardapio.ingreds',  1),
  ('COLABORADOR', 'cardapio.promo',    1),
  -- Estoque (operacional)
  ('COLABORADOR', 'est.central',      1),
  ('COLABORADOR', 'est.movimentos',   2),
  ('COLABORADOR', 'est.contagem',     3),
  ('COLABORADOR', 'est.compras',      1),
  ('COLABORADOR', 'est.hist-compras', 1),
  ('COLABORADOR', 'est.rotinas',      3),
  ('COLABORADOR', 'est.bonificacoes', 1),
  -- Clientes (visualização)
  ('COLABORADOR', 'cli.crm',          1),
  ('COLABORADOR', 'cli.nps',          1),
  ('COLABORADOR', 'cli.comunidade',   1),
  -- CAF
  ('COLABORADOR', 'caf.dashboard',        1),
  ('COLABORADOR', 'caf.atendimentos',     2),
  ('COLABORADOR', 'caf.base-conhecimento',1),
  -- Sistema (visualização)
  ('COLABORADOR', 'sis.universidade', 2),
  ('COLABORADOR', 'sis.grauzinho',    1),
  ('COLABORADOR', 'sis.assistente',   2)
ON CONFLICT (perfil, modulo_codigo) DO NOTHING;
