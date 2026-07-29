/**
 * Pontuação CheckGrau (gamificação). Base +10 por checklist concluído — mesmo
 * valor do modelo aprovado. Critérios adicionais (pontualidade, evidências,
 * conformidade) serão refinados no bloco de Ranking/Score.
 */

export const BASE_POINTS = 10;

export function computePoints(_opts?: { onTime?: boolean; conformidade?: number | null }): number {
  return BASE_POINTS;
}

/** Rótulo qualitativo a partir do score (SLA/qualidade), 0-100. */
export function scoreBadge(score: number | null | undefined): { label: string; tone: 'good' | 'warn' | 'bad' } {
  const s = score ?? 0;
  if (s >= 90) return { label: 'Excelente', tone: 'good' };
  if (s >= 75) return { label: 'Bom', tone: 'good' };
  if (s >= 50) return { label: 'Regular', tone: 'warn' };
  return { label: 'Precisa melhorar', tone: 'bad' };
}
