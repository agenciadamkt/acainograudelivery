import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTask, useCompleteTask, useSaveAnswer, type ChecklistItem, type ItemAnswer } from '@/hooks/operations/useTaskExecution';
import { useCollaborator } from '@/contexts/CollaboratorContext';
import { enqueueCompletion } from '@/lib/offline/completionQueue';
import { WizardItemField } from './_components/WizardItemField';

/** Um item obrigatório está completo? (valor principal + evidências exigidas) */
function isComplete(item: ChecklistItem, a: ItemAnswer = {}): boolean {
  if (item.require_photo && !a.photo_url) return false;
  if (item.require_gps && !a.gps) return false;
  if (item.require_comment && !a.comment?.trim()) return false;
  if (item.require_signature && !a.signature?.trim()) return false;
  if (!item.is_required) return true;
  switch (item.type) {
    case 'boolean': return a.value_boolean === true || a.value_boolean === false;
    case 'number': case 'temperature': case 'range': case 'rating':
      return a.value_number != null && !Number.isNaN(a.value_number);
    case 'text': case 'date': case 'single_choice': case 'qr': case 'barcode':
      return !!a.value_text?.trim();
    case 'multi_choice': return Array.isArray(a.value_json) && (a.value_json as unknown[]).length > 0;
    case 'photo': return !!a.photo_url;
    default: return true;
  }
}

export default function TaskWizardPage() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();
  const { data: task, isLoading } = useTask(scheduleId);
  const completeTask = useCompleteTask();
  const saveAnswer = useSaveAnswer();
  const { collaborator, selectedStore, stores } = useCollaborator();

  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<Record<string, ItemAnswer>>({});
  const [notes] = useState('');
  const [syncState, setSyncState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [indexSet, setIndexSet] = useState(false);

  const items = task?.items ?? [];
  const total = items.length;
  const current = items[index];
  const percent = total > 0 ? Math.floor(((index + 1) / total) * 100) : 0;
  const isLast = index >= total - 1;

  // Efeito para carregar as respostas existentes do banco + draft do localStorage
  useEffect(() => {
    if (task?.execution?.id) {
      const dbAnswers = task.execution.answers || {};
      const localDraftStr = localStorage.getItem(`cg_draft_${task.execution.id}`);
      const localDraft = localDraftStr ? JSON.parse(localDraftStr) : {};
      
      const mergedAnswers = { ...dbAnswers, ...localDraft };
      setAnswers(mergedAnswers);
    }
  }, [task?.execution?.id, task?.execution?.answers]);

  // Efeito para ir direto para a primeira incompleta ao carregar
  useEffect(() => {
    if (task && !isLoading && !indexSet && items.length > 0) {
      const dbAnswers = task.execution?.answers || {};
      const localDraftStr = localStorage.getItem(`cg_draft_${task.execution.id}`);
      const localDraft = localDraftStr ? JSON.parse(localDraftStr) : {};
      const mergedAnswers = { ...dbAnswers, ...localDraft };

      const firstInc = items.findIndex((it) => !isComplete(it, mergedAnswers[it.id]));
      if (firstInc !== -1) {
        setIndex(firstInc);
      }
      setIndexSet(true);
    }
  }, [task, isLoading, indexSet, items]);

  const handleAnswerChange = async (itemId: string, partial: ItemAnswer) => {
    const item = items.find((it) => it.id === itemId);
    if (!item || !task?.execution?.id) return;

    const currentAnswer = answers[itemId] ?? {};
    const updatedAnswer = { ...currentAnswer, ...partial };
    
    // Atualiza local state
    const nextAnswers = { ...answers, [itemId]: updatedAnswer };
    setAnswers(nextAnswers);

    // Salva no localStorage como backup imediato
    localStorage.setItem(`cg_draft_${task.execution.id}`, JSON.stringify(nextAnswers));

    // Auto save no Supabase se estiver online
    if (navigator.onLine) {
      setSyncState('saving');
      try {
        await saveAnswer.mutateAsync({
          executionId: task.execution.id,
          itemId,
          answer: updatedAnswer,
          itemType: item.type,
          itemConfig: { min_value: item.min_value, max_value: item.max_value },
        });
        setSyncState('saved');
        setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
      } catch (err) {
        console.error('Auto save error:', err);
        setSyncState('error');
      }
    } else {
      setSyncState('saved'); // Offline: consideramos "salvo" no localStorage local
    }
  };

  const firstIncomplete = useMemo(
    () => items.findIndex((it) => !isComplete(it, answers[it.id])),
    [items, answers],
  );

  if (isLoading || !task) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0F0F14]"><Loader2 className="h-6 w-6 animate-spin text-[#7C3AED]" /></div>;
  }
  // sem execução iniciada → volta pra tela de detalhes; concluída → conclusão
  if (task.execution?.completed_at) return <Navigate to={`/colaborador/tarefa/${task.id}/concluido`} replace />;
  if (!task.execution?.started_at) return <Navigate to={`/colaborador/tarefa/${task.id}`} replace />;

  const go = (delta: number) => {
    if (delta > 0 && current && !isComplete(current, answers[current.id])) {
      toast.error('Responda este item para continuar.');
      return;
    }
    setDir(delta);
    setIndex((i) => Math.min(total - 1, Math.max(0, i + delta)));
  };

  const handleFinish = () => {
    if (current && !isComplete(current, answers[current.id])) {
      toast.error('Responda este item para finalizar.');
      return;
    }
    if (firstIncomplete !== -1) {
      setDir(firstIncomplete < index ? -1 : 1);
      setIndex(firstIncomplete);
      toast.error('Há itens obrigatórios pendentes.');
      return;
    }

    const completedAtISO = new Date().toISOString();
    const checklistName = task.checklist?.name ?? 'Checklist';
    const store = selectedStore ?? stores[0] ?? null;

    // offline: enfileira e mostra a conclusão com os dados locais
    if (!navigator.onLine) {
      enqueueCompletion({
        id: crypto.randomUUID(),
        scheduleId: task.id,
        executionId: task.execution!.id,
        deadlineAt: task.deadline_at,
        storeId: store?.id,
        collaboratorId: collaborator?.id,
        checklistName,
        notes,
        items,
        answers,
        completedAtISO,
        queuedAt: Date.now(),
      }).finally(() => {
        navigate(`/colaborador/tarefa/${task.id}/concluido`, {
          state: { queued: true, checklistName, startedAt: task.execution!.started_at, completedAt: completedAtISO, deadlineAt: task.deadline_at },
        });
      });
      return;
    }

    completeTask.mutate(
      { scheduleId: task.id, executionId: task.execution!.id, deadlineAt: task.deadline_at, items, answers, notes, collaboratorId: collaborator?.id },
      { onSuccess: () => navigate(`/colaborador/tarefa/${task.id}/concluido`) },
    );
  };

  const sectorShift = [task.sector?.name, task.shift?.name].filter(Boolean).join(' · ') || 'Geral';

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-[#0F0F14]">
      {/* Cabeçalho + progresso */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white px-5 pb-4 pt-6 dark:border-white/[0.06] dark:bg-[#16161D]">
        <div className="mx-auto max-w-md">
          <button onClick={() => navigate(`/colaborador/tarefa/${task.id}`)} className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-white/50">
            <ArrowLeft className="h-4 w-4" /> Sair
          </button>
          <h1 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">{task.checklist?.name ?? 'Checklist'}</h1>
          <p className="text-xs text-gray-400">{sectorShift}</p>

          <div className="mt-3 flex items-center justify-between text-xs font-medium text-gray-500 dark:text-white/50">
            <span>Pergunta {Math.min(index + 1, total)} de {total}</span>
            <span>{percent}%</span>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            {syncState === 'saving' && (
              <span className="flex items-center gap-1 text-amber-500 font-semibold animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                Salvando...
              </span>
            )}
            {syncState === 'saved' && (
              <span className="flex items-center gap-1 text-green-600 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                Alterações salvas {lastSyncTime && `(Sincronizado: ${lastSyncTime})`}
              </span>
            )}
            {syncState === 'error' && (
              <span className="flex items-center gap-1 text-red-500 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Erro ao salvar rascunho.
              </span>
            )}
          </div>

          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
            <motion.div className="h-full rounded-full bg-[#7C3AED]" animate={{ width: `${percent}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
          </div>
        </div>
      </header>

      {/* Pergunta atual */}
      <main className="flex-1 px-5 py-6">
        <div className="mx-auto max-w-md">
          {total === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white/50 p-8 text-center text-sm text-gray-400 dark:border-white/10 dark:bg-white/[0.02]">
              Este checklist não tem perguntas.
            </div>
          ) : (
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={current.id}
                custom={dir}
                initial={{ opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.2 }}
              >
                <WizardItemField
                  item={current}
                  answer={answers[current.id] ?? {}}
                  executionId={task.execution!.id}
                  index={index + 1}
                  onChange={(p) => handleAnswerChange(current.id, p)}
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Navegação fixa */}
      <div className="sticky bottom-0 border-t border-gray-200 bg-white/95 p-4 backdrop-blur dark:border-white/10 dark:bg-[#16161D]/95">
        <div className="mx-auto flex max-w-md gap-3">
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-3.5 text-sm font-semibold text-gray-600 disabled:opacity-40 dark:border-white/10 dark:text-white/70"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          {isLast ? (
            <button
              onClick={handleFinish}
              disabled={completeTask.isPending}
              className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-xl bg-green-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 active:scale-[0.99] disabled:opacity-70"
            >
              {completeTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Finalizar
            </button>
          ) : (
            <button
              onClick={() => go(1)}
              className={cn('flex flex-[1.4] items-center justify-center gap-1.5 rounded-xl py-3.5 text-sm font-semibold text-white transition-colors active:scale-[0.99]',
                current && isComplete(current, answers[current.id]) ? 'bg-[#7C3AED] hover:bg-[#6D28D9]' : 'bg-[#7C3AED]/60')}
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
