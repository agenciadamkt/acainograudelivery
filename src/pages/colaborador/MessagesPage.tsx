/**
 * CheckGrau App — Mensagens do gestor (colaborador). Lista de avisos; tocar
 * expande e marca como lida. Broadcasts da loja + mensagens diretas.
 */

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaborator } from '@/contexts/CollaboratorContext';
import { useCollaboratorMessages, type Message } from '@/hooks/checkgrau/useMessages';

const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (day.getTime() === today.getTime()) return `Hoje ${time}`;
  if (day.getTime() === today.getTime() - 86400000) return `Ontem ${time}`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + time;
};

export default function MessagesPage() {
  const { collaborator, selectedStore, stores } = useCollaborator();
  const store = selectedStore ?? stores[0] ?? null;
  const { data, isLoading, isError, markRead } = useCollaboratorMessages(collaborator?.id, store?.id);
  const [open, setOpen] = useState<string | null>(null);
  const items = data ?? [];

  const toggle = (m: Message) => {
    setOpen((cur) => (cur === m.id ? null : m.id));
    if (!m.read) markRead.mutate(m.id);
  };

  return (
    <div className="min-h-screen">
      <header className="rounded-b-[28px] bg-[#7C3AED] px-5 pb-8 pt-7 text-white">
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-bold">Mensagens</h1>
          <p className="mt-0.5 text-sm opacity-80">Avisos do gestor</p>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 py-5">
        {isLoading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/5" />)}</div>
        ) : items.length === 0 ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-[#7C3AED] dark:bg-purple-500/10">
              <MessageSquare className="h-8 w-8" />
            </div>
            <p className="mt-4 font-semibold text-gray-900 dark:text-white">Nenhuma mensagem</p>
            <p className="mt-1 text-sm text-gray-400">
              {isError ? 'Rode ADD_CHECKGRAU_MESSAGES.sql para ativar as mensagens.' : 'Avisos do gestor aparecem aqui.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((m) => {
              const expanded = open === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m)}
                  className={cn('w-full rounded-2xl border p-4 text-left shadow-sm transition-colors',
                    m.read ? 'border-gray-100 bg-white dark:border-white/[0.06] dark:bg-[#16161D]' : 'border-purple-200 bg-purple-50/50 dark:border-purple-500/20 dark:bg-purple-500/[0.06]')}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', m.read ? 'bg-gray-100 text-gray-400 dark:bg-white/10' : 'bg-purple-100 text-[#7C3AED] dark:bg-purple-500/15')}>
                      <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-gray-900 dark:text-white">{m.title || 'Aviso'}</p>
                        <span className="ml-auto shrink-0 text-[11px] text-gray-400">{when(m.created_at)}</span>
                      </div>
                      <p className={cn('mt-0.5 text-sm text-gray-600 dark:text-white/60', !expanded && 'line-clamp-2')}>{m.body}</p>
                      <p className="mt-1.5 text-[11px] text-gray-400">{m.sender_name || 'Gestor'}</p>
                    </div>
                    {!m.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#7C3AED]" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
