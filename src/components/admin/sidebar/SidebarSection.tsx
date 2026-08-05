import { Fragment, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarSubGroup } from './SidebarSubGroup';
import type { MenuSection } from '@/config/adminModules';
import type { VisibleItem } from './navFilter';

interface Props {
  section: MenuSection;
  collapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
  renderItem: (item: VisibleItem) => ReactNode;
}

/** Agrupa itens consecutivos que compartilham o mesmo `subGroup`. */
function agrupar(items: VisibleItem[]): { label: string | null; items: VisibleItem[] }[] {
  const out: { label: string | null; items: VisibleItem[] }[] = [];
  for (const item of items) {
    const label = item.subGroup ?? null;
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.label === label) ultimo.items.push(item);
    else out.push({ label, items: [item] });
  }
  return out;
}

export function SidebarSection({ section, collapsed, isOpen, onToggle, renderItem }: Props) {
  const id = `section-${section.id}`;
  const items = section.items as VisibleItem[];
  const grupos = agrupar(items);

  // Recolhida: sem título; um separador preserva a noção de bloco.
  if (collapsed) {
    return (
      <div className="space-y-0.5 border-t border-sidebar-border/60 pt-2 first:border-t-0 first:pt-0">
        {items.map(renderItem)}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between rounded px-3 py-1.5',
          'text-[11px] font-semibold uppercase tracking-wider',
          'text-muted-foreground transition-colors hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        )}
      >
        <span className="truncate">{section.label}</span>
        <ChevronDown
          className={cn('h-3 w-3 shrink-0 transition-transform duration-[180ms]', !isOpen && '-rotate-90')}
          aria-hidden="true"
        />
      </button>

      <div
        id={id}
        role="region"
        aria-label={section.label}
        className={cn(
          'grid transition-[grid-template-rows] duration-[180ms] ease-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          {/* Grupo fechado desmonta de verdade (não é só `hidden`) — foi a
              alternativa escolhida no lugar de virtualizar. */}
          {isOpen && (
            <div className="mt-1 space-y-0.5">
              {grupos.map((g, i) => (
                <Fragment key={g.label ?? `sem-grupo-${i}`}>
                  {g.label
                    ? <SidebarSubGroup label={g.label} items={g.items} collapsed={false} renderItem={renderItem} />
                    : g.items.map(renderItem)}
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
