/**
 * CheckGrau App — Tela de conclusão (Bloco 3, modelo aprovado tela 5).
 * Sucesso com check animado, confete, som, resumo (início/fim/tempo/score) e
 * gamificação (+pontos CheckGrau). Suporta conclusão offline (dados via state,
 * pontos/notificação vão no sync). Ações: próxima tarefa ou voltar ao início.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Loader2, ArrowRight, Sparkles, CloudUpload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaborator } from '@/contexts/CollaboratorContext';
import { useTask } from '@/hooks/operations/useTaskExecution';
import { useCollaboratorTasks, todayISO } from '@/hooks/checkgrau/useCollaboratorTasks';
import { useAwardPoints } from '@/hooks/checkgrau/usePoints';
import { useNotifyCompleted } from '@/hooks/checkgrau/useNotifications';
import { computePoints, scoreBadge } from '@/lib/operations/points';
import { computeCompletion } from '@/lib/operations/sla';
import { playSuccessChime } from '@/lib/sound';
import { Confetti } from './_components/Confetti';

const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function elapsed(startISO: string | null, endISO: string | null): string {
  if (!startISO || !endISO) return '—';
  const ms = new Date(endISO).getTime() - new Date(startISO).getTime();
  if (ms < 0) return '—';
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}min ${String(sec).padStart(2, '0')}s` : `${sec}s`;
}

const TONE: Record<string, string> = {
  good: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  warn: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  bad: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};

interface QueuedState {
  queued?: boolean;
  checklistName?: string;
  startedAt?: string;
  completedAt?: string;
  deadlineAt?: string;
}

export default function TaskSuccessPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const qs = (location.state ?? {}) as QueuedState;
  const queued = qs.queued === true;

  const { collaborator, selectedStore, stores } = useCollaborator();
  const store = selectedStore ?? stores[0] ?? null;
  const { data: task, isLoading } = useTask(queued ? undefined : scheduleId);
  const { data: dayTasks } = useCollaboratorTasks(store?.id, todayISO());
  const award = useAwardPoints();
  const notifyCompleted = useNotifyCompleted();

  const [points, setPoints] = useState<number | null>(null);
  const awardedRef = useRef(false);
  const playedRef = useRef(false);

  const exec = task?.execution ?? null;

  // som — uma vez só
  useEffect(() => { if (!playedRef.current) { playedRef.current = true; playSuccessChime(); } }, []);

  // premiação + notificação (apenas online; offline vai no sync)
  useEffect(() => {
    if (queued || awardedRef.current || !exec?.id || !exec.completed_at) return;
    awardedRef.current = true;
    const pts = computePoints({ onTime: exec.sla_score != null && exec.sla_score >= 100, conformidade: exec.conformidade ?? null });
    award.mutate(
      { executionId: exec.id, collaboratorId: collaborator?.id, storeId: store?.id, points: pts, reason: 'Checklist concluído' },
      { onSuccess: (p) => setPoints(p) },
    );
    notifyCompleted.mutate({
      executionId: exec.id, scheduleId: task!.id, storeId: store?.id,
      collaboratorId: collaborator?.id, checklistName: task!.checklist?.name ?? 'Checklist',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exec?.id, exec?.completed_at, queued]);

  const nextTask = useMemo(() => {
    const list = (dayTasks ?? [])
      .filter((t) => t.id !== scheduleId && ['PENDING', 'IN_PROGRESS', 'MISSED'].includes(t.liveStatus))
      .sort((a, b) => {
        const am = a.liveStatus === 'MISSED' ? 0 : 1;
        const bm = b.liveStatus === 'MISSED' ? 0 : 1;
        if (am !== bm) return am - bm;
        return (a.scheduled_time ?? '').localeCompare(b.scheduled_time ?? '');
      });
    return list[0] ?? null;
  }, [dayTasks, scheduleId]);

  if (!queued && (isLoading || !task)) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0F0F14]"><Loader2 className="h-6 w-6 animate-spin text-[#7C3AED]" /></div>;
  }

  // dados unificados (online = execução gravada; offline = state local)
  const view = queued
    ? {
        checklistName: qs.checklistName ?? 'Checklist',
        startedAt: qs.startedAt ?? null,
        completedAt: qs.completedAt ?? null,
        score: qs.deadlineAt && qs.completedAt ? computeCompletion(qs.deadlineAt, qs.completedAt).sla_score : null,
      }
    : {
        checklistName: task!.checklist?.name ?? 'Checklist',
        startedAt: exec?.started_at ?? null,
        completedAt: exec?.completed_at ?? null,
        score: exec?.sla_score ?? null,
      };
  const badge = scoreBadge(view.score);

  return (
    <div className="relative min-h-screen bg-gray-50 px-5 pb-10 pt-16 dark:bg-[#0F0F14]">
      <Confetti />

      <div className="mx-auto max-w-md">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 16 }}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/30"
          >
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}>
              <Check className="h-12 w-12 text-white" strokeWidth={3} />
            </motion.span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">
            Checklist concluído!
          </motion.h1>
          <p className="mt-1 text-sm text-gray-400">Tudo certo por aqui.</p>
        </div>

        {queued && (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <CloudUpload className="h-4 w-4 shrink-0" />
            Salvo offline — será enviado quando a conexão voltar.
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="mt-5 space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/[0.06] dark:bg-[#16161D]">
          <Row label="Tarefa" value={view.checklistName} />
          <Row label="Iniciado em" value={fmtDateTime(view.startedAt)} />
          <Row label="Finalizado em" value={fmtDateTime(view.completedAt)} />
          <Row label="Tempo total" value={elapsed(view.startedAt, view.completedAt)} />
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-gray-400">Pontuação</span>
            <span className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 dark:text-white">{view.score ?? 0}%</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', TONE[badge.tone])}>{badge.label}</span>
            </span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45, type: 'spring' }}
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 py-3.5 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          <Sparkles className="h-5 w-5" />
          <span className="font-bold">
            {queued
              ? `+${computePoints()} pontos CheckNoGrau (ao sincronizar)`
              : award.isPending && points == null ? 'Calculando pontos…' : `+${points ?? computePoints()} pontos CheckNoGrau`}
          </span>
        </motion.div>

        <div className="mt-7 space-y-3">
          {nextTask ? (
            <button onClick={() => navigate(`/colaborador/tarefa/${nextTask.id}`)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#7C3AED] py-3.5 font-semibold text-white transition-colors hover:bg-[#6D28D9] active:scale-[0.99]">
              Próxima tarefa <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
          <button onClick={() => navigate('/colaborador')}
            className={cn('flex w-full items-center justify-center rounded-xl py-3.5 font-semibold transition-colors active:scale-[0.99]',
              nextTask ? 'text-gray-500 hover:bg-gray-100 dark:text-white/50 dark:hover:bg-white/5' : 'bg-[#7C3AED] text-white hover:bg-[#6D28D9]')}>
            Voltar para o início
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
