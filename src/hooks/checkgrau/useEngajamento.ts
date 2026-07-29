/**
 * Engajamento do CheckGrau: mede o quanto a equipe realmente usa o app/checklists.
 * Deriva funil da jornada, KPIs de adoção, heatmap por dia da semana e
 * colaboradores em risco — a partir de colaboradores + execuções concluídas.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FunnelStep { label: string; count: number; pct: number }
export interface HeatRow { label: string; values: number[] } // 7 valores: Seg..Dom
export interface AtRiskItem { id: string; name: string; cargo: string; lastDays: number | null } // null = nunca

export interface EngajamentoData {
  kpis: {
    totalAtivos: number;
    acessaram: number;      // já logaram alguma vez
    taxaAtivacao: number;   // % acessaram / ativos
    ativos7: number;        // execução nos últimos 7 dias
    taxaAtivos7: number;    // %
    execucoes: number;      // no período
    mediaPorColaborador: number;
  };
  funnel: FunnelStep[];
  heat: HeatRow[];
  heatMax: number;
  atRisk: AtRiskItem[];
}

const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Seg..Dom (getDay: 0=Dom)

export function useEngajamento(storeIds: string[], days: number) {
  return useQuery({
    queryKey: ['cg_engajamento', storeIds, days],
    enabled: storeIds.length > 0,
    queryFn: async (): Promise<EngajamentoData> => {
      const now = Date.now();
      const periodStart = new Date(now - days * 86400000).toISOString();
      const start7 = now - 7 * 86400000;

      // colaboradores das lojas selecionadas
      const { data: links } = await (supabase as any)
        .from('checkgrau_collaborator_stores').select('collaborator_id').in('store_id', storeIds);
      const collabIds = Array.from(new Set(((links ?? []) as any[]).map((l) => l.collaborator_id))).filter(Boolean);

      let collabs: any[] = [];
      if (collabIds.length > 0) {
        const { data } = await (supabase as any)
          .from('checkgrau_collaborators')
          .select('id, name, cargo, status, auth_user_id')
          .in('id', collabIds);
        collabs = (data ?? []) as any[];
      }
      const ativos = collabs.filter((c) => c.status === 'ativo');

      // execuções concluídas no período (nas lojas)
      const { data: execs } = await (supabase as any)
        .from('inventory_checklist_executions')
        .select('completed_by, completed_at, schedule:inventory_checklist_schedules(shift:shifts(name))')
        .in('store_id', storeIds)
        .not('completed_at', 'is', null)
        .gte('completed_at', periodStart)
        .limit(5000);
      const rows = (execs ?? []) as any[];

      // atividade por usuário (completed_by = auth_user_id)
      const byUser = new Map<string, { count: number; last: number }>();
      for (const r of rows) {
        if (!r.completed_by) continue;
        const t = new Date(r.completed_at).getTime();
        const cur = byUser.get(r.completed_by) ?? { count: 0, last: 0 };
        cur.count++; cur.last = Math.max(cur.last, t);
        byUser.set(r.completed_by, cur);
      }

      const acessaram = ativos.filter((c) => !!c.auth_user_id).length;
      const executaram = ativos.filter((c) => c.auth_user_id && byUser.has(c.auth_user_id)).length;
      const ativos7 = ativos.filter((c) => c.auth_user_id && (byUser.get(c.auth_user_id)?.last ?? 0) >= start7).length;

      const total = ativos.length;
      const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
      const funnel: FunnelStep[] = [
        { label: 'Cadastrados', count: total, pct: 100 },
        { label: 'Já acessaram o app', count: acessaram, pct: pct(acessaram) },
        { label: 'Executaram checklist', count: executaram, pct: pct(executaram) },
        { label: 'Ativos (7 dias)', count: ativos7, pct: pct(ativos7) },
      ];

      // heatmap: turno × dia da semana (contagem de execuções)
      const heatMap = new Map<string, number[]>();
      let heatMax = 0;
      for (const r of rows) {
        const shift = r.schedule?.shift?.name ?? 'Geral';
        const wd = new Date(r.completed_at).getDay();
        const col = WEEK.indexOf(wd);
        if (col < 0) continue;
        const arr = heatMap.get(shift) ?? [0, 0, 0, 0, 0, 0, 0];
        arr[col]++; heatMax = Math.max(heatMax, arr[col]);
        heatMap.set(shift, arr);
      }
      const heat: HeatRow[] = Array.from(heatMap.entries()).map(([label, values]) => ({ label, values }));

      // colaboradores em risco: ativos que acessaram mas sem execução nos últimos 7 dias
      const atRisk: AtRiskItem[] = ativos
        .filter((c) => c.auth_user_id) // já acessaram (senão nem entraram)
        .map((c) => {
          const last = byUser.get(c.auth_user_id)?.last ?? 0;
          return { c, last };
        })
        .filter(({ last }) => last < start7)
        .sort((a, b) => a.last - b.last)
        .slice(0, 12)
        .map(({ c, last }) => ({
          id: c.id, name: c.name, cargo: c.cargo,
          lastDays: last > 0 ? Math.floor((now - last) / 86400000) : null,
        }));

      return {
        kpis: {
          totalAtivos: total,
          acessaram,
          taxaAtivacao: pct(acessaram),
          ativos7,
          taxaAtivos7: pct(ativos7),
          execucoes: rows.length,
          mediaPorColaborador: executaram > 0 ? Math.round((rows.length / executaram) * 10) / 10 : 0,
        },
        funnel,
        heat,
        heatMax: heatMax || 1,
        atRisk,
      };
    },
  });
}
