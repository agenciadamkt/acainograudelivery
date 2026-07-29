/**
 * Fila offline de conclusões de checklist. Quando sem internet, a conclusão é
 * enfileirada (com fotos em data URL). Ao reconectar, o sync sobe as fotos,
 * grava a execução (completeExecution), concede pontos e cria a notificação.
 */

import { supabase } from '@/integrations/supabase/client';
import { completeExecution } from '@/lib/operations/completeExecution';
import { uploadEvidencePhoto } from '@/lib/operations/evidence';
import { computePoints } from '@/lib/operations/points';
import type { ChecklistItem, ItemAnswer } from '@/hooks/operations/useTaskExecution';
import { idbPut, idbAll, idbDelete, idbCount } from './idb';

export interface QueuedCompletion {
  id: string;
  scheduleId: string;
  executionId: string;
  deadlineAt: string;
  storeId?: string | null;
  collaboratorId?: string | null;
  userId?: string | null;
  checklistName: string;
  notes?: string;
  items: ChecklistItem[];
  answers: Record<string, ItemAnswer>;
  completedAtISO: string;
  queuedAt: number;
}

export const enqueueCompletion = (q: QueuedCompletion) => idbPut(q);
export const listQueue = () => idbAll<QueuedCompletion>();
export const queueCount = () => idbCount();

/** Converte uma data URL em File para reenviar ao storage. */
async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || 'image/jpeg' });
}

/** Reenvia uma conclusão enfileirada; lança em caso de falha (mantém na fila). */
async function syncOne(q: QueuedCompletion): Promise<void> {
  // 1) sobe fotos que ficaram como data URL (capturadas offline)
  const answers: Record<string, ItemAnswer> = {};
  for (const [itemId, a] of Object.entries(q.answers)) {
    let photo_url = a.photo_url ?? null;
    if (photo_url && photo_url.startsWith('data:')) {
      const file = await dataUrlToFile(photo_url, `offline-${itemId}.jpg`);
      photo_url = await uploadEvidencePhoto(file, q.executionId);
    }
    answers[itemId] = { ...a, photo_url };
  }

  // 2) grava a conclusão
  await completeExecution({
    scheduleId: q.scheduleId,
    executionId: q.executionId,
    deadlineAt: q.deadlineAt,
    items: q.items,
    answers,
    notes: q.notes,
    userId: q.userId,
    collaboratorId: q.collaboratorId,
    completedAtISO: q.completedAtISO,
  });

  // 3) pontos + notificação (idempotentes; ignoram se a tabela não existir)
  try {
    await (supabase as any).from('checkgrau_points').upsert(
      [{ execution_id: q.executionId, collaborator_id: q.collaboratorId ?? null, store_id: q.storeId ?? null, points: computePoints(), reason: 'Checklist concluído (offline)' }],
      { onConflict: 'execution_id', ignoreDuplicates: true },
    );
  } catch { /* pontuação opcional */ }
  try {
    await (supabase as any).from('checkgrau_notifications').upsert(
      [{ store_id: q.storeId ?? null, collaborator_id: q.collaboratorId ?? null, category: 'completed', title: 'Tarefa concluída', body: `${q.checklistName} foi concluída (sincronizada).`, ref_schedule_id: q.scheduleId, dedup_key: `completed:${q.executionId}` }],
      { onConflict: 'dedup_key', ignoreDuplicates: true },
    );
  } catch { /* notificação opcional */ }
}

/** Processa toda a fila; remove os itens sincronizados. Retorna quantos foram. */
export async function flushQueue(): Promise<number> {
  const queue = await listQueue();
  let synced = 0;
  for (const q of queue) {
    try {
      await syncOne(q);
      await idbDelete(q.id);
      synced++;
    } catch {
      // mantém na fila para a próxima tentativa
    }
  }
  return synced;
}
