/**
 * Operações 2.0 — Agenda do dia (M1).
 * Lista as tarefas (schedules) da unidade numa data, agrupadas por status, e
 * permite gerar a agenda a partir das rotinas. Clicar numa tarefa abre a execução.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, AlertTriangle, ChevronRight, CalendarDays, CalendarRange } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useAgenda, useGenerateAgenda, useGenerateAgendaMonth, type ScheduleTask } from '@/hooks/operations/useAgenda';
import { STATUS_META, type TaskStatus } from '@/lib/operations/sla';

const TONE_CLS: Record<string, string> = {
  neutral: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  good: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  warn: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  bad: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
};

function StatusBadge({ status }: { status: TaskStatus }) {
  const m = STATUS_META[status];
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${TONE_CLS[m.tone]}`}>{m.label}</span>;
}

function TaskRow({ task, onOpen }: { task: ScheduleTask; onOpen: () => void }) {
  const done = task.liveStatus === 'COMPLETED' || task.liveStatus === 'LATE';
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-3.5 text-left transition-colors hover:border-purple-300 dark:border-white/[0.06] dark:bg-[#16161D] dark:hover:border-purple-500/50"
    >
      <div className="flex w-14 flex-col items-center">
        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{(task.scheduled_time ?? '').slice(0, 5)}</span>
        {task.critical && <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-500" aria-label="Crítica" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-gray-900 dark:text-white">{task.checklist?.name ?? 'Checklist'}</div>
        <div className="truncate text-xs text-gray-400 dark:text-white/40">
          {[task.sector?.name, task.shift?.name].filter(Boolean).join(' · ') || 'Sem setor/turno'}
        </div>
      </div>
      {done && task.execution?.sla_score != null && (
        <span className="hidden text-xs font-semibold text-gray-500 dark:text-white/50 sm:inline">SLA {task.execution.sla_score}%</span>
      )}
      <StatusBadge status={task.liveStatus} />
      <ChevronRight className="h-4 w-4 text-gray-300" />
    </button>
  );
}

function Group({ title, tasks, onOpen }: { title: string; tasks: ScheduleTask[]; onOpen: (id: string) => void }) {
  if (tasks.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-white/40">
        {title} · {tasks.length}
      </p>
      <div className="space-y-2">
        {tasks.map((t) => <TaskRow key={t.id} task={t} onOpen={() => onOpen(t.id)} />)}
      </div>
    </div>
  );
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AgendaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [date, setDate] = useState(todayISO());
  const [onlyMine, setOnlyMine] = useState(false);
  const { data, isLoading } = useAgenda(date);
  const generate = useGenerateAgenda();
  const generateMonth = useGenerateAgendaMonth();

  const tasks = (data ?? []).filter((t) => !onlyMine || t.responsible_user_id === user?.id);
  const pendentes = tasks.filter((t) => t.liveStatus === 'PENDING' || t.liveStatus === 'IN_PROGRESS');
  const atrasadas = tasks.filter((t) => t.liveStatus === 'MISSED');
  const concluidas = tasks.filter((t) => t.liveStatus === 'COMPLETED' || t.liveStatus === 'LATE');
  const canceladas = tasks.filter((t) => t.liveStatus === 'CANCELLED');
  const open = (id: string) => navigate(`/admin/checkgrau/tarefa/${id}`);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Agenda operacional</h1>
          <p className="text-sm text-gray-500 dark:text-white/40">Tarefas do dia geradas pelas rotinas.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/60">
            <Switch checked={onlyMine} onCheckedChange={setOnlyMine} /> Só as minhas
          </label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[150px]" />
          <Button
            variant="outline" size="sm" className="gap-1.5"
            onClick={() => generate.mutate(date)} disabled={generate.isPending || generateMonth.isPending}
          >
            <RefreshCw className={`h-4 w-4 ${generate.isPending ? 'animate-spin' : ''}`} /> Gerar dia
          </Button>
          <Button
            size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700"
            onClick={() => generateMonth.mutate(date)} disabled={generate.isPending || generateMonth.isPending}
          >
            <CalendarRange className={`h-4 w-4 ${generateMonth.isPending ? 'animate-pulse' : ''}`} /> Gerar mês
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : tasks.length === 0 ? (
        <Card className="border-gray-200 dark:border-white/[0.06] dark:bg-[#16161D]">
          <CardContent className="py-12 text-center text-sm text-gray-400">
            <CalendarDays className="mx-auto mb-2 h-8 w-8 opacity-40" />
            Sem tarefas nesta data. Clique em <b>Gerar agenda</b> para materializar as rotinas do dia.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          <Group title="A fazer" tasks={pendentes} onOpen={open} />
          <Group title="Atrasadas / não executadas" tasks={atrasadas} onOpen={open} />
          <Group title="Concluídas" tasks={concluidas} onOpen={open} />
          <Group title="Canceladas" tasks={canceladas} onOpen={open} />
        </div>
      )}
    </div>
  );
}
