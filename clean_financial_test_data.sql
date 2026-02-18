-- Script para limpar dados de teste do módulo financeiro
-- Executar no SQL Editor do Supabase

-- 1. Limpar Auditoria (Logs de alterações nos lançamentos)
-- Importante limpar antes ou junto para manter consistência, embora FKs geralmente resolvam.
DELETE FROM financial_audit_logs;

-- 2. Limpar Fechamentos de Caixa (Fluxo)
DELETE FROM cash_closings;

-- 3. Limpar Lançamentos Financeiros (Fluxo de Caixa Diário)
DELETE FROM financial_records;

-- 4. Limpar Despesas
DELETE FROM expenses;

-- Confirmação
SELECT 'Dados de teste removidos com sucesso (Lançamentos, Fechamentos, Despesas e Logs).' as result;
