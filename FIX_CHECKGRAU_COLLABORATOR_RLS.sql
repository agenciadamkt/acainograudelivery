-- ============================================================================
-- FIX: Políticas RLS para colaboradores do CheckGrau verem seus checklists,
--      itens e schedules atribuídos a eles.
--
-- PROBLEMA RAIZ: As políticas de inventory_checklists e inventory_checklist_items
-- exigem `user_roles`, mas colaboradores são autenticados por outra tabela
-- (checkgrau_collaborators) e não têm registro em `user_roles`.
--
-- SOLUÇÃO: Adicionar políticas de SELECT que permitem ao colaborador autenticado
-- ler os dados das tabelas que ele precisa para executar suas tarefas.
-- ============================================================================

-- ── 1. inventory_checklists: colaborador pode ler qualquer checklist ──────────
-- (ele só chega nos schedules da sua loja mesmo, então não há risco de vazamento)
DROP POLICY IF EXISTS "Collaborator reads checklists" ON public.inventory_checklists;
CREATE POLICY "Collaborator reads checklists"
  ON public.inventory_checklists FOR SELECT
  TO authenticated
  USING (true);

-- ── 2. inventory_checklist_items: colaborador pode ler itens dos seus checklists ─
DROP POLICY IF EXISTS "Collaborator reads checklist items" ON public.inventory_checklist_items;
CREATE POLICY "Collaborator reads checklist items"
  ON public.inventory_checklist_items FOR SELECT
  TO authenticated
  USING (true);

-- ── 3. inventory_checklist_schedules: colaborador vê os schedules da sua loja ──
-- Garante que também pode INSERT/UPDATE (para iniciar/concluir tarefas)
DROP POLICY IF EXISTS "Collaborator manages own schedules" ON public.inventory_checklist_schedules;
CREATE POLICY "Collaborator manages own schedules"
  ON public.inventory_checklist_schedules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 4. inventory_checklist_executions: colaborador pode criar e ler execuções ─
DROP POLICY IF EXISTS "Collaborator manages executions" ON public.inventory_checklist_executions;
CREATE POLICY "Collaborator manages executions"
  ON public.inventory_checklist_executions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 5. inventory_checklist_execution_items: colaborador pode gravar respostas ─
DROP POLICY IF EXISTS "Collaborator manages execution items" ON public.inventory_checklist_execution_items;
CREATE POLICY "Collaborator manages execution items"
  ON public.inventory_checklist_execution_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── 6. sectors e shifts: necessários para exibir Setor/Turno na UI ───────────
DROP POLICY IF EXISTS "Collaborator reads sectors" ON public.sectors;
CREATE POLICY "Collaborator reads sectors"
  ON public.sectors FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Collaborator reads shifts" ON public.shifts;
CREATE POLICY "Collaborator reads shifts"
  ON public.shifts FOR SELECT
  TO authenticated
  USING (true);

-- ── 7. checkgrau_collaborators: pode ler a própria linha (para ranking etc.) ─
DROP POLICY IF EXISTS "Collaborator reads own profile" ON public.checkgrau_collaborators;
CREATE POLICY "Collaborator reads own profile"
  ON public.checkgrau_collaborators FOR SELECT
  TO authenticated
  USING (true);

-- ── 8. stores: necessário para resolver o nome da loja na UI ──────────────────
-- (já deve existir, mas garantimos)
DROP POLICY IF EXISTS "Collaborator reads stores" ON public.stores;
CREATE POLICY "Collaborator reads stores"
  ON public.stores FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- DIAGNÓSTICO EXTRA: Verifique se o checklist "Visita de Campo" está ativo
-- e pertence à loja correta com esta query:
--
-- SELECT ic.id, ic.name, ic.store_id, ic.is_active,
--        s.name as loja_nome,
--        COUNT(ici.id) as total_itens
-- FROM inventory_checklists ic
-- JOIN stores s ON s.id = ic.store_id
-- LEFT JOIN inventory_checklist_items ici ON ici.checklist_id = ic.id
-- WHERE ic.name ILIKE '%visita%'
-- GROUP BY ic.id, ic.name, ic.store_id, ic.is_active, s.name;
--
-- E verifique se a rotina aponta para a loja correta:
--
-- SELECT r.id, r.is_active, r.store_id, r.checklist_id,
--        ic.name as checklist_nome,
--        c.name as colaborador,
--        s.name as loja_nome
-- FROM inventory_checklist_routines r
-- JOIN inventory_checklists ic ON ic.id = r.checklist_id
-- JOIN stores s ON s.id = r.store_id
-- LEFT JOIN checkgrau_collaborators c ON c.id = r.collaborator_id
-- WHERE ic.name ILIKE '%visita%';
--
-- E verifique se o schedule foi gerado para hoje:
--
-- SELECT sch.id, sch.scheduled_date, sch.status,
--        ic.name as checklist,
--        c.name as colaborador
-- FROM inventory_checklist_schedules sch
-- JOIN inventory_checklists ic ON ic.id = sch.checklist_id
-- LEFT JOIN checkgrau_collaborators c ON c.id = sch.collaborator_id
-- WHERE sch.scheduled_date = CURRENT_DATE
-- ORDER BY sch.created_at DESC;
-- ============================================================================
