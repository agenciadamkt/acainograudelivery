/**
 * CheckGrau App — Ranking / Meu Score (item do menu lateral). Card com a
 * pontuação acumulada e a posição do colaborador + ranking da loja.
 */

import { Trophy, Medal, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollaborator } from '@/contexts/CollaboratorContext';
import { useCheckgrauRanking } from '@/hooks/checkgrau/useCheckgrauRanking';

const MEDAL = ['#F59E0B', '#9CA3AF', '#B45309']; // ouro, prata, bronze

export default function RankingPage() {
  const { collaborator, selectedStore, stores } = useCollaborator();
  const store = selectedStore ?? stores[0] ?? null;
  const { data, isLoading, isError } = useCheckgrauRanking(store?.id);
  const rows = data ?? [];

  const me = rows.find((r) => r.collaboratorId === collaborator?.id) ?? null;
  const total = rows.length;

  return (
    <div className="min-h-screen">
      <header className="rounded-b-[28px] bg-[#7C3AED] px-5 pb-16 pt-7 text-white">
        <div className="mx-auto max-w-md">
          <h1 className="text-2xl font-bold">Ranking</h1>
          <p className="mt-0.5 text-sm opacity-80">{store?.name ?? 'Sua loja'}</p>
        </div>
      </header>

      <div className="mx-auto -mt-10 max-w-md space-y-5 px-5">
        {/* Meu Score */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-md dark:border-white/[0.06] dark:bg-[#16161D]">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#7C3AED]">Meu Score</p>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-4xl font-black leading-none text-gray-900 dark:text-white">{isLoading ? '—' : me?.points ?? 0}</p>
              <p className="mt-1 text-xs text-gray-400">pontos acumulados</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-purple-50 px-3 py-2 dark:bg-purple-500/10">
              <Trophy className="h-5 w-5 text-[#7C3AED]" />
              <div className="leading-none">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{me ? `${me.position}º` : '—'}</p>
                <p className="mt-0.5 text-[10px] text-gray-400">de {total || '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ranking da loja */}
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Classificação da loja</p>
          <div className="space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-200 dark:bg-white/5" />)
            ) : rows.length === 0 ? (
              <div className="mt-6 flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-[#7C3AED] dark:bg-purple-500/10">
                  <Star className="h-8 w-8" />
                </div>
                <p className="mt-4 font-semibold text-gray-900 dark:text-white">Ainda sem pontos</p>
                <p className="mt-1 text-sm text-gray-400">
                  {isError ? 'Rode ADD_CHECKGRAU_POINTS.sql para ativar a pontuação.' : 'Conclua checklists para pontuar e subir no ranking.'}
                </p>
              </div>
            ) : (
              rows.map((r) => {
                const isMe = r.collaboratorId === collaborator?.id;
                const medal = r.position <= 3 ? MEDAL[r.position - 1] : null;
                return (
                  <div
                    key={r.collaboratorId}
                    className={cn('flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm',
                      isMe ? 'border-[#7C3AED] bg-purple-50/60 dark:bg-purple-500/10' : 'border-gray-100 bg-white dark:border-white/[0.06] dark:bg-[#16161D]')}
                  >
                    <div className="flex w-8 justify-center">
                      {medal ? <Medal className="h-6 w-6" style={{ color: medal }} /> : <span className="text-sm font-bold text-gray-400">{r.position}º</span>}
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7C3AED] text-sm font-bold text-white">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <p className={cn('min-w-0 flex-1 truncate font-semibold', isMe ? 'text-[#7C3AED]' : 'text-gray-900 dark:text-white')}>
                      {r.name}{isMe && ' (você)'}
                    </p>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{r.points}<span className="ml-1 text-[11px] font-normal text-gray-400">pts</span></span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
