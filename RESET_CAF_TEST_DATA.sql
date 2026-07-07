-- ============================================================
-- RESET DADOS DE TESTE — CAF Central de Atendimento
-- Apaga todos os atendimentos, histórico e avaliações de teste
-- e reinicia o contador de protocolo do zero.
-- ============================================================
-- ⚠️  AÇÃO IRREVERSÍVEL — execute somente no ambiente correto.
-- ============================================================

-- 1. Histórico de eventos (FK → caf_atendimentos ON DELETE CASCADE)
DELETE FROM public.caf_historico;

-- 2. Avaliações de satisfação (FK → caf_atendimentos ON DELETE CASCADE)
DELETE FROM public.caf_satisfacao;

-- 3. Todos os atendimentos
DELETE FROM public.caf_atendimentos;

-- 4. Reinicia a sequence de protocolo → próximo será AT-2026-000001
ALTER SEQUENCE public.caf_protocolo_seq RESTART WITH 1;

-- Confirma o estado final
SELECT
  'caf_atendimentos' AS tabela, COUNT(*) AS registros FROM public.caf_atendimentos
UNION ALL
SELECT 'caf_satisfacao',  COUNT(*) FROM public.caf_satisfacao
UNION ALL
SELECT 'caf_historico',   COUNT(*) FROM public.caf_historico
UNION ALL
SELECT 'proximo_protocolo', last_value FROM public.caf_protocolo_seq;
