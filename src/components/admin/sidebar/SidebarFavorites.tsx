import type { ReactNode } from 'react';
import { MAX_FAVORITES } from './prefsStorage';
import type { VisibleItem } from './navFilter';

interface Props {
  items: VisibleItem[];
  collapsed: boolean;
  renderItem: (item: VisibleItem, index: number, total: number) => ReactNode;
}

export function SidebarFavorites({ items, collapsed, renderItem }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      {!collapsed && (
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Favoritos
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            {items.length}/{MAX_FAVORITES}
          </span>
        </div>
      )}
      <div className="space-y-0.5">
        {items.map((item, i) => renderItem(item, i, items.length))}
      </div>
      {collapsed && <div className="mx-3 mt-2 border-t border-sidebar-border/60" />}
    </div>
  );
}
