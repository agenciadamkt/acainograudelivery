-- ═══════════════════════════════════════════════════════════════════════════
-- FIX pontual — Rotina da Luana criada na loja errada
--
-- Sintoma: a colaboradora Luana Sabino (id bc83ec5c-…) não via as tarefas dela
-- no app, mesmo com a agenda gerada.
-- Causa: a rotina foi atribuída à Luana mas criada na loja
--   "Açaí no Grau - Gurupi / Teresina"  (befa8cca-5ba0-492b-9005-e99041f7921f)
-- enquanto a Luana está vinculada a
--   "Distribuidora Açaí no Grau [Teresina]" (8339b2c8-2edd-4d5a-b0c5-b8f0c521caa6).
-- O app do colaborador lista tarefas POR LOJA (a da própria pessoa), então a
-- tarefa ficava "presa" em Gurupi e nunca aparecia para ela.
--
-- Este script move a(s) rotina(s) da Luana + as tarefas (schedules) já geradas
-- para a loja correta. O checklist só é movido se NÃO for usado por rotinas de
-- outra loja (para não afetar Gurupi). Idempotente.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_collab uuid := 'bc83ec5c-1bd0-4435-b1c7-9d5e56c3ae1d'; -- Luana Sabino
  v_dest   uuid := '8339b2c8-2edd-4d5a-b0c5-b8f0c521caa6'; -- Distribuidora [Teresina]
  v_ck     uuid;
  v_shared int;
  v_rotinas int;
  v_tarefas int;
BEGIN
  -- checklist referenciado pela rotina da Luana (para avaliar se pode ser movido)
  SELECT checklist_id INTO v_ck
  FROM public.inventory_checklist_routines
  WHERE collaborator_id = v_collab
  LIMIT 1;

  -- 1) move a(s) rotina(s) da Luana para a loja certa
  UPDATE public.inventory_checklist_routines
  SET store_id = v_dest, updated_at = now()
  WHERE collaborator_id = v_collab
    AND store_id IS DISTINCT FROM v_dest;
  GET DIAGNOSTICS v_rotinas = ROW_COUNT;

  -- 2) move as tarefas (schedules) já geradas por essas rotinas
  UPDATE public.inventory_checklist_schedules s
  SET store_id = v_dest
  WHERE s.routine_id IN (
        SELECT id FROM public.inventory_checklist_routines WHERE collaborator_id = v_collab
      )
    AND s.store_id IS DISTINCT FROM v_dest;
  GET DIAGNOSTICS v_tarefas = ROW_COUNT;

  -- 3) move o checklist SOMENTE se ele não for usado por rotinas de outra loja
  IF v_ck IS NOT NULL THEN
    SELECT count(*) INTO v_shared
    FROM public.inventory_checklist_routines
    WHERE checklist_id = v_ck
      AND store_id <> v_dest;   -- rotinas da Luana já estão em v_dest neste ponto
    IF v_shared = 0 THEN
      UPDATE public.inventory_checklists SET store_id = v_dest WHERE id = v_ck;
    END IF;
  END IF;

  RAISE NOTICE 'Rotinas movidas: %, Tarefas movidas: %, Checklist compartilhado: %',
    v_rotinas, v_tarefas, (v_shared IS NOT NULL AND v_shared > 0);
END $$;

-- Conferência (opcional): a agenda de hoje deve aparecer agora na Distribuidora
-- SELECT st.name AS loja, s.scheduled_date, c.name AS atribuida_para, count(*)
-- FROM inventory_checklist_schedules s
-- JOIN stores st ON st.id = s.store_id
-- LEFT JOIN checkgrau_collaborators c ON c.id = s.collaborator_id
-- WHERE s.scheduled_date = current_date AND c.id = 'bc83ec5c-1bd0-4435-b1c7-9d5e56c3ae1d'
-- GROUP BY 1,2,3;
