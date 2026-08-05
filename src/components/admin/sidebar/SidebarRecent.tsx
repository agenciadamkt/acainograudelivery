import type { ReactNode } from 'react';
import type { VisibleItem } from './navFilter';

interface Props {
  items: VisibleItem[];
  collapsed: boolean;
  renderItem: (item: VisibleItem) => ReactNode;
}

/** Recolhida, Recentes não aparece: competiria por espaço com os favoritos. */
export function SidebarRecent({ items, collapsed, renderItem }: Props) {
  if (collapsed || items.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recentes
        </span>
      </div>
      <div className="space-y-0.5">{items.map(renderItem)}</div>
    </div>
  );
}
