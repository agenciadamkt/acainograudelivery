/**
 * CheckGrau App — Home do colaborador (redesenho Bloco 1). Segue o modelo
 * aprovado: header roxo, indicadores, card de destaque "Fazer agora" e a lista
 * de próximas tarefas. Tocar numa tarefa abre os detalhes.
 */

import { useNavigate } from 'react-router-dom';
import { Bell, CalendarClock, AlertTriangle, CheckCircle2, ChevronRight, ChevronDown, Play, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaborator } from '@/contexts/CollaboratorContext';
import { useCollaboratorTasks, taskCounts, todayISO } from '@/hooks/checkgrau/useCollaboratorTasks';
import { useUnreadCount } from '@/hooks/checkgrau/useNotifications';
import type { ScheduleTask } from '@/hooks/operations/useAgenda';

const PURPLE = '#7C3AED';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

/** "há 5 min" / "há 1h 12min" desde o prazo vencido. */
function lateLabel(deadlineAt: string): string {
  const diff = Date.now() - new Date(deadlineAt).getTime();
  if (diff <= 0) return '';
  const min = Math.floor(diff / 60000);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return `há ${h}h ${String(min % 60).padStart(2, '0')}min`;
}

const hhmm = (t?: string) => (t ?? '').slice(0, 5);
const sectorShift = (t: ScheduleTask) => [t.sector?.name, t.shift?.name].filter(Boolean).join(' · ') || 'Geral';

export default function CollaboratorHomePage() {
  const navigate = useNavigate();
  const { collaborator, selectedStore, stores } = useCollaborator();
  const store = selectedStore ?? stores[0] ?? null;
  const { data, isLoading } = useCollaboratorTasks(store?.id, todayISO());
  const { data: unread = 0 } = useUnreadCount(collaborator?.id, store?.id);

  const tasks = data ?? [];
  const c = taskCounts(tasks);
  const firstName = collaborator?.name?.split(' ')[0] ?? '';

  // tarefa em destaque: a mais urgente ainda executável (atrasadas primeiro, depois por horário)
  const actionable = tasks
    .filter((t) => ['PENDING', 'IN_PROGRESS', 'MISSED'].includes(t.liveStatus))
    .sort((a, b) => {
      const am = a.liveStatus === 'MISSED' ? 0 : 1;
      const bm = b.liveStatus === 'MISSED' ? 0 : 1;
      if (am !== bm) return am - bm;
      return (a.scheduled_time ?? '').localeCompare(b.scheduled_time ?? '');
    });
  const highlight = actionable[0] ?? null;
  const upcoming = actionable.slice(1);

  const openDetail = (id: string) => navigate(`/colaborador/tarefa/${id}`);

  const stats = [
    { label: 'Hoje', value: c.total, Icon: CalendarClock, color: PURPLE, bg: 'bg-purple-50 dark:bg-purple-500/10' },
    { label: 'Atrasadas', value: c.atrasadas, Icon: AlertTriangle, color: '#D97706', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Concluídas', value: c.concluidas, Icon: CheckCircle2, color: '#16A34A', bg: 'bg-green-50 dark:bg-green-500/10' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header roxo */}
      <header className="rounded-b-[28px] bg-[#7C3AED] px-5 pb-14 pt-7 text-white shadow-lg shadow-purple-900/10">
        <div className="mx-auto flex max-w-md items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm/none opacity-80">{greeting()},</p>
            <h1 className="mt-1 flex items-center gap-1.5 text-2xl font-bold">
              {firstName} <span aria-hidden>👋</span>
            </h1>
            <button
              onClick={() => stores.length > 1 && navigate('/colaborador/selecionar-loja')}
              className="mt-1.5 flex items-center gap-1 text-sm opacity-90"
            >
              {store?.name ?? 'Sem loja'}
              {stores.length > 1 && <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
          <button
            onClick={() => navigate('/colaborador/notificacoes')}
            className="relative rounded-full bg-white/10 p-2.5 hover:bg-white/20"
            aria-label="Notificações"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-[#7C3AED]">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Indicadores (sobrepostos ao header) */}
      <div className="mx-auto -mt-9 max-w-md px-5">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm dark:border-white/[0.06] dark:bg-[#16161D]">
              <div className={cn('mb-2 flex h-8 w-8 items-center justify-center rounded-lg', s.bg)}>
                <s.Icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <p className="text-xl font-bold leading-none text-gray-900 dark:text-white">{isLoading ? '—' : s.value}</p>
              <p className="mt-1 text-[11px] text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-6 px-5 pt-6">
        {/* FAZER AGORA */}
        {isLoading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/5" />
        ) : highlight ? (
          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#7C3AED]">Fazer agora</p>
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md shadow-purple-900/[0.04] dark:border-white/[0.06] dark:bg-[#16161D]">
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-base font-bold text-gray-900 dark:text-white">{hhmm(highlight.scheduled_time)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900 dark:text-white">{highlight.checklist?.name ?? 'Checklist'}</p>
                    <p className="truncate text-xs text-gray-400">{sectorShift(highlight)}</p>
                  </div>
                </div>
                {highlight.liveStatus === 'MISSED' && (
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-300">
                    <Clock className="h-3 w-3" /> Atrasada {lateLabel(highlight.deadline_at)}
                  </span>
                )}
              </div>
              <button
                onClick={() => openDetail(highlight.id)}
                className="flex w-full items-center justify-center gap-2 bg-[#7C3AED] py-3.5 font-semibold text-white transition-colors hover:bg-[#6D28D9]"
              >
                <Play className="h-4 w-4 fill-white" /> Executar agora
              </button>
            </div>
          </section>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white/50 p-8 text-center text-sm text-gray-400 dark:border-white/10 dark:bg-white/[0.02]">
            Tudo em dia por aqui 🎉
          </div>
        )}

        {/* PRÓXIMAS TAREFAS */}
        {upcoming.length > 0 && (
          <section>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Próximas tarefas</p>
            <div className="space-y-2">
              {upcoming.map((t) => (
                <button
                  key={t.id}
                  onClick={() => openDetail(t.id)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 text-left transition-transform active:scale-[0.99] dark:border-white/[0.06] dark:bg-[#16161D]"
                >
                  <span className="w-12 font-mono text-sm font-semibold text-gray-900 dark:text-white">{hhmm(t.scheduled_time)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-900 dark:text-white">{t.checklist?.name ?? 'Checklist'}</p>
                    <p className="truncate text-xs text-gray-400">{sectorShift(t)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
