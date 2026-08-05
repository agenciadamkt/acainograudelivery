-- ============================================================================
-- Correções e Melhorias na Gestão de Agendas e Execução de Checklists
-- ============================================================================

-- 1. Remoção de duplicados na tabela de respostas por item de execução
DELETE FROM public.inventory_checklist_execution_items a
USING public.inventory_checklist_execution_items b
WHERE a.id < b.id
  AND a.execution_id = b.execution_id
  AND a.item_id = b.item_id;

-- 2. Adiciona constraint UNIQUE para (execution_id, item_id) permitindo UPSERT atômico
ALTER TABLE public.inventory_checklist_execution_items
  DROP CONSTRAINT IF EXISTS unique_exec_item,
  ADD CONSTRAINT unique_exec_item UNIQUE (execution_id, item_id);

-- 3. Remoção de duplicados na tabela de evidências
DELETE FROM public.checklist_evidences a
USING public.checklist_evidences b
WHERE a.id < b.id
  AND a.execution_item_id = b.execution_item_id;

-- 4. Adiciona constraint UNIQUE para execution_item_id em checklist_evidences
ALTER TABLE public.checklist_evidences
  DROP CONSTRAINT IF EXISTS unique_evidence_exec_item,
  ADD CONSTRAINT unique_evidence_exec_item UNIQUE (execution_item_id);
