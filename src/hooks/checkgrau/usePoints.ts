/**
 * Pontos CheckGrau — premiação idempotente por execução e leitura do acumulado
 * do colaborador (para o card "Meu Score" / ranking).
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AwardInput {
  executionId: string;
  collaboratorId?: string | null;
  storeId?: string | null;
  points: number;
  reason: string;
}

/** Concede os pontos da execução (uma única vez) e devolve o valor efetivo. */
export function useAwardPoints() {
  return useMutation({
    mutationFn: async (v: AwardInput): Promise<number> => {
      await (supabase as any).from('checkgrau_points').upsert(
        [{
          execution_id: v.executionId,
          collaborator_id: v.collaboratorId ?? null,
          store_id: v.storeId ?? null,
          points: v.points,
          reason: v.reason,
        }],
        { onConflict: 'execution_id', ignoreDuplicates: true },
      );
      const { data } = await (supabase as any)
        .from('checkgrau_points').select('points').eq('execution_id', v.executionId).maybeSingle();
      return data?.points ?? v.points;
    },
  });
}

/** Total de pontos acumulados por um colaborador. */
export function useCollaboratorPoints(collaboratorId: string | undefined) {
  return useQuery({
    queryKey: ['cg_points_total', collaboratorId],
    enabled: !!collaboratorId,
    queryFn: async (): Promise<number> => {
      const { data } = await (supabase as any)
        .from('checkgrau_points').select('points').eq('collaborator_id', collaboratorId);
      return ((data ?? []) as { points: number }[]).reduce((s, r) => s + (r.points ?? 0), 0);
    },
  });
}
