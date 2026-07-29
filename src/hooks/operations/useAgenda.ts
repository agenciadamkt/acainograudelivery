/**
 * Agenda operacional (Operações 2.0 — M1).
 *
 * - `useAgenda(date)`  → tarefas (`inventory_checklist_schedules`) da unidade numa data,
 *   com status "vivo" (MISSED derivado do prazo).
 * - `useGenerateAgenda()` → materializa as tarefas do dia a partir das rotinas ativas
 *   (idempotente) e marca como MISSED as vencidas não concluídas.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import { deriveLiveStatus, type TaskStatus } from '@/lib/operations/sla';
import type { RecurrenceType } from './useRoutines';

export interface ScheduleTask {
  id: string;
  routine_id: string | null;
  store_id: string;
  sector_id: string | null;
  shift_id: string | null;
  checklist_id: string;
  responsible_user_id: string | null;
  collaborator_id: string | null;
  scheduled_date: string;
  scheduled_time: string;
  deadline_at: string;
  critical: boolean;
  status: TaskStatus;
  /** status recalculado para exibição (MISSED se venceu). */
  liveStatus: TaskStatus;
  checklist?: { name: string } | null;
  sector?: { name: string } | null;
  shift?: { name: string } | null;
  execution?: { id: string; sla_score: number | null; delay_minutes: number | null } | null;
}

/** 0=Seg…6=Dom (padrão das rotinas) a partir de um Date. */
function routineWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** Monta o timestamp de prazo local a partir de data + hora + tolerância. */
function buildDeadline(dateISO: string, time: string, graceMin: number): string {
  const hhmm = (time || '08:00').slice(0, 5);
  const dl = new Date(`${dateISO}T${hhmm}:00`);
  dl.setMinutes(dl.getMinutes() + (graceMin || 0));
  return dl.toISOString();
}

export function useAgenda(dateISO: string) {
  const { currentStore } = useStore();
  return useQuery({
    queryKey: ['op_agenda', currentStore?.id, dateISO],
    enabled: !!currentStore?.id && !!dateISO,
    queryFn: async (): Promise<ScheduleTask[]> => {
      const { data, error } = await (supabase as any)
        .from('inventory_checklist_schedules')
        .select(
          '*, checklist:inventory_checklists(name), sector:sectors(name), shift:shifts(name), ' +
            'execution:inventory_checklist_executions(id, sla_score, delay_minutes)',
        )
        .eq('store_id', currentStore!.id)
        .eq('scheduled_date', dateISO)
        .order('scheduled_time');
      if (error) throw error;
      return ((data ?? []) as any[]).map((t) => ({
        ...t,
        execution: Array.isArray(t.execution) ? t.execution[0] ?? null : t.execution ?? null,
        liveStatus: deriveLiveStatus(t.status as TaskStatus, t.deadline_at),
      })) as ScheduleTask[];
    },
  });
}

/** yyyy-mm-dd local de um Date. */
function dateISOOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Uma rotina se aplica a esta data? (diária / semanal / mensal / data única) */
function routineApplies(r: any, date: Date): boolean {
  const type = r.recurrence_type as RecurrenceType;
  if (type === 'daily') return true;
  if (type === 'weekly') return Array.isArray(r.weekdays) && r.weekdays.includes(routineWeekday(date));
  if (type === 'once') return !!r.specific_date && r.specific_date === dateISOOf(date);
  if (type === 'monthly') {
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    if (r.last_day_of_month) return date.getDate() === daysInMonth;
    if (r.day_of_month != null) return date.getDate() === Math.min(r.day_of_month, daysInMonth); // dia > mês → último dia
    return new Date(r.created_at).getDate() === date.getDate(); // legado
  }
  return false;
}

/** Linha de agendamento (schedule) para uma rotina numa data. */
function scheduleRow(r: any, dateISO: string, storeId: string) {
  return {
    routine_id: r.id,
    store_id: storeId,
    sector_id: r.sector_id,
    shift_id: r.shift_id,
    checklist_id: r.checklist_id,
    responsible_user_id: r.responsible_user_id,
    collaborator_id: r.collaborator_id,
    scheduled_date: dateISO,
    scheduled_time: r.scheduled_time,
    deadline_at: buildDeadline(dateISO, r.scheduled_time, r.sla_grace_minutes),
    critical: r.critical,
    status: 'PENDING',
  };
}

export function useGenerateAgenda() {
  const { currentStore } = useStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (dateISO: string): Promise<number> => {
      const storeId = currentStore?.id;
      if (!storeId) throw new Error('Selecione uma unidade.');

      // 1) rotinas ativas da unidade
      console.log('[GEN_AGENDA] Step 1: Fetching routines for store:', storeId, 'date:', dateISO);
      const { data: routines, error: rErr } = await (supabase as any)
        .from('inventory_checklist_routines')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true);
      console.log('[GEN_AGENDA] Routines fetched:', { count: routines?.length, error: rErr, routines });
      if (rErr) throw rErr;

      const date = new Date(`${dateISO}T12:00:00`); // meio-dia evita virada de fuso

      // 2) filtra as que se aplicam à data
      const applicable = (routines ?? []).filter((r: any) => routineApplies(r, date));
      console.log('[GEN_AGENDA] Applicable routines:', applicable.length, applicable.map((r: any) => ({ id: r.id, collaborator_id: r.collaborator_id, recurrence_type: r.recurrence_type })));

      if (applicable.length === 0) return 0;

      // 3) upsert idempotente (UNIQUE routine_id + scheduled_date)
      const rows = applicable.map((r: any) => ({
        routine_id: r.id,
        store_id: storeId,
        sector_id: r.sector_id,
        shift_id: r.shift_id,
        checklist_id: r.checklist_id,
        responsible_user_id: r.responsible_user_id,
        collaborator_id: r.collaborator_id,
        scheduled_date: dateISO,
        scheduled_time: r.scheduled_time,
        deadline_at: buildDeadline(dateISO, r.scheduled_time, r.sla_grace_minutes),
        critical: r.critical,
        status: 'PENDING',
      }));

      console.log('[GEN_AGENDA] Upserting rows:', JSON.stringify(rows, null, 2));
      const { data: upsertData, error: upErr } = await (supabase as any)
        .from('inventory_checklist_schedules')
        .upsert(rows, { onConflict: 'routine_id,scheduled_date', ignoreDuplicates: true })
        .select();
      console.log('[GEN_AGENDA] Upsert result:', { data: upsertData, error: upErr });
      if (upErr) throw upErr;

      // 4) marca vencidas não concluídas como MISSED
      await (supabase as any)
        .from('inventory_checklist_schedules')
        .update({ status: 'MISSED', updated_at: new Date().toISOString() })
        .eq('store_id', storeId)
        .eq('scheduled_date', dateISO)
        .in('status', ['PENDING', 'IN_PROGRESS'])
        .lt('deadline_at', new Date().toISOString());

      return applicable.length;
    },
    onSuccess: (count, dateISO) => {
      qc.invalidateQueries({ queryKey: ['op_agenda', currentStore?.id, dateISO] });
      toast.success(count > 0 ? `Agenda gerada (${count} rotina(s)).` : 'Nenhuma rotina para esta data.');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao gerar a agenda.'),
  });
}

/**
 * Gera a agenda do MÊS inteiro a partir das rotinas ativas (idempotente).
 * Recebe uma data-âncora (qualquer dia do mês) e materializa todos os dias.
 */
export function useGenerateAgendaMonth() {
  const { currentStore } = useStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (anchorISO: string): Promise<{ days: number; rows: number }> => {
      const storeId = currentStore?.id;
      if (!storeId) throw new Error('Selecione uma unidade.');

      const { data: routines, error: rErr } = await (supabase as any)
        .from('inventory_checklist_routines')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true);
      if (rErr) throw rErr;
      if (!routines || routines.length === 0) return { days: 0, rows: 0 };

      const anchor = new Date(`${anchorISO}T12:00:00`);
      const year = anchor.getFullYear();
      const month = anchor.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const allRows: any[] = [];
      let daysWithTasks = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const date = new Date(year, month, d, 12, 0, 0);
        const dateISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const applicable = (routines as any[]).filter((r) => routineApplies(r, date));
        if (applicable.length > 0) daysWithTasks++;
        for (const r of applicable) allRows.push(scheduleRow(r, dateISO, storeId));
      }
      if (allRows.length === 0) return { days: 0, rows: 0 };

      // upsert idempotente em lotes (UNIQUE routine_id + scheduled_date)
      const CHUNK = 500;
      for (let i = 0; i < allRows.length; i += CHUNK) {
        const { error: upErr } = await (supabase as any)
          .from('inventory_checklist_schedules')
          .upsert(allRows.slice(i, i + CHUNK), { onConflict: 'routine_id,scheduled_date', ignoreDuplicates: true });
        if (upErr) throw upErr;
      }
      return { days: daysWithTasks, rows: allRows.length };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['op_agenda'] });
      toast.success(
        res.rows > 0
          ? `Agenda do mês gerada: ${res.rows} tarefa(s) em ${res.days} dia(s).`
          : 'Nenhuma rotina ativa para gerar no mês.',
      );
    },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao gerar a agenda do mês.'),
  });
}
