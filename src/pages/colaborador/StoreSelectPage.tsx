/**
 * CheckGrau App — Seleção de loja (Bloco B). Quando o colaborador tem mais de
 * uma unidade, escolhe qual vai operar.
 */

import { useNavigate } from 'react-router-dom';
import { Store, ChevronRight } from 'lucide-react';
import { useCollaborator } from '@/contexts/CollaboratorContext';

export default function StoreSelectPage() {
  const navigate = useNavigate();
  const { stores, selectStore, collaborator } = useCollaborator();

  const choose = (id: string) => { selectStore(id); navigate('/colaborador', { replace: true }); };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10 dark:bg-[#0F0F14]">
      <div className="mx-auto max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Olá, {collaborator?.name?.split(' ')[0] ?? ''} 👋</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-white/50">Selecione a loja para começar.</p>

        <div className="mt-6 space-y-2.5">
          {stores.map((s) => (
            <button
              key={s.id} onClick={() => choose(s.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-purple-300 active:scale-[0.99] dark:border-white/[0.06] dark:bg-[#16161D]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-600/15">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900 dark:text-white">{s.name}</p>
                {s.city && <p className="truncate text-xs text-gray-400">{s.city}</p>}
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
