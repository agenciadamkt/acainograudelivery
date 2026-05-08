import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Package,
  Menu,
} from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';

export function MobileBottomNav() {
  const { toggleSidebar } = useSidebar();
  const { data: badges } = useSidebarBadges();

  const tabs = [
    {
      title: 'Dashboard',
      url: '/admin/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Pedidos',
      url: '/admin/orders',
      icon: ShoppingBag,
      badge: badges?.pending ?? 0,
      badgeColor: 'bg-red-500',
    },
    {
      title: 'Nova Venda',
      url: '/admin/pdv/nova-venda',
      icon: ShoppingCart,
      highlight: true,
    },
    {
      title: 'Estoque',
      url: '/admin/stock/dashboard',
      icon: Package,
    },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t flex items-stretch h-16 safe-area-pb">
      {tabs.map(tab => (
        <NavLink
          key={tab.url}
          to={tab.url}
          className={({ isActive }) =>
            cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors relative',
              isActive
                ? tab.highlight
                  ? 'text-primary'
                  : 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className={cn('relative', tab.highlight && isActive && 'p-1.5 bg-primary/10 rounded-full')}>
                <tab.icon className={cn('h-5 w-5', tab.highlight && 'text-primary')} />
                {'badge' in tab && tab.badge > 0 && (
                  <span className={cn(
                    'absolute -top-1.5 -right-1.5 text-[9px] font-bold text-white rounded-full min-w-[16px] h-4 flex items-center justify-center px-1',
                    tab.badgeColor
                  )}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span>{tab.title}</span>
            </>
          )}
        </NavLink>
      ))}

      {/* Menu button — opens sidebar drawer */}
      <button
        className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={toggleSidebar}
      >
        <Menu className="h-5 w-5" />
        <span>Menu</span>
      </button>
    </nav>
  );
}
