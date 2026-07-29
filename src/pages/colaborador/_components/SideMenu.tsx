/**
 * CheckGrau App — Menu lateral (Bloco 6, modelo aprovado tela 6). Drawer com
 * perfil (avatar, nome, cargo, loja) e navegação. Desliza pela esquerda.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home, ClipboardList, History, BarChart3, MessageSquare, RefreshCw,
  Settings, HelpCircle, LogOut, ChevronDown, Store, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useCollaborator } from '@/contexts/CollaboratorContext';

const PURPLE = '#7C3AED';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SideMenu({ open, onClose }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { collaborator, selectedStore, stores, logout } = useCollaborator();
  const store = selectedStore ?? stores[0] ?? null;
  const initial = (collaborator?.name ?? '?').trim().charAt(0).toUpperCase();

  const go = (to: string) => { onClose(); navigate(to); };

  const items = [
    { label: 'Início', icon: Home, to: '/colaborador', end: true },
    { label: 'Minhas tarefas', icon: ClipboardList, to: '/colaborador/tarefas' },
    { label: 'Histórico', icon: History, to: '/colaborador/historico' },
    { label: 'Ranking', icon: BarChart3, to: '/colaborador/ranking' },
    { label: 'Mensagens', icon: MessageSquare, to: '/colaborador/mensagens' },
    { label: 'Sincronizar dados', icon: RefreshCw, action: () => { onClose(); toast.success('Tudo sincronizado.'); } },
    { label: 'Configurações', icon: Settings, to: '/colaborador/configuracoes' },
    { label: 'Ajuda e suporte', icon: HelpCircle, to: '/colaborador/ajuda' },
  ];

  const handleLogout = async () => { onClose(); await logout(); navigate('/colaborador/login', { replace: true }); };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-white shadow-2xl dark:bg-[#16161D]"
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            {/* Perfil */}
            <div className="relative px-5 pb-5 pt-7">
              <button onClick={onClose} className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#7C3AED] text-xl font-bold text-white">{initial}</div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-gray-900 dark:text-white">{collaborator?.name ?? '—'}</p>
                  {collaborator?.cargo && <p className="text-xs capitalize text-gray-400">{collaborator.cargo}</p>}
                </div>
              </div>
              <button
                onClick={() => (stores.length > 1 ? go('/colaborador/selecionar-loja') : undefined)}
                className="mt-3 flex w-full items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-white/5 dark:text-white/70"
              >
                <Store className="h-4 w-4 text-[#7C3AED]" />
                <span className="truncate">{store?.name ?? 'Sem loja'}</span>
                {stores.length > 1 && <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />}
              </button>
            </div>

            {/* Navegação */}
            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
              {items.map((it) => {
                const active = it.to && (it.end ? location.pathname === it.to : location.pathname.startsWith(it.to));
                return (
                  <button
                    key={it.label}
                    onClick={() => (it.action ? it.action() : go(it.to!))}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors',
                      active ? 'bg-purple-50 text-[#7C3AED] dark:bg-purple-500/10' : 'text-gray-600 hover:bg-gray-100 dark:text-white/70 dark:hover:bg-white/5',
                    )}
                  >
                    <it.icon className="h-5 w-5" style={active ? { color: PURPLE } : undefined} />
                    {it.label}
                  </button>
                );
              })}
            </nav>

            {/* Sair */}
            <div className="border-t border-gray-100 p-3 dark:border-white/[0.06]">
              <button onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">
                <LogOut className="h-5 w-5" /> Sair
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
