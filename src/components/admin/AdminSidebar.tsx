import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Menu as MenuIcon,
  Package,
  DollarSign,
  Users,
  Settings,
  LogOut,
  Truck,
  Monitor,
  FolderTree,
  PackageOpen,
  Plus,
  ChevronDown,
  Store,
  Megaphone,
  BarChart3,
  MessageSquare
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import logoCircular from '@/assets/logo-circular.png';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const menuItems = [
  { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Franqueados', url: '/admin/franchisees', icon: Store, requireRole: 'franchisee_master' },
  { title: 'Pedidos', url: '/admin/orders', icon: ShoppingBag },
  { title: 'KDS Cozinha', url: '/admin/kds', icon: Monitor },
  {
    title: 'Cardápio',
    icon: MenuIcon,
    submenu: [
      { title: 'Categorias', url: '/admin/menu/categories', icon: FolderTree },
      { title: 'Produtos', url: '/admin/menu/products', icon: PackageOpen },
      { title: 'Complementos', url: '/admin/menu/toppings', icon: Plus },
    ]
  },
  { title: 'Estoque', url: '/admin/inventory', icon: Package },
  { title: 'Financeiro', url: '/admin/financial', icon: DollarSign },
  { title: 'Clientes (CRM)', url: '/admin/customers', icon: Users },
  { title: 'Entregas', url: '/admin/delivery', icon: Truck },
  { title: 'Food Analytics', url: '/admin/analytics', icon: BarChart3, requireRole: 'manager' },
  { title: 'Marketing', url: '/admin/marketing', icon: Megaphone, requireRole: 'manager' },
  { title: 'Promoções', url: '/admin/settings', icon: Settings }, // Example just to find context
  { title: 'Avaliações NPS', url: '/admin/feedback', icon: MessageSquare, requireRole: 'manager' },
  {
    title: 'Configurações',
    icon: Settings,
    submenu: [
      { title: 'Geral', url: '/admin/settings', icon: Settings },
      { title: 'Áreas de Entrega', url: '/admin/delivery/areas', icon: Truck },
    ]
  },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut, user } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const isCollapsed = state === 'collapsed';

  const isMenuActive = (item: any) => {
    if (item.url) return isActive(item.url);
    if (item.submenu) return item.submenu.some((sub: any) => isActive(sub.url));
    return false;
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <img src={logoCircular} alt="PedeGrau" className="h-10 w-10" />
          {!isCollapsed && (
            <div>
              <h2 className="font-bold text-lg">PedeGrau</h2>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                if (item.submenu) {
                  return (
                    <Collapsible key={item.title} defaultOpen={isMenuActive(item)}>
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton>
                            <item.icon className="h-4 w-4" />
                            {!isCollapsed && (
                              <>
                                <span>{item.title}</span>
                                <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                              </>
                            )}
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        {!isCollapsed && (
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.submenu.map((subItem: any) => (
                                <SidebarMenuSubItem key={subItem.url}>
                                  <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                                    <NavLink to={subItem.url}>
                                      <subItem.icon className="h-4 w-4" />
                                      <span>{subItem.title}</span>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        )}
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url!)}>
                      <NavLink to={item.url!}>
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        {!isCollapsed && user && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium truncate">{user.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
