import { NavLink } from 'react-router-dom';
import { Star, ArrowUp, ArrowDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import type { VisibleItem } from './navFilter';

export interface BadgeConfig {
  count: number;
  color: string;
}

interface Props {
  item: VisibleItem;
  collapsed: boolean;
  isActive: boolean;
  isFavorite: boolean;
  badge?: BadgeConfig;
  onToggleFavorite: (url: string) => void;
  /** Presentes só na lista de favoritos. */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function SidebarNavItem({
  item, collapsed, isActive, isFavorite, badge,
  onToggleFavorite, onMoveUp, onMoveDown,
}: Props) {
  const Icon = item.icon;
  const showBadge = badge && badge.count > 0;

  const link = (
    <NavLink
      to={item.url}
      aria-label={item.title}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group/item relative flex items-center gap-3 rounded-lg px-3 py-2',
        'text-sm font-medium transition-colors duration-[180ms]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        collapsed && 'justify-center px-0',
        // Ativo e hover usam o mesmo roxo sólido da marca (#683CB4 = --primary).
        // O que distingue os dois é a barra branca à esquerda, que só o ativo tem.
        isActive
          ? 'bg-primary text-primary-foreground font-semibold'
          : 'text-sidebar-foreground/80 hover:bg-primary hover:text-primary-foreground',
        item.highlight && !isActive && 'text-primary hover:text-primary-foreground',
      )}
    >
      {/* Barra de seleção: pseudo-elemento posicionado, não border-left,
          para não deslocar o conteúdo ao ativar. Branca porque o fundo do
          item ativo é o roxo sólido. */}
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-foreground"
        />
      )}

      <Icon className="h-4 w-4 shrink-0" />

      {!collapsed && <span className="flex-1 truncate">{item.title}</span>}

      {!collapsed && showBadge && (
        <span
          className={cn(
            'shrink-0 rounded-full px-1.5 text-[10px] font-bold leading-5',
            'min-w-[20px] text-center text-white',
            badge.color,
          )}
        >
          {badge.count > 99 ? '99+' : badge.count}
        </span>
      )}

      {/* Estrela aparece no hover; no modo recolhido não há espaço. */}
      {!collapsed && (
        <button
          type="button"
          aria-label={isFavorite ? `Remover ${item.title} dos favoritos` : `Adicionar ${item.title} aos favoritos`}
          aria-pressed={isFavorite}
          className={cn(
            'shrink-0 rounded p-0.5 transition-opacity',
            'opacity-0 focus-visible:opacity-100 group-hover/item:opacity-100',
            'hover:bg-primary-foreground/20',
            isFavorite && 'opacity-100',
          )}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(item.url); }}
        >
          <Star className={cn('h-3 w-3', isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-current opacity-60')} />
        </button>
      )}

      {!collapsed && (onMoveUp || onMoveDown) && (
        <span className="flex shrink-0 flex-col opacity-0 group-hover/item:opacity-100">
          <button
            type="button" aria-label={`Mover ${item.title} para cima`}
            disabled={!onMoveUp}
            className="rounded p-px hover:bg-primary-foreground/20 disabled:opacity-30"
            onClick={e => { e.preventDefault(); e.stopPropagation(); onMoveUp?.(); }}
          >
            <ArrowUp className="h-2.5 w-2.5 text-current opacity-60" />
          </button>
          <button
            type="button" aria-label={`Mover ${item.title} para baixo`}
            disabled={!onMoveDown}
            className="rounded p-px hover:bg-primary-foreground/20 disabled:opacity-30"
            onClick={e => { e.preventDefault(); e.stopPropagation(); onMoveDown?.(); }}
          >
            <ArrowDown className="h-2.5 w-2.5 text-current opacity-60" />
          </button>
        </span>
      )}
    </NavLink>
  );

  const comMenu = (
    <ContextMenu>
      <ContextMenuTrigger asChild>{link}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={() => window.open(item.url, '_blank', 'noopener')}>
          Abrir em nova aba
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onToggleFavorite(item.url)}>
          {isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => navigator.clipboard?.writeText(`${window.location.origin}${item.url}`)}
        >
          Copiar link
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  // No modo recolhido o nome do módulo só existe no tooltip — e no aria-label.
  if (!collapsed) return comMenu;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{comMenu}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {item.title}
        {showBadge && ` (${badge.count})`}
      </TooltipContent>
    </Tooltip>
  );
}
