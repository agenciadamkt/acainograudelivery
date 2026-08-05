'use client';

/**
 * CheckGrau — menu dedicado do sistema de gestão operacional (Operações 2.0).
 * Segue o padrão do FinancialLayout: sidebar própria + Outlet.
 */

import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Gauge, CalendarCheck, CalendarClock, ClipboardCheck, LayoutGrid, Layers, RotateCcw,
  Trophy, Bell, Network, Store, Users, ChevronLeft, HelpCircle, LogOut, Menu, X, ShieldCheck, MessageSquare, Activity, BarChart3,
} from 'lucide-react';
import logoCircular from '@/assets/logo-circular.png';
import { StoreSelector } from '@/components/admin/StoreSelector';

const navItems = [
  { label: 'Painel', path: '/admin/checkgrau', icon: Gauge, end: true, group: 'Gestão' },
  { label: 'Rankings', path: '/admin/checkgrau/rankings', icon: Trophy, group: 'Gestão' },
  { label: 'Desempenho', path: '/admin/checkgrau/desempenho', icon: Users, group: 'Gestão' },
  { label: 'Engajamento', path: '/admin/checkgrau/engajamento', icon: Activity, group: 'Gestão' },
  { label: 'Rede', path: '/admin/checkgrau/rede', icon: Network, group: 'Gestão' },
  { label: 'Alertas', path: '/admin/checkgrau/alertas', icon: Bell, group: 'Gestão' },
  { label: 'Mensagens', path: '/admin/checkgrau/mensagens', icon: MessageSquare, group: 'Gestão' },
  { label: 'Relatórios', path: '/admin/checkgrau/relatorios', icon: BarChart3, group: 'Gestão' },
  { label: 'Lojas', path: '/admin/checkgrau/stores', icon: Store, group: 'Cadastros' },
  { label: 'Colaboradores', path: '/admin/checkgrau/collaborators', icon: Users, group: 'Cadastros' },
  { label: 'Agenda', path: '/admin/checkgrau/agenda', icon: CalendarCheck, group: 'Checklists' },
  { label: 'Rotinas', path: '/admin/checkgrau/rotinas', icon: CalendarClock, group: 'Checklists' },
  { label: 'Checklists', path: '/admin/checkgrau/checklists', icon: ClipboardCheck, group: 'Checklists' },
  { label: 'Setores & Turnos', path: '/admin/checkgrau/setores-turnos', icon: LayoutGrid, group: 'Checklists' },
  { label: 'Grupos de Contagem', path: '/admin/checkgrau/grupos-contagem', icon: Layers, group: 'Contagens' },
  { label: 'Contagens Recorrentes', path: '/admin/checkgrau/contagens-recorrentes', icon: RotateCcw, group: 'Contagens' },
];

export default function CheckGrauLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const userInitial = userName.charAt(0).toUpperCase();

  const currentTitle = navItems.find(
    (item) => (item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)),
  )?.label || 'CheckNoGrau';

  const handleLogout = async () => { await signOut(); navigate('/admin/login'); };

  if (!isMounted) return null;

  const Brand = (
    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/admin/hub')}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED] text-white">
        <ShieldCheck className="h-4.5 w-4.5" />
      </div>
      <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
        CheckNo<span className="text-[#7C3AED]">Grau</span>
      </span>
    </div>
  );

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3">
      {navItems.map((item, i) => (
        <div key={item.path}>
          {item.group !== navItems[i - 1]?.group && (
            <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-gray-300 dark:text-white/25">
              {item.group}
            </p>
          )}
          <NavLink
            to={item.path}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/25'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white',
              )
            }
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-[#0F0F14]">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white dark:border-white/[0.06] dark:bg-[#16161D]">
          <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">
            {Brand}
            <img src={logoCircular} alt="Logo" className="ml-auto h-6 w-6 rounded-full" />
          </div>
          <p className="px-6 pb-4 pt-2 text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-white/30">
            Gestão operacional
          </p>
          <NavList />
          <div className="space-y-1 border-t border-gray-100 px-3 py-4 dark:border-white/[0.06]">
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-white/50 dark:hover:bg-white/5"
              onClick={() => navigate('/admin/hub')}
            >
              <ChevronLeft className="h-[18px] w-[18px]" /> Voltar ao Hub
            </button>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-white/50 dark:hover:bg-white/5">
              <HelpCircle className="h-[18px] w-[18px]" /> Ajuda
            </button>
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/10"
              onClick={handleLogout}
            >
              <LogOut className="h-[18px] w-[18px]" /> Sair
            </button>
          </div>
        </aside>
      )}

      {/* Mobile header */}
      {isMobile && (
        <div className="fixed inset-x-0 top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#16161D]/80">
          <div className="flex h-14 items-center justify-between px-4">
            <button onClick={() => setMobileOpen(true)} className="-ml-2 rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-white/5">
              <Menu className="h-5 w-5 text-gray-700 dark:text-white/70" />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{currentTitle}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">{userInitial}</div>
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex w-72 flex-col bg-white shadow-2xl dark:bg-[#16161D]">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/[0.06]">
              {Brand}
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-white/5">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            {/* Unidade operada (mesma do Dashboard) — some quando há 1 loja. */}
            <div className="px-2 pt-3"><StoreSelector /></div>
            <div className="py-3"><NavList onNavigate={() => setMobileOpen(false)} /></div>
            <div className="border-t border-gray-100 px-3 py-4 dark:border-white/[0.06]">
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10" onClick={handleLogout}>
                <LogOut className="h-[18px] w-[18px]" /> Sair
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Content */}
      <main className={cn('flex-1', !isMobile && 'ml-64')}>
        {!isMobile && (
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/60 px-8 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#16161D]/60">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{currentTitle}</h1>
            <div className="flex items-center gap-3">
              {/* Unidade que está sendo operada (mesma do Dashboard) — some quando há 1 loja. */}
              <StoreSelector />
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-sm font-bold text-white shadow-sm">{userInitial}</div>
              <div className="text-right">
                <p className="text-sm font-medium leading-tight text-gray-900 dark:text-white">{userName}</p>
                <p className="text-[11px] text-gray-400 dark:text-white/30">CheckNoGrau</p>
              </div>
            </div>
          </header>
        )}
        <div className={cn(isMobile ? 'pt-14' : 'pt-0')}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
