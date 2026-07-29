/**
 * CheckGrau — Relatórios Operacionais.
 *
 * Um único fetch das tarefas (schedules + executions + items) do período/lojas/
 * filtros, do qual derivamos TUDO de forma consistente entre si (essencial num
 * relatório executivo/PDF, onde os números precisam reconciliar):
 *   • KPIs + score (mesma lib do Painel)
 *   • Série semanal (score/conformidade/pontualidade por semana)
 *   • Ranking de colaboradores (execuções, conformidade, pontualidade, score)
 *   • Ranking de lojas (score, conformidade, pendências, falhas)
 *   • Falhas críticas detalhadas (data, loja, checklist, item, responsável)
 *   • Histórico de execuções (data, loja, colaborador, checklist, score, tempo)
 *
 * Engajamento e Alertas vêm de fontes próprias (useEngajamento / notification_logs).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  summarize, computeScore, itemVerdict,
  type TaskInput, type OpsMetrics, type ScoreBreakdown,
} from '@/lib/operations/score';
import { deriveLiveStatus, type TaskStatus } from '@/lib/operations/sla';

export interface ReportFilters {
  storeIds: string[];
  dateFrom: string; // yyyy-mm-dd
  dateTo: string;
  collaboratorId?: string | null;
  sectorId?: string | null;
  status?: TaskStatus | 'ALL' | null;
}

export interface WeeklyPoint {
  week: string;            // rótulo (dd/MM da segunda-feira)
  score: number;
  conformidade: number;
  pontualidade: number;
}

export interface CollaboratorReportRow {
  id: string;
  name: string;
  cargo: string | null;
  execucoes: number;
  conformidade: number;
  pontualidade: number;
  score: number;
}

export interface StoreReportRow {
  id: string;
  name: string;
  score: number;
  conformidade: number;
  pendencias: number;
  falhas: number;
}

export interface CriticalFailureRow {
  id: string;
  date: string;
  storeName: string;
  checklistName: string;
  itemName: string;
  responsible: string;
  status: TaskStatus;
  resolved: boolean; // resolvido = houve execução concluída depois
}

export interface HistoryRow {
  id: string;
  date: string;          // scheduled_date
  completedAt: string | null;
  storeName: string;
  collaborator: string;
  checklistName: string;
  score: number | null;  // sla_score
  durationMin: number | null;
}

export interface ReportData {
  metrics: OpsMetrics;
  score: ScoreBreakdown;
  weekly: WeeklyPoint[];
  byCollaborator: CollaboratorReportRow[];
  byStore: StoreReportRow[];
  criticalFailures: CriticalFailureRow[];
  history: HistoryRow[];
}

export interface ReportAlertRow {
  id: string;
  type: string;          // rótulo amigável
  rawType: string;       // event_type original
  date: string | null;
  recipient: string | null;
  status: string;
}

export interface ReportAlertsData {
  total: number;
  byType: { type: string; count: number }[];
  rows: ReportAlertRow[];
}

const ALERT_TYPE_LABEL: Record<string, string> = {
  overdue: 'Checklist não executado',
  critical: 'Falha crítica',
  out_of_standard: 'Fora do padrão',
};

/** Alertas disparados (notification_logs) das lojas no período. */
export function useReportAlerts(storeIds: string[], dateFrom: string, dateTo: string) {
  return useQuery({
    queryKey: ['cg_report_alerts', storeIds, dateFrom, dateTo],
    enabled: storeIds.length > 0 && !!dateFrom && !!dateTo,
    queryFn: async (): Promise<ReportAlertsData> => {
      try {
        const { data, error } = await (supabase as any)
          .from('notification_logs')
          .select('id, event_type, phone, status, sent_at, created_at')
          .in('store_id', storeIds)
          .gte('created_at', `${dateFrom}T00:00:00`)
          .lte('created_at', `${dateTo}T23:59:59`)
          .order('created_at', { ascending: false });
        if (error) throw error;
        const rows: ReportAlertRow[] = (data ?? []).map((r: any) => ({
          id: r.id,
          rawType: r.event_type,
          type: ALERT_TYPE_LABEL[r.event_type] ?? r.event_type,
          date: r.sent_at ?? r.created_at ?? null,
          recipient: r.phone ?? null,
          status: r.status ?? '—',
        }));
        const counts = new Map<string, number>();
        for (const r of rows) counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
        return {
          total: rows.length,
          byType: [...counts.entries()].map(([type, count]) => ({ type, count })),
          rows,
        };
      } catch {
        // Tabela pode não existir ainda em algum ambiente — degrada vazio.
        return { total: 0, byType: [], rows: [] };
      }
    },
  });
}

/** Segunda-feira (local) da semana de uma data ISO — rótulo estável. */
function weekStart(dateISO: string): string {
  const d = new Date(`${dateISO}T12:00:00`);
  const dow = (d.getDay() + 6) % 7; // 0=Seg
  d.setDate(d.getDate() - dow);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildTaskInput(row: any): TaskInput {
  const status = deriveLiveStatus(row.status as TaskStatus, row.deadline_at);
  const exec = Array.isArray(row.execution) ? row.execution[0] : row.execution;
  const items = (exec?.items ?? []).map((ei: any) => {
    const type = ei.item?.type ?? '';
    return {
      verdict: itemVerdict(type, ei.passed, ei.value_boolean),
      rating: type === 'rating' ? (ei.value_number ?? null) : null,
    };
  });
  return { status, critical: !!row.critical, items };
}

function scoreFrom(tasks: TaskInput[]) {
  const m = summarize(tasks);
  return { metrics: m, score: computeScore(m) };
}

export function useCheckgrauReports(filters: ReportFilters) {
  const { storeIds, dateFrom, dateTo } = filters;
  return useQuery({
    queryKey: ['cg_reports', filters],
    enabled: storeIds.length > 0 && !!dateFrom && !!dateTo,
    queryFn: async (): Promise<ReportData> => {
      // Colaboradores (nome/cargo + resolução por auth_user_id).
      const { data: collabs } = await (supabase as any)
        .from('checkgrau_collaborators')
        .select('id, name, cargo, auth_user_id');
      const collabById = new Map<string, { name: string; cargo: string | null }>(
        (collabs ?? []).map((c: any) => [c.id, { name: c.name, cargo: c.cargo }]),
      );
      const collabByAuth = new Map<string, string>(
        (collabs ?? []).filter((c: any) => c.auth_user_id).map((c: any) => [c.auth_user_id, c.id]),
      );

      // Fetch único: tarefas do período/lojas com execução e itens.
      const { data, error } = await (supabase as any)
        .from('inventory_checklist_schedules')
        .select(
          'id, store_id, sector_id, shift_id, collaborator_id, responsible_user_id, ' +
            'scheduled_date, scheduled_time, deadline_at, critical, status, ' +
            'store:stores(name), checklist:inventory_checklists(name), ' +
            'execution:inventory_checklist_executions(id, completed_at, sla_score, delay_minutes, completed_by, collaborator_id, ' +
            'items:inventory_checklist_execution_items(passed, value_boolean, value_number, ' +
            'item:inventory_checklist_items(type, name)))',
        )
        .in('store_id', storeIds)
        .gte('scheduled_date', dateFrom)
        .lte('scheduled_date', dateTo)
        .order('scheduled_date', { ascending: false });
      if (error) throw error;

      let rows = (data ?? []) as any[];

      // Filtros client-side (setor/status/colaborador).
      if (filters.sectorId) rows = rows.filter((r) => r.sector_id === filters.sectorId);
      if (filters.collaboratorId) {
        rows = rows.filter((r) => {
          const exec = Array.isArray(r.execution) ? r.execution[0] : r.execution;
          const cid = exec?.collaborator_id ?? r.collaborator_id
            ?? (exec?.completed_by ? collabByAuth.get(exec.completed_by) : null);
          return cid === filters.collaboratorId;
        });
      }
      if (filters.status && filters.status !== 'ALL') {
        rows = rows.filter((r) => deriveLiveStatus(r.status, r.deadline_at) === filters.status);
      }

      const storeName = (r: any) => r.store?.name ?? 'Unidade';
      const execOf = (r: any) => (Array.isArray(r.execution) ? r.execution[0] : r.execution) ?? null;
      const collabOf = (r: any): string | null => {
        const exec = execOf(r);
        return exec?.collaborator_id ?? r.collaborator_id
          ?? (exec?.completed_by ? collabByAuth.get(exec.completed_by) ?? null : null);
      };

      // KPIs + score gerais.
      const allTasks = rows.map(buildTaskInput);
      const { metrics, score } = scoreFrom(allTasks);

      // Série semanal.
      const byWeek = new Map<string, TaskInput[]>();
      for (const r of rows) {
        const wk = weekStart(r.scheduled_date);
        if (!byWeek.has(wk)) byWeek.set(wk, []);
        byWeek.get(wk)!.push(buildTaskInput(r));
      }
      const weekly: WeeklyPoint[] = [...byWeek.entries()]
        .map(([week, tasks]) => {
          const s = computeScore(summarize(tasks));
          return { week, score: s.score, conformidade: s.conformidade, pontualidade: s.pontualidade };
        })
        .sort((a, b) => {
          const [da, ma] = a.week.split('/').map(Number);
          const [db, mb] = b.week.split('/').map(Number);
          return ma - mb || da - db;
        });

      // Ranking de colaboradores.
      const byCollab = new Map<string, TaskInput[]>();
      for (const r of rows) {
        const cid = collabOf(r);
        if (!cid) continue;
        if (!byCollab.has(cid)) byCollab.set(cid, []);
        byCollab.get(cid)!.push(buildTaskInput(r));
      }
      const byCollaborator: CollaboratorReportRow[] = [...byCollab.entries()]
        .map(([id, tasks]) => {
          const { metrics: m, score: sc } = scoreFrom(tasks);
          const info = collabById.get(id);
          return {
            id,
            name: info?.name ?? '—',
            cargo: info?.cargo ?? null,
            execucoes: m.executed,
            conformidade: sc.conformidade,
            pontualidade: sc.pontualidade,
            score: sc.score,
          };
        })
        .sort((a, b) => b.score - a.score);

      // Ranking de lojas.
      const byStoreMap = new Map<string, { name: string; tasks: TaskInput[]; pend: number; fail: number }>();
      for (const r of rows) {
        const sid = r.store_id;
        if (!byStoreMap.has(sid)) byStoreMap.set(sid, { name: storeName(r), tasks: [], pend: 0, fail: 0 });
        const bucket = byStoreMap.get(sid)!;
        const ti = buildTaskInput(r);
        bucket.tasks.push(ti);
        if (ti.status === 'PENDING' || ti.status === 'IN_PROGRESS' || ti.status === 'MISSED') bucket.pend += 1;
      }
      const byStore: StoreReportRow[] = [...byStoreMap.entries()]
        .map(([id, b]) => {
          const { metrics: m, score: sc } = scoreFrom(b.tasks);
          return { id, name: b.name, score: sc.score, conformidade: sc.conformidade, pendencias: b.pend, falhas: m.criticalFailures };
        })
        .sort((a, b) => b.score - a.score);

      // Falhas críticas detalhadas (item reprovado em tarefa crítica, ou crítica não executada).
      const criticalFailures: CriticalFailureRow[] = [];
      for (const r of rows) {
        if (!r.critical) continue;
        const live = deriveLiveStatus(r.status, r.deadline_at);
        const exec = execOf(r);
        const failedItems = (exec?.items ?? []).filter((it: any) => it.passed === false);
        const cid = collabOf(r);
        const respName = cid ? (collabById.get(cid)?.name ?? '—') : '—';
        if (failedItems.length > 0) {
          for (const it of failedItems) {
            criticalFailures.push({
              id: `${r.id}-${it.item?.name ?? Math.random()}`,
              date: r.scheduled_date,
              storeName: storeName(r),
              checklistName: r.checklist?.name ?? 'Checklist',
              itemName: it.item?.name ?? '—',
              responsible: respName,
              status: live,
              resolved: live === 'COMPLETED' || live === 'LATE',
            });
          }
        } else if (live === 'MISSED') {
          criticalFailures.push({
            id: r.id,
            date: r.scheduled_date,
            storeName: storeName(r),
            checklistName: r.checklist?.name ?? 'Checklist',
            itemName: 'Checklist não executado',
            responsible: respName,
            status: live,
            resolved: false,
          });
        }
      }
      criticalFailures.sort((a, b) => (a.date < b.date ? 1 : -1));

      // Histórico de execuções (concluídas).
      const history: HistoryRow[] = rows
        .filter((r) => {
          const live = deriveLiveStatus(r.status, r.deadline_at);
          return live === 'COMPLETED' || live === 'LATE';
        })
        .map((r) => {
          const exec = execOf(r);
          const cid = collabOf(r);
          return {
            id: r.id,
            date: r.scheduled_date,
            completedAt: exec?.completed_at ?? null,
            storeName: storeName(r),
            collaborator: cid ? (collabById.get(cid)?.name ?? '—') : '—',
            checklistName: r.checklist?.name ?? 'Checklist',
            score: exec?.sla_score ?? null,
            durationMin: exec?.delay_minutes ?? null,
          };
        })
        .sort((a, b) => ((a.completedAt ?? a.date) < (b.completedAt ?? b.date) ? 1 : -1));

      return { metrics, score, weekly, byCollaborator, byStore, criticalFailures, history };
    },
  });
}
