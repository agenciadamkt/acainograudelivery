/**
 * CheckGrau App — Histórico de execuções do colaborador (item do menu lateral).
 * Filtros por período (Hoje/Semana/Mês); mostra checklist, data/hora, status e
 * score. Tocar num item abre os detalhes da tarefa.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaborator } from '@/contexts/CollaboratorContext';
import { useCollaboratorHistory, type HistoryRange } from '@/hooks/checkgrau/useCollaboratorHistory';
import { STATUS_META, type TaskStatus } from '@/lib/operations/sla';

const RANGES: { key: HistoryRange; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
];

const TONE: Record<string, string> = {
  good: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  warn: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  bad: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
};

const fmtDate = (iso: string | null) => (iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—');

export default function HistoryPage() {
  const navigate = useNavigate();
  const { selectedStore, stores } = useCollaborator();
  const store = selectedStore ?? stores[0] ?? null;
  const [range, setRange] = useState<HistoryRange>('hoje');
  const { data, isLoading } = useCollaboratorHistory(store?.id, range);
  const items = data ?? [];

  return (
    <div className="min-h-screen">
      <header className="rounded-b-[28px] bg-[#7C3AED] px-5 pb-8 pt-7 text-white">
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-bold">Histórico</h1>
          <p className="mt-0.5 text-sm opacity-80">Suas execuções concluídas</p>
        </div>
      </header>

      <div className="mx-auto -mt-5 max-w-md px-5">
        {/* Filtro de período */}
        <div className="flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm dark:border-white/[0.06] dark:bg-[#16161D]">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn('flex-1 rounded-xl py-2 text-sm font-semibold transition-colors',
                range === r.key ? 'bg-[#7C3AED] text-white' : 'text-gray-500 dark:text-white/50')}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="mt-5 space-y-2.5">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/5" />)
          ) : items.length === 0 ? (
            <div className="mt-8 flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-[#7C3AED] dark:bg-purple-500/10">
                <History className="h-8 w-8" />
              </div>
              <p className="mt-4 font-semibold text-gray-900 dark:text-white">Nada por aqui</p>
              <p className="mt-1 text-sm text-gray-400">Nenhuma execução neste período.</p>
            </div>
          ) : (
            items.map((it) => {
              const meta = STATUS_META[it.status as TaskStatus] ?? STATUS_META.COMPLETED;
              const late = it.status === 'LATE';
              return (
                <button
                  key={it.executionId}
                  onClick={() => it.scheduleId && navigate(`/colaborador/tarefa/${it.scheduleId}`)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.99] dark:border-white/[0.06] dark:bg-[#16161D]"
                >
                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                    late ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10' : 'bg-green-50 text-green-600 dark:bg-green-500/10')}>
                    {late ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">{it.checklistName}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {fmtDate(it.scheduledDate)} · {(it.scheduledTime ?? '').slice(0, 5)}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', TONE[meta.tone])}>{meta.label}</span>
                      {it.slaScore != null && <span className="text-[11px] font-bold text-gray-500 dark:text-white/50">{it.slaScore}%</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
