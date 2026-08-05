import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceTabs } from '@/contexts/WorkspaceTabsContext';
import { getTabMetadata, useWorkspaceTabBadges } from '@/utils/workspaceRegistry';
import { cn } from '@/lib/utils';
import { X, Pin, PinOff, Copy, Trash, ArrowRightToLine, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu';

interface WorkspaceTabProps {
  path: string;
}

const colorTextClasses: Record<string, string> = {
  'indigo-600': 'text-indigo-600 dark:text-indigo-400',
  'blue-600': 'text-blue-600 dark:text-blue-400',
  'purple-600': 'text-purple-600 dark:text-purple-400',
  'amber-600': 'text-amber-600 dark:text-amber-400',
  'sky-600': 'text-sky-600 dark:text-sky-400',
  'emerald-600': 'text-emerald-600 dark:text-emerald-400',
  'rose-600': 'text-rose-600 dark:text-rose-400',
  'teal-600': 'text-teal-600 dark:text-teal-400',
  'orange-600': 'text-orange-600 dark:text-orange-400',
  'pink-600': 'text-pink-600 dark:text-pink-400',
  'violet-600': 'text-violet-600 dark:text-violet-400',
  'cyan-600': 'text-cyan-600 dark:text-cyan-400',
  'red-600': 'text-red-600 dark:text-red-400',
  'zinc-600': 'text-zinc-600 dark:text-zinc-400'
};

export function WorkspaceTab({ path }: WorkspaceTabProps) {
  const navigate = useNavigate();
  const {
    activeTab,
    pinnedTabs,
    tabs,
    dirtyTabs,
    closeTab,
    closeOthers,
    closeRight,
    pinTab,
    unpinTab,
    duplicateTab
  } = useWorkspaceTabs();

  const { getBadgeValue } = useWorkspaceTabBadges();

  const isActive = path === activeTab;
  const isPinned = pinnedTabs.includes(path);
  const isDirty = !!dirtyTabs[path];
  
  const meta = getTabMetadata(path);
  const Icon = meta.icon;
  const badgeValue = getBadgeValue(path);
  const colorClass = colorTextClasses[meta.color] || colorTextClasses['zinc-600'];

  const handleTabClick = () => {
    if (!isActive) {
      navigate(path);
    }
  };

  // Botão do meio (Scroll) para fechar a aba
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      if (!isPinned && tabs.length > 1) {
        closeTab(path);
      }
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={handleTabClick}
          onMouseUp={handleMouseUp}
          className={cn(
            "group relative flex items-center gap-2 pl-3 pr-2 py-1.5 text-xs transition-all duration-150 rounded-t-lg h-9 border-r border-t border-l cursor-pointer select-none",
            isActive
              ? "bg-background border-zinc-200 dark:border-zinc-800 text-foreground shadow-[0_-2px_6px_rgba(0,0,0,0.03)] font-semibold"
              : "bg-muted/40 border-transparent text-muted-foreground hover:bg-muted hover:text-foreground font-normal"
          )}
          style={{
            borderTopColor: isActive ? `var(--primary)` : undefined,
            borderTopWidth: isActive ? '2px' : undefined
          }}
        >
          {/* Animação de entrada suave */}
          <motion.div
            layoutId={`active-tab-${path}`}
            className="absolute inset-0 rounded-t-lg pointer-events-none"
            transition={{ duration: 0.15 }}
          />

          {/* Ícone com cor do módulo */}
          <Icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors", isActive ? colorClass : "text-muted-foreground/60 group-hover:text-foreground")} />

          {/* Título da Aba */}
          <span className="truncate max-w-[100px]">{meta.title}</span>

          {/* Marcador de Dirty State (Modificação não salva) */}
          {isDirty && (
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" title="Alterações não salvas" />
          )}

          {/* Badge dinâmico (Contagem em tempo real) */}
          {badgeValue > 0 && (
            <span className="flex items-center justify-center bg-primary text-primary-foreground text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full shrink-0">
              {badgeValue > 99 ? '99+' : badgeValue}
            </span>
          )}

          {/* Botão de Fechar */}
          {!isPinned && tabs.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(path);
              }}
              className={cn(
                "p-0.5 rounded-full text-muted-foreground/50 hover:bg-zinc-150 hover:text-foreground dark:hover:bg-zinc-800 transition-colors ml-1",
                isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              <X className="h-3 w-3" />
            </button>
          )}

          {/* Pequena âncora visual para abas fixadas */}
          {isPinned && (
            <Pin className="h-2.5 w-2.5 text-primary shrink-0 rotate-45 opacity-80" />
          )}
        </div>
      </ContextMenuTrigger>

      {/* Menu de Contexto (Radix) no Clique Direito */}
      <ContextMenuContent className="w-48 bg-background border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-md p-1">
        <ContextMenuItem
          disabled={isPinned || tabs.length <= 1}
          onClick={() => closeTab(path)}
          className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded hover:bg-muted cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <span>Fechar</span>
          <Trash className="h-3 w-3" />
        </ContextMenuItem>
        
        <ContextMenuItem
          onClick={() => closeOthers(path)}
          className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded hover:bg-muted cursor-pointer focus:bg-muted"
        >
          <span>Fechar Outras</span>
          <Circle className="h-3 w-3" />
        </ContextMenuItem>
        
        <ContextMenuItem
          onClick={() => closeRight(path)}
          className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded hover:bg-muted cursor-pointer focus:bg-muted"
        >
          <span>Fechar à Direita</span>
          <ArrowRightToLine className="h-3 w-3" />
        </ContextMenuItem>
        
        <ContextMenuSeparator className="my-1 border-t border-zinc-150 dark:border-zinc-800" />
        
        {isPinned ? (
          <ContextMenuItem
            disabled={path === '/admin/dashboard'} // Dashboard é sempre fixo
            onClick={() => unpinTab(path)}
            className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded hover:bg-muted cursor-pointer focus:bg-muted"
          >
            <span>Desfixar Aba</span>
            <PinOff className="h-3 w-3" />
          </ContextMenuItem>
        ) : (
          <ContextMenuItem
            onClick={() => pinTab(path)}
            className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded hover:bg-muted cursor-pointer focus:bg-muted"
          >
            <span>Fixar Aba</span>
            <Pin className="h-3 w-3" />
          </ContextMenuItem>
        )}

        {meta.capabilities.supportsDuplicate && (
          <ContextMenuItem
            onClick={() => duplicateTab(path)}
            className="flex items-center justify-between px-2.5 py-1.5 text-xs rounded hover:bg-muted cursor-pointer focus:bg-muted"
          >
            <span>Duplicar</span>
            <Copy className="h-3 w-3" />
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
