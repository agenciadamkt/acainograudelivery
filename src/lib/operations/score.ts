/**
 * Score operacional e indicadores (Operações 2.0 — M3). Funções puras.
 *
 * Score do usuário/setor/unidade (0–100) ponderado:
 *   40% Pontualidade · 30% Conformidade · 20% Conclusão · 10% Qualidade
 * Agregações superiores (setor, unidade, rede) são a média das unidades abaixo.
 */

import type { TaskStatus } from './sla';

/** Veredito de conformidade de um item respondido. */
export type ItemVerdict = boolean | null; // true=aprovado, false=reprovado, null=não avaliável

/**
 * Determina o veredito de conformidade de um item da execução.
 * - temperatura/faixa: usa `passed` (validação automática).
 * - sim/não: aprovado quando marcado como "sim".
 * - demais tipos: não avaliável (null).
 */
export function itemVerdict(
  type: string,
  passed: boolean | null | undefined,
  valueBoolean: boolean | null | undefined,
): ItemVerdict {
  if (type === 'temperature' || type === 'range') return passed ?? false;
  if (type === 'boolean') return valueBoolean === true;
  return null;
}

export interface TaskInput {
  status: TaskStatus; // status EFETIVO (MISSED já derivado)
  critical: boolean;
  items: { verdict: ItemVerdict; rating: number | null }[];
}

export interface OpsMetrics {
  scheduled: number;
  executed: number; // concluídas (no prazo ou com atraso)
  onTime: number;
  late: number;
  missed: number;
  pending: number;
  criticalFailures: number;
  itemsApproved: number;
  itemsEvaluable: number;
  ratingSum: number;
  ratingCount: number;
}

export function emptyMetrics(): OpsMetrics {
  return {
    scheduled: 0, executed: 0, onTime: 0, late: 0, missed: 0, pending: 0,
    criticalFailures: 0, itemsApproved: 0, itemsEvaluable: 0, ratingSum: 0, ratingCount: 0,
  };
}

/** Agrega uma lista de tarefas em métricas brutas. */
export function summarize(tasks: TaskInput[]): OpsMetrics {
  const m = emptyMetrics();
  for (const t of tasks) {
    m.scheduled += 1;
    const executed = t.status === 'COMPLETED' || t.status === 'LATE';
    if (executed) m.executed += 1;
    if (t.status === 'COMPLETED') m.onTime += 1;
    if (t.status === 'LATE') m.late += 1;
    if (t.status === 'MISSED') m.missed += 1;
    if (t.status === 'PENDING' || t.status === 'IN_PROGRESS') m.pending += 1;

    let hasFailedItem = false;
    for (const it of t.items) {
      if (it.verdict !== null) {
        m.itemsEvaluable += 1;
        if (it.verdict) m.itemsApproved += 1;
        else hasFailedItem = true;
      }
      if (it.rating != null) { m.ratingSum += it.rating; m.ratingCount += 1; }
    }
    if (t.critical && (t.status === 'MISSED' || hasFailedItem)) m.criticalFailures += 1;
  }
  return m;
}

export interface ScoreBreakdown {
  pontualidade: number; // 0-100
  conformidade: number;
  conclusao: number;
  qualidade: number;
  score: number; // 0-100 ponderado
}

const pct = (num: number, den: number, fallback = 0) => (den > 0 ? (num / den) * 100 : fallback);

/**
 * Score ponderado a partir das métricas.
 * Sem itens avaliáveis → conformidade = 100 (não penaliza). Sem avaliações →
 * qualidade = conformidade.
 */
export function computeScore(m: OpsMetrics): ScoreBreakdown {
  const conclusao = pct(m.executed, m.scheduled);
  const pontualidade = pct(m.onTime, m.executed);
  const conformidade = m.itemsEvaluable > 0 ? pct(m.itemsApproved, m.itemsEvaluable) : 100;
  const qualidade = m.ratingCount > 0 ? (m.ratingSum / m.ratingCount / 5) * 100 : conformidade;
  const score = 0.4 * pontualidade + 0.3 * conformidade + 0.2 * conclusao + 0.1 * qualidade;
  return {
    pontualidade: Math.round(pontualidade),
    conformidade: Math.round(conformidade),
    conclusao: Math.round(conclusao),
    qualidade: Math.round(qualidade),
    score: Math.round(score),
  };
}

/** Indicadores principais do painel. */
export interface OpsIndicators {
  taxaConclusao: number; // executados / agendados
  pontualidade: number; // no prazo / executados
  conformidade: number; // itens aprovados / itens respondidos
}

export function indicators(m: OpsMetrics): OpsIndicators {
  return {
    taxaConclusao: Math.round(pct(m.executed, m.scheduled)),
    pontualidade: Math.round(pct(m.onTime, m.executed)),
    conformidade: Math.round(m.itemsEvaluable > 0 ? pct(m.itemsApproved, m.itemsEvaluable) : 100),
  };
}
