/**
 * CheckGrau App — Minhas tarefas (modelo aprovado tela 7). Abas Pendentes/Hoje/
 * Concluídas; quando offline mostra o selo "Offline" em cada tarefa. Tocar abre
 * os detalhes.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, WifiOff, AlertTriangle, CheckCircle2, Clock, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaborator } from '@/contexts/CollaboratorContext';
import { useCollaboratorTasks, todayISO } from '@/hooks/checkgrau/useCollaboratorTasks';
import { useOnline } from '@/hooks/useOnline';
import { STATUS_META, type TaskStatus } from '@/lib/operations/sla';
import type { ScheduleTask } from '@/hooks/operations/useAgenda';

type Tab = 'pendentes' | 'hoje' | 'concluidas';

const TONE: Record<string, string> = {
  neutral: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  good: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  warn: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  bad: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};

const isPending = (s: TaskStatus) => s === 'PENDING' || s === 'IN_PROGRESS' || s === 'MISSED';
const isDone = (s: TaskStatus) => s === 'COMPLETED' || s === 'LATE';

export default function MyTasksPage() {
  const navigate = useNavigate();
  const online = useOnline();
  const { selectedStore, stores, collaborator } = useCollaborator();
  const store = selectedStore ?? stores[0] ?? null;
  const { data, isLoading } = useCollaboratorTasks(store?.id, todayISO());
  const [tab, setTab] = useState<Tab>('pendentes');

  const allRaw = data ?? [];
  // Se o colaborador logado tiver ID, filtra para mostrar apenas as tarefas dele OU as tarefas não atribuídas a ninguém.
  const all = allRaw.filter((t) => !t.collaborator_id || t.collaborator_id === collaborator?.id);
  const pendentes = all.filter((t) => isPending(t.liveStatus));
  const concluidas = all.filter((t) => isDone(t.liveStatus));
  const list = tab === 'pendentes' ? pendentes : tab === 'concluidas' ? concluidas : all;

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'pendentes', label: 'Pendentes', count: pendentes.length },
    { key: 'hoje', label: 'Hoje', count: all.length },
    { key: 'concluidas', label: 'Concluídas', count: concluidas.length },
  ];

  return (
    <div className="min-h-screen">
      <header className="rounded-b-[28px] bg-[#7C3AED] px-5 pb-8 pt-7 text-white">
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-bold">Minhas tarefas</h1>
          <p className="mt-0.5 text-sm opacity-80">{store?.name ?? 'Sua loja'}</p>
        </div>
      </header>

      <div className="mx-auto -mt-5 max-w-md px-5">
        {/* Abas */}
        <div className="flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm dark:border-white/[0.06] dark:bg-[#16161D]">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn('flex-1 rounded-xl py-2 text-sm font-semibold transition-colors',
                tab === t.key ? 'bg-[#7C3AED] text-white' : 'text-gray-500 dark:text-white/50')}>
              {t.label}{t.count > 0 && ` (${t.count})`}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="mt-5 space-y-2.5">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/5" />)
          ) : list.length === 0 ? (
            <div className="mt-8 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-[#7C3AED] dark:bg-purple-500/10">
                <ClipboardList className="h-8 w-8" />
              </div>
              <p className="mt-4 font-semibold text-gray-900 dark:text-white">Nada por aqui</p>
              <p className="mt-1 text-sm text-gray-400">Nenhuma tarefa nesta aba.</p>
            </div>
          ) : (
            list.map((t) => <TaskRow key={t.id} task={t} offline={!online} onOpen={() => navigate(`/colaborador/tarefa/${t.id}`)} />)
          )}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, offline, onOpen }: { task: ScheduleTask; offline: boolean; onOpen: () => void }) {
  const meta = STATUS_META[task.liveStatus as TaskStatus];
  const done = isDone(task.liveStatus);
  const missed = task.liveStatus === 'MISSED';
  const Icon = done ? CheckCircle2 : missed ? AlertTriangle : Clock;
  return (
    <button onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.99] dark:border-white/[0.06] dark:bg-[#16161D]">
      <span className="w-12 font-mono text-sm font-semibold text-gray-900 dark:text-white">{(task.scheduled_time ?? '').slice(0, 5)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900 dark:text-white">{task.checklist?.name ?? 'Checklist'}</p>
        <p className="truncate text-xs text-gray-400">{[task.sector?.name, task.shift?.name].filter(Boolean).join(' · ') || 'Geral'}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold', TONE[meta.tone])}>
            <Icon className="h-3 w-3" /> {meta.label}
          </span>
          {offline && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-white/10 dark:text-white/50">
              <WifiOff className="h-3 w-3" /> Offline
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300" />
    </button>
  );
}
