/**
 * CheckGrau App — barra de navegação inferior (mobile). Início / Tarefas /
 * Histórico / Perfil, fixa no rodapé com safe-area para iPhone. A aba "Perfil"
 * abre o menu lateral (não navega).
 */

import { NavLink } from 'react-router-dom';
import { Home, ClipboardList, History, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { to: '/colaborador', label: 'Início', icon: Home, end: true },
  { to: '/colaborador/tarefas', label: 'Tarefas', icon: ClipboardList },
  { to: '/colaborador/historico', label: 'Histórico', icon: History },
];

const linkClass = (isActive: boolean) =>
  cn(
    'flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-medium transition-colors',
    isActive ? 'text-[#7C3AED]' : 'text-gray-400 dark:text-white/40',
  );

export function TabBar({ onProfilePress, profileActive }: { onProfilePress: () => void; profileActive?: boolean }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#16161D]/95">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => linkClass(isActive)}>
            {({ isActive }) => (
              <>
                <t.icon className={cn('h-[22px] w-[22px]', isActive && 'fill-[#7C3AED]/10')} strokeWidth={isActive ? 2.4 : 2} />
                {t.label}
              </>
            )}
          </NavLink>
        ))}
        <button type="button" onClick={onProfilePress} className={linkClass(!!profileActive)}>
          <User className={cn('h-[22px] w-[22px]', profileActive && 'fill-[#7C3AED]/10')} strokeWidth={profileActive ? 2.4 : 2} />
          Perfil
        </button>
      </div>
    </nav>
  );
}
