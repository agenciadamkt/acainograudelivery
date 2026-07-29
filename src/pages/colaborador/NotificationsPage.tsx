/**
 * CheckGrau App — Central de notificações (Bloco 8, modelo aprovado tela 8).
 * Agrupa por dia (Hoje/Ontem/Anteriores), com categorias coloridas e "marcar
 * todas como lidas". Tocar abre a tarefa relacionada.
 */

import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle2, Bell, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaborator } from '@/contexts/CollaboratorContext';
import { useNotifications, type Notification, type NotifCategory } from '@/hooks/checkgrau/useNotifications';

const META: Record<NotifCategory, { icon: typeof Bell; fg: string; bg: string; dot: string }> = {
  late: { icon: AlertTriangle, fg: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10', dot: 'bg-red-500' },
  completed: { icon: CheckCircle2, fg: 'text-green-600', bg: 'bg-green-50 dark:bg-green-500/10', dot: 'bg-green-500' },
  new: { icon: Bell, fg: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10', dot: 'bg-blue-500' },
  critical: { icon: AlertTriangle, fg: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10', dot: 'bg-red-500' },
  message: { icon: MessageSquare, fg: 'text-[#7C3AED]', bg: 'bg-purple-50 dark:bg-purple-500/10', dot: 'bg-[#7C3AED]' },
};

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
function bucket(iso: string): 'Hoje' | 'Ontem' | 'Anteriores' {
  const t = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  if (t === today) return 'Hoje';
  if (t === today - 86400000) return 'Ontem';
  return 'Anteriores';
}
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { collaborator, selectedStore, stores } = useCollaborator();
  const store = selectedStore ?? stores[0] ?? null;
  const { data, isLoading, isError, unread, markAllRead, markRead } = useNotifications(collaborator?.id, store?.id);
  const items = data ?? [];

  const groups: Record<string, Notification[]> = {};
  for (const n of items) (groups[bucket(n.created_at)] ??= []).push(n);
  const order = ['Hoje', 'Ontem', 'Anteriores'].filter((g) => groups[g]?.length);

  const open = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.category === 'message') navigate('/colaborador/mensagens');
    else if (n.ref_schedule_id) navigate(`/colaborador/tarefa/${n.ref_schedule_id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0F0F14]">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white px-5 pb-4 pt-6 dark:border-white/[0.06] dark:bg-[#16161D]">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button onClick={() => navigate('/colaborador')} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Notificações</h1>
          {unread > 0 && (
            <button onClick={() => markAllRead.mutate()} className="ml-auto text-xs font-semibold text-[#7C3AED]">
              Marcar todas como lidas
            </button>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-5">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/5" />)}</div>
        ) : items.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-[#7C3AED] dark:bg-purple-500/10">
              <Bell className="h-8 w-8" />
            </div>
            <p className="mt-4 font-semibold text-gray-900 dark:text-white">Sem notificações</p>
            <p className="mt-1 text-sm text-gray-400">
              {isError ? 'Rode ADD_CHECKGRAU_NOTIFICATIONS.sql para ativar as notificações.' : 'Você está em dia. Novidades aparecem aqui.'}
            </p>
          </div>
        ) : (
          order.map((g) => (
            <section key={g} className="mb-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">{g}</p>
              <div className="space-y-2">
                {groups[g].map((n) => {
                  const m = META[n.category] ?? META.new;
                  return (
                    <button
                      key={n.id}
                      onClick={() => open(n)}
                      className={cn('flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left shadow-sm transition-transform active:scale-[0.99]',
                        n.read ? 'border-gray-100 bg-white dark:border-white/[0.06] dark:bg-[#16161D]' : 'border-gray-100 bg-white dark:border-white/[0.06] dark:bg-[#16161D]')}
                    >
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', m.bg)}>
                        <m.icon className={cn('h-5 w-5', m.fg)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-gray-900 dark:text-white">{n.title}</p>
                          <span className="ml-auto shrink-0 text-[11px] text-gray-400">{hhmm(n.created_at)}</span>
                        </div>
                        {n.body && <p className="mt-0.5 text-sm text-gray-500 dark:text-white/50">{n.body}</p>}
                      </div>
                      {!n.read && <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', m.dot)} />}
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
