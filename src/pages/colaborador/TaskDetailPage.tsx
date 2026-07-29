/**
 * CheckGrau App — Detalhes da tarefa (Bloco 2, modelo aprovado tela 2).
 * Mostra o resumo da tarefa (sobre, horário, prioridade, responsável) e inicia
 * o checklist, levando ao fluxo passo-a-passo.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Flag, User, ClipboardList, Play, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaborator } from '@/contexts/CollaboratorContext';
import { useTask, useStartTask } from '@/hooks/operations/useTaskExecution';
import { deriveLiveStatus } from '@/lib/operations/sla';

function useOverdue(deadlineAt: string | undefined, active: boolean) {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [active]);
  if (!deadlineAt) return null;
  const diff = Date.now() - new Date(deadlineAt).getTime();
  if (diff <= 0) return null;
  const abs = diff;
  const h = Math.floor(abs / 3600000), m = Math.floor((abs % 3600000) / 60000), s = Math.floor((abs % 60000) / 1000);
  return `${h > 0 ? h + 'h ' : ''}${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export default function TaskDetailPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();
  const { collaborator, selectedStore, stores } = useCollaborator();
  const storeId = (selectedStore ?? stores[0])?.id;
  const { data: task, isLoading } = useTask(scheduleId);
  const startTask = useStartTask();

  const finished = !!task?.execution?.completed_at;
  const started = !!task?.execution?.started_at && !finished;
  const overdue = useOverdue(task?.deadline_at, !finished);

  const handleGo = async () => {
    if (!task || !storeId) return;
    if (finished) { navigate(`/colaborador/tarefa/${task.id}/concluido`); return; }
    try {
      await startTask.mutateAsync({ scheduleId: task.id, storeId, existingExecutionId: task.execution?.id });
      navigate(`/colaborador/tarefa/${task.id}/executar`);
    } catch { /* toast tratado no hook */ }
  };

  if (isLoading || !task) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0F0F14]"><Loader2 className="h-6 w-6 animate-spin text-[#7C3AED]" /></div>;
  }

  const sectorShift = [task.sector?.name, task.shift?.name].filter(Boolean).join(' · ') || 'Geral';
  const live = deriveLiveStatus(task.status, task.deadline_at);

  const rows = [
    { icon: Clock, label: 'Horário previsto', value: (task.scheduled_time ?? '').slice(0, 5) },
    { icon: Flag, label: 'Prioridade', value: task.critical ? 'Alta' : 'Normal', danger: task.critical },
    { icon: User, label: 'Responsável', value: collaborator?.name ?? '—' },
    { icon: ClipboardList, label: 'Checklist', value: task.checklist?.name ?? '—' },
  ];

  return (
    <div className="min-h-screen bg-white pb-28 dark:bg-[#0F0F14]">
      <div className="mx-auto max-w-md px-5 pt-6">
        <button onClick={() => navigate('/colaborador')} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-white/50">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>

        <h1 className="mt-5 text-2xl font-bold text-gray-900 dark:text-white">{task.checklist?.name ?? 'Checklist'}</h1>
        <p className="mt-1 text-sm text-gray-400">{sectorShift}</p>

        {overdue && !finished && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300">
            <Clock className="h-4 w-4" /> Prazo vencido há {overdue}
          </div>
        )}
        {finished && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 dark:bg-green-500/10 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" /> Tarefa concluída
          </div>
        )}

        {task.checklist?.description && (
          <section className="mt-6">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Sobre a tarefa</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-white/60">{task.checklist.description}</p>
          </section>
        )}

        <section className="mt-6 divide-y divide-gray-100 dark:divide-white/[0.06]">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 py-3.5">
              <r.icon className={cn('h-5 w-5', r.danger ? 'text-red-500' : 'text-gray-300')} />
              <div>
                <p className="text-[11px] uppercase tracking-wide text-gray-400">{r.label}</p>
                <p className={cn('text-sm font-semibold', r.danger ? 'text-red-600' : 'text-gray-900 dark:text-white')}>{r.value}</p>
              </div>
            </div>
          ))}
        </section>

        <p className="mt-4 text-center text-xs text-gray-400">{task.items.length} {task.items.length === 1 ? 'pergunta' : 'perguntas'} no checklist</p>
      </div>

      {/* Ação fixa */}
      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 p-4 backdrop-blur dark:border-white/10 dark:bg-[#16161D]/95">
        <div className="mx-auto max-w-md">
          <button onClick={handleGo} disabled={startTask.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7C3AED] py-4 text-base font-semibold text-white transition-colors hover:bg-[#6D28D9] active:scale-[0.99] disabled:opacity-70">
            {startTask.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : finished ? <CheckCircle2 className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
            {finished ? 'Ver conclusão' : started ? 'Continuar checklist' : 'Iniciar checklist'}
          </button>
        </div>
      </div>
    </div>
  );
}
