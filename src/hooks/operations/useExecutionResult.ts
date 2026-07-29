/**
 * Resultado de uma execução concluída (leitura): respostas por item, evidências
 * (fotos/GPS) e quem executou. Usado na visualização da tarefa concluída.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Evidence {
  photo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  captured_at: string | null;
}

export interface ResultItem {
  id: string;
  item_name: string;
  item_type: string;
  value_boolean: boolean | null;
  value_number: number | null;
  value_text: string | null;
  value_json: unknown | null;
  comment: string | null;
  signature: string | null;
  passed: boolean | null;
  photo_url: string | null;
  evidences: Evidence[];
}

export interface ExecutionResult {
  items: ResultItem[];
  executor: string | null; // nome do colaborador que concluiu
}

export function useExecutionResult(executionId: string | undefined, completedBy?: string | null) {
  return useQuery({
    queryKey: ['op_exec_result', executionId],
    enabled: !!executionId,
    queryFn: async (): Promise<ExecutionResult> => {
      const { data, error } = await (supabase as any)
        .from('inventory_checklist_execution_items')
        .select(
          'id, value_boolean, value_number, value_text, value_json, comment, signature, passed, photo_url, ' +
            'item:inventory_checklist_items(name, type), ' +
            'evidences:checklist_evidences(photo_url, latitude, longitude, captured_at)',
        )
        .eq('execution_id', executionId);
      if (error) throw error;

      const items: ResultItem[] = ((data ?? []) as any[]).map((r) => ({
        id: r.id,
        item_name: r.item?.name ?? 'Item',
        item_type: r.item?.type ?? '',
        value_boolean: r.value_boolean,
        value_number: r.value_number,
        value_text: r.value_text,
        value_json: r.value_json,
        comment: r.comment,
        signature: r.signature,
        passed: r.passed,
        photo_url: r.photo_url,
        evidences: (r.evidences ?? []) as Evidence[],
      }));

      // quem executou (completed_by = auth_user_id do colaborador)
      let executor: string | null = null;
      if (completedBy) {
        const { data: collab } = await (supabase as any)
          .from('checkgrau_collaborators').select('name').eq('auth_user_id', completedBy).maybeSingle();
        executor = collab?.name ?? null;
      }

      return { items, executor };
    },
  });
}
