/**
 * Ranking CheckGrau da loja (app do colaborador): soma os pontos por colaborador
 * a partir de `checkgrau_points` e ordena. Agrega no cliente (volume pequeno).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RankRow {
  collaboratorId: string;
  name: string;
  points: number;
  position: number; // 1-based
}

export function useCheckgrauRanking(storeId: string | undefined) {
  return useQuery({
    queryKey: ['cg_ranking', storeId],
    enabled: !!storeId,
    queryFn: async (): Promise<RankRow[]> => {
      const { data, error } = await (supabase as any)
        .from('checkgrau_points')
        .select('points, collaborator_id, collaborator:checkgrau_collaborators(name)')
        .eq('store_id', storeId);
      if (error) throw error;

      const byCollab = new Map<string, { name: string; points: number }>();
      for (const r of (data ?? []) as any[]) {
        const id = r.collaborator_id;
        if (!id) continue;
        const cur = byCollab.get(id) ?? { name: r.collaborator?.name ?? 'Colaborador', points: 0 };
        cur.points += r.points ?? 0;
        byCollab.set(id, cur);
      }

      return Array.from(byCollab.entries())
        .map(([collaboratorId, v]) => ({ collaboratorId, name: v.name, points: v.points }))
        .sort((a, b) => b.points - a.points)
        .map((row, i) => ({ ...row, position: i + 1 }));
    },
  });
}
