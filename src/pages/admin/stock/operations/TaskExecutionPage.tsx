/**
 * Operações 2.0 — Execução de tarefa (M1).
 * Mostra o prazo (SLA), os itens do checklist e permite iniciar/finalizar,
 * gravando a execução com cálculo de atraso e score.
 */

import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Play, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/contexts/StoreContext';
import { useTask, useStartTask, useCompleteTask, type ItemAnswer } from '@/hooks/operations/useTaskExecution';
import { STATUS_META } from '@/lib/operations/sla';
import { TaskItemField } from './TaskItemField';
import { ExecutionResultView } from './ExecutionResultView';

/** Tempo gasto entre início e fim, formatado (ex: "12m", "1h 05m"). */
function elapsedLabel(startedAt: string | null, completedAt: string | null): string {
  if (!startedAt || !completedAt) return '—';
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return '—';
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

function useCountdown(deadlineAt: string | undefined) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!deadlineAt) return null;
  const diff = new Date(deadlineAt).getTime() - now;
  const late = diff < 0;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  const txt = `${h > 0 ? h + 'h ' : ''}${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return { late, txt };
}

export default function TaskExecutionPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const { data: task, isLoading } = useTask(scheduleId);
  const startTask = useStartTask();
  const completeTask = useCompleteTask();
  const countdown = useCountdown(task?.deadline_at);

  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>({});
  const [notes, setNotes] = useState('');

  const setAnswer = (id: string, a: ItemAnswer) => setAnswers((p) => ({ ...p, [id]: { ...p[id], ...a } }));

  const started = !!task?.execution?.started_at;
  const finished = !!task?.execution?.completed_at;

  const missingRequired = useMemo(() => {
    if (!task) return [];
    return task.items.filter((it) => {
      const a = answers[it.id] ?? {};
      // requisitos de evidência (M2)
      if (it.require_photo && !a.photo_url) return true;
      if (it.require_gps && !a.gps) return true;
      if (it.require_comment && !a.comment?.trim()) return true;
      if (it.require_signature && !a.signature?.trim()) return true;
      // valor principal, quando o item é obrigatório
      if (!it.is_required) return false;
      switch (it.type) {
        case 'boolean': return false; // switch sempre tem valor
        case 'number':
        case 'temperature':
        case 'range':
        case 'rating': return a.value_number == null || Number.isNaN(a.value_number as number);
        case 'text':
        case 'date':
        case 'single_choice':
        case 'qr':
        case 'barcode': return !a.value_text?.trim();
        case 'multi_choice': return !Array.isArray(a.value_json) || (a.value_json as unknown[]).length === 0;
        case 'photo': return !a.photo_url?.trim();
        default: return false;
      }
    });
  }, [task, answers]);

  const handleStart = () => {
    if (!task || !currentStore?.id) return;
    startTask.mutate({ scheduleId: task.id, storeId: currentStore.id, existingExecutionId: task.execution?.id });
  };

  const handleComplete = () => {
    if (!task?.execution?.id) return;
    if (missingRequired.length > 0) {
      toast.error(`Preencha os itens obrigatórios (${missingRequired.length}).`);
      return;
    }
    completeTask.mutate(
      { scheduleId: task.id, executionId: task.execution.id, deadlineAt: task.deadline_at, items: task.items, answers, notes },
      { onSuccess: () => navigate('/admin/checkgrau/agenda') },
    );
  };

  if (isLoading || !task) {
    return <div className="mx-auto max-w-2xl p-4 md:p-8"><Skeleton className="h-64 w-full rounded-xl" /></div>;
  }

  const statusMeta = STATUS_META[task.status];

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-8">
      <button onClick={() => navigate('/admin/checkgrau/agenda')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:text-white/50">
        <ArrowLeft className="h-4 w-4" /> Voltar à agenda
      </button>

      {/* Cabeçalho da tarefa */}
      <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">{task.checklist?.name ?? 'Checklist'}</h1>
                {task.critical && <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Crítica" />}
              </div>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-white/40">
                {[task.sector?.name, task.shift?.name].filter(Boolean).join(' · ') || 'Sem setor/turno'}
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:bg-white/10 dark:text-white/60">
              {statusMeta.label}
            </span>
          </div>

          {!finished && (
            <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${countdown?.late ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300' : 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300'}`}>
              <Clock className="h-4 w-4" />
              {countdown?.late ? `Prazo vencido há ${countdown.txt}` : `Tempo restante: ${countdown?.txt ?? '—'}`}
              <span className="ml-auto font-mono text-xs opacity-70">prazo {(task.scheduled_time ?? '').slice(0, 5)}</span>
            </div>
          )}

          {finished && task.execution && (
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3 dark:bg-white/[0.03] sm:grid-cols-4">
              <div><p className="text-[11px] uppercase text-gray-400">SLA</p><p className="text-lg font-bold text-gray-900 dark:text-white">{task.execution.sla_score}%</p></div>
              <div><p className="text-[11px] uppercase text-gray-400">Tempo gasto</p><p className="text-lg font-bold text-gray-900 dark:text-white">{elapsedLabel(task.execution.started_at, task.execution.completed_at)}</p></div>
              <div><p className="text-[11px] uppercase text-gray-400">Conformidade</p><p className="text-lg font-bold text-gray-900 dark:text-white">{task.execution.conformidade != null ? `${task.execution.conformidade}%` : '—'}</p></div>
              <div><p className="text-[11px] uppercase text-gray-400">Status</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{statusMeta.label}</p></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resultado da execução concluída (leitura): respostas + fotos */}
      {finished && task.execution && (
        <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Respostas e evidências</p>
            <ExecutionResultView executionId={task.execution.id} completedBy={task.execution.completed_by} />
            {task.execution.notes && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600 dark:bg-white/[0.03] dark:text-white/60">
                <p className="text-[11px] font-semibold uppercase text-gray-400">Observações</p>
                {task.execution.notes}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Itens */}
      {started && !finished && (
        <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Itens do checklist</p>
            {task.items.length === 0 && <p className="text-sm text-gray-400">Este checklist não tem itens cadastrados.</p>}
            {task.items.map((it) => (
              <TaskItemField
                key={it.id}
                item={it}
                answer={answers[it.id] ?? {}}
                executionId={task.execution!.id}
                onChange={(partial) => setAnswer(it.id, partial)}
              />
            ))}
            <Textarea placeholder="Observações gerais (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      {!finished && (
        <div className="flex justify-end gap-2">
          {!started ? (
            <Button className="gap-1.5 bg-purple-600 hover:bg-purple-700" onClick={handleStart} disabled={startTask.isPending}>
              <Play className="h-4 w-4" /> Iniciar tarefa
            </Button>
          ) : (
            <Button className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={handleComplete} disabled={completeTask.isPending}>
              <CheckCircle2 className="h-4 w-4" /> Finalizar tarefa
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
