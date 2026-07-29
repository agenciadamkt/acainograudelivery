/**
 * Métricas por colaborador do CheckGrau (para a lista rica + modal de detalhe):
 * pontos, engajamento (média de SLA), último acesso, uso por checklist,
 * atividade recente, tendência semanal e alertas automáticos.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCollaborators, type Collaborator } from './useCollaborators';

export interface PersonMetrics {
  score: number;         // pontos acumulados
  engajamento: number;   // média de SLA 0-100
  lastAt: number | null; // última execução (ms)
  execCount: number;
}
export interface ChecklistUse { name: string; count: number; conclusao: number; lastAt: number | null }
export interface RecentAct { checklist: string; at: number; sla: number | null }
export interface WeekPoint { label: string; value: number }
export interface PersonDetail extends PersonMetrics {
  byChecklist: ChecklistUse[];
  recent: RecentAct[];
  weekly: WeekPoint[];
  alerts: string[];
}

const DAY = 86400000;
const avg = (arr: number[]) => (arr.length ? Math.round(arr.reduce((s, n) => s + n, 0) / arr.length) : 0);

export function useCheckgrauPeople() {
  const collabsQ = useCollaborators();

  const metricsQ = useQuery({
    queryKey: ['cg_people_metrics'],
    queryFn: async () => {
      const since = new Date(Date.now() - 90 * DAY).toISOString();

      const { data: pts } = await (supabase as any)
        .from('checkgrau_points').select('collaborator_id, points');
      const pointsByCollab = new Map<string, number>();
      for (const p of ((pts ?? []) as any[])) {
        if (!p.collaborator_id) continue;
        pointsByCollab.set(p.collaborator_id, (pointsByCollab.get(p.collaborator_id) ?? 0) + (p.points ?? 0));
      }

      const { data: execs } = await (supabase as any)
        .from('inventory_checklist_executions')
        .select('completed_by, collaborator_id, completed_at, sla_score, schedule:inventory_checklist_schedules(checklist:inventory_checklists(name))')
        .not('completed_at', 'is', null)
        .gte('completed_at', since)
        .limit(8000);

      // Atribuição: prioriza collaborator_id (robusto); senão, cai no id de login.
      const byCollab = new Map<string, any[]>();
      const byUser = new Map<string, any[]>();
      for (const e of ((execs ?? []) as any[])) {
        if (e.collaborator_id) {
          if (!byCollab.has(e.collaborator_id)) byCollab.set(e.collaborator_id, []);
          byCollab.get(e.collaborator_id)!.push(e);
        } else if (e.completed_by) {
          if (!byUser.has(e.completed_by)) byUser.set(e.completed_by, []);
          byUser.get(e.completed_by)!.push(e);
        }
      }
      return { pointsByCollab, byCollab, byUser };
    },
  });

  const isLoading = collabsQ.isLoading || metricsQ.isLoading;
  const collaborators = collabsQ.data ?? [];
  const pointsByCollab = metricsQ.data?.pointsByCollab ?? new Map<string, number>();
  const byCollab = metricsQ.data?.byCollab ?? new Map<string, any[]>();
  const byUser = metricsQ.data?.byUser ?? new Map<string, any[]>();

  // execuções do colaborador: por collaborator_id + (fallback) pelo id de login
  const execsFor = (c: Collaborator): any[] => [
    ...(byCollab.get(c.id) ?? []),
    ...(c.auth_user_id ? (byUser.get(c.auth_user_id) ?? []) : []),
  ];

  const metricsOf = (c: Collaborator): PersonMetrics => {
    const execs = execsFor(c);
    const slas = execs.map((e) => e.sla_score).filter((v: any) => v != null) as number[];
    // "Último acesso" = mais recente entre o login/abertura do app (last_seen_at) e a última execução.
    const lastExec = execs.length ? Math.max(...execs.map((e) => new Date(e.completed_at).getTime())) : 0;
    const lastSeen = c.last_seen_at ? new Date(c.last_seen_at).getTime() : 0;
    const lastAt = Math.max(lastExec, lastSeen) || null;
    return {
      score: pointsByCollab.get(c.id) ?? 0,
      engajamento: avg(slas),
      lastAt,
      execCount: execs.length,
    };
  };

  const detailOf = (c: Collaborator): PersonDetail => {
    const base = metricsOf(c);
    const execs = execsFor(c);

    // por checklist
    const byCk = new Map<string, { count: number; slas: number[]; last: number }>();
    for (const e of execs) {
      const name = e.schedule?.checklist?.name ?? 'Checklist';
      const cur = byCk.get(name) ?? { count: 0, slas: [], last: 0 };
      cur.count++;
      if (e.sla_score != null) cur.slas.push(e.sla_score);
      cur.last = Math.max(cur.last, new Date(e.completed_at).getTime());
      byCk.set(name, cur);
    }
    const byChecklist: ChecklistUse[] = Array.from(byCk.entries())
      .map(([name, v]) => ({ name, count: v.count, conclusao: avg(v.slas), lastAt: v.last || null }))
      .sort((a, b) => b.count - a.count);

    // atividade recente
    const recent: RecentAct[] = [...execs]
      .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
      .slice(0, 6)
      .map((e) => ({ checklist: e.schedule?.checklist?.name ?? 'Checklist', at: new Date(e.completed_at).getTime(), sla: e.sla_score ?? null }));

    // tendência: últimas 8 semanas (média de SLA)
    const now = Date.now();
    const weekly: WeekPoint[] = [];
    for (let w = 7; w >= 0; w--) {
      const start = now - (w + 1) * 7 * DAY;
      const end = now - w * 7 * DAY;
      const inWeek = execs.filter((e) => { const t = new Date(e.completed_at).getTime(); return t >= start && t < end; });
      const slas = inWeek.map((e) => e.sla_score).filter((v: any) => v != null) as number[];
      weekly.push({ label: `S-${w}`, value: avg(slas) });
    }

    // alertas automáticos
    const alerts: string[] = [];
    if (!c.auth_user_id) alerts.push('Ainda não acessou o app (login pendente).');
    else if (base.lastAt == null) alerts.push('Nunca executou um checklist.');
    else if (now - base.lastAt > 7 * DAY) alerts.push(`Sem atividade há ${Math.floor((now - base.lastAt) / DAY)} dias — considere acompanhamento.`);
    if (base.execCount > 0 && base.engajamento < 60) alerts.push('Conformidade/pontualidade abaixo do ideal.');

    return { ...base, byChecklist, recent, weekly, alerts };
  };

  return { collaborators, metricsOf, detailOf, isLoading };
}
