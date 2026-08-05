import { useNavigate } from 'react-router-dom';
import { Plus, ShoppingCart, Grid, PackageOpen, ClipboardCheck, Users } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { VisibleItem } from './navFilter';

interface Props {
  collapsed: boolean;
  /** Itens visíveis ao usuário; usados para não oferecer ação sem permissão. */
  visibleItems: VisibleItem[];
}

// Cada ação aponta para uma rota que já existe e é liberada pela mesma
// permissão do item de menu correspondente.
const ACOES = [
  { label: 'Novo Pedido', url: '/admin/pdv/nova-venda', icon: ShoppingCart },
  { label: 'Nova Mesa', url: '/admin/pdv/mesas', icon: Grid },
  { label: 'Novo Produto', url: '/admin/menu/products', icon: PackageOpen },
  { label: 'Nova Compra', url: '/admin/stock/purchases', icon: ClipboardCheck },
  { label: 'Novo Usuário', url: '/admin/settings/usuarios', icon: Users },
];

export function SidebarQuickActions({ collapsed, visibleItems }: Props) {
  const navigate = useNavigate();
  const permitidas = new Set(visibleItems.map(i => i.url));
  const acoes = ACOES.filter(a => permitidas.has(a.url));

  if (acoes.length === 0) return null;

  const gatilho = (
    <button
      type="button"
      aria-label="Ações rápidas"
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg py-2',
        'bg-primary text-primary-foreground text-sm font-medium',
        'transition-opacity duration-[180ms] hover:opacity-90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        collapsed ? 'mx-auto w-9' : 'w-full',
      )}
    >
      <Plus className="h-4 w-4 shrink-0" />
      {!collapsed && <span>Criar</span>}
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>{gatilho}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>Ações rápidas</TooltipContent>
          </Tooltip>
        ) : gatilho}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-48">
        {acoes.map(a => (
          <DropdownMenuItem key={a.url} onSelect={() => navigate(a.url)}>
            <a.icon className="mr-2 h-4 w-4" />
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
