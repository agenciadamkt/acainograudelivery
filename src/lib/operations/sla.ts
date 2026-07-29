/**
 * SLA e ciclo de status das tarefas operacionais (Operações 2.0 — M1).
 *
 * Funções puras (sem I/O) para calcular o atraso, o score de SLA e o status de
 * uma tarefa de checklist. Mantidas isoladas para serem fáceis de testar e
 * reutilizar no cálculo de score/ranking dos próximos marcos.
 */

export type TaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'LATE'
  | 'MISSED'
  | 'CANCELLED';

/** Minutos de atraso: 0 quando concluída até o prazo. */
export function delayMinutes(deadlineAt: Date | string, completedAt: Date | string): number {
  const deadline = new Date(deadlineAt).getTime();
  const done = new Date(completedAt).getTime();
  const diffMs = done - deadline;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 60000);
}

/**
 * Score de SLA a partir do atraso em minutos.
 * No prazo = 100 · ≤15 = 90 · ≤30 = 75 · ≤60 = 50 · acima de 60 = 0.
 * Tarefa não executada usa {@link slaScoreForMissed} (= 0).
 */
export function slaScore(delay: number): number {
  if (delay <= 0) return 100;
  if (delay <= 15) return 90;
  if (delay <= 30) return 75;
  if (delay <= 60) return 50;
  return 0;
}

/** Score de uma tarefa não executada (MISSED). */
export function slaScoreForMissed(): number {
  return 0;
}

/** Status final ao concluir: COMPLETED se no prazo, LATE se houve atraso. */
export function completionStatus(delay: number): Extract<TaskStatus, 'COMPLETED' | 'LATE'> {
  return delay > 0 ? 'LATE' : 'COMPLETED';
}

/** Resultado consolidado da finalização de uma tarefa. */
export interface CompletionResult {
  delay_minutes: number;
  sla_score: number;
  status: Extract<TaskStatus, 'COMPLETED' | 'LATE'>;
}

/** Calcula atraso, score e status de uma tarefa concluída. */
export function computeCompletion(
  deadlineAt: Date | string,
  completedAt: Date | string,
): CompletionResult {
  const delay = delayMinutes(deadlineAt, completedAt);
  return { delay_minutes: delay, sla_score: slaScore(delay), status: completionStatus(delay) };
}

/**
 * Status "vivo" de uma tarefa ainda não concluída, dado o instante atual.
 * PENDING/IN_PROGRESS que passaram do prazo viram MISSED. Não altera estados
 * finais (COMPLETED/LATE/MISSED/CANCELLED).
 */
export function deriveLiveStatus(
  current: TaskStatus,
  deadlineAt: Date | string,
  now: Date | string = new Date(),
): TaskStatus {
  if (current === 'COMPLETED' || current === 'LATE' || current === 'MISSED' || current === 'CANCELLED') {
    return current;
  }
  const overdue = new Date(now).getTime() > new Date(deadlineAt).getTime();
  if (overdue) return 'MISSED';
  return current; // PENDING ou IN_PROGRESS ainda dentro do prazo
}

/** Metadados de exibição (rótulo pt-BR e cor semântica) por status. */
export const STATUS_META: Record<TaskStatus, { label: string; tone: 'neutral' | 'info' | 'good' | 'warn' | 'bad' }> = {
  PENDING: { label: 'Pendente', tone: 'neutral' },
  IN_PROGRESS: { label: 'Em andamento', tone: 'info' },
  COMPLETED: { label: 'Concluída', tone: 'good' },
  LATE: { label: 'Concluída com atraso', tone: 'warn' },
  MISSED: { label: 'Não executada', tone: 'bad' },
  CANCELLED: { label: 'Cancelada', tone: 'neutral' },
};
