import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VisibleItem } from './navFilter';

interface Props {
  label: string;
  items: VisibleItem[];
  collapsed: boolean;
  renderItem: (item: VisibleItem) => ReactNode;
}

export function SidebarSubGroup({ label, items, collapsed, renderItem }: Props) {
  const [open, setOpen] = useState(true);
  const id = `subgroup-${label.toLowerCase().replace(/\s+/g, '-')}`;

  // Recolhida: sem espaço para o título, os itens entram direto na lista.
  if (collapsed) return <>{items.map(renderItem)}</>;

  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex w-full items-center gap-1 rounded px-3 py-1',
          'text-[10px] font-semibold uppercase tracking-widest',
          'text-muted-foreground/60 transition-colors hover:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        )}
      >
        <ChevronDown
          className={cn('h-3 w-3 transition-transform duration-[180ms]', !open && '-rotate-90')}
          aria-hidden="true"
        />
        <span>{label}</span>
      </button>

      <div
        id={id}
        className={cn(
          'grid transition-[grid-template-rows] duration-[180ms] ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          {/* Guia vertical: reforça a hierarquia do subgrupo. */}
          <div className="ml-4 space-y-0.5 border-l border-sidebar-border pl-2">
            {open && items.map(renderItem)}
          </div>
        </div>
      </div>
    </div>
  );
}
