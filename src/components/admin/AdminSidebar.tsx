import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
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
  Store,
  Megaphone,
  BarChart3,
  MessageSquare,
  ShoppingCart,
  Grid,
  Wallet,
  History,
  Barcode,
  PieChart,
  Leaf
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
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import logoCircular from '@/assets/logo-circular.png';


// Menu organizado por seções
const menuSections = [
  {
    label: '🏪 PDV (Frente de Caixa)',
    items: [
      { title: 'Nova Venda', url: '/admin/pdv/nova-venda', icon: ShoppingCart, highlight: true },
      { title: 'Mesas', url: '/admin/pdv/mesas', icon: Grid },
      { title: 'Caixa', url: '/admin/pdv/caixa', icon: Wallet },
      { title: 'Histórico', url: '/admin/pdv/historico', icon: History },
    ]
  },
  {
    label: '📊 Operação',
    items: [
      { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
      { title: 'Pedidos', url: '/admin/orders', icon: ShoppingBag },
      { title: 'KDS Cozinha', url: '/admin/kds', icon: Monitor },
      { title: 'Entregas', url: '/admin/delivery', icon: Truck },
      { title: 'Áreas de Entrega', url: '/admin/delivery/areas', icon: Truck },
      { title: 'Estoque', url: '/admin/inventory', icon: Package },
    ]
  },
  {
    label: '🍦 Cardápio',
    items: [
      { title: 'Categorias', url: '/admin/menu/categories', icon: FolderTree },
      { title: 'Produtos', url: '/admin/menu/products', icon: PackageOpen },
      { title: 'Complementos', url: '/admin/menu/toppings', icon: Plus },
      { title: 'Ingredientes', url: '/admin/menu/ingredients', icon: Leaf },
      { title: 'Promoções', url: '/admin/promotions', icon: Megaphone },
    ]
  },
  {
    label: '📈 Gestão',
    items: [
      { title: 'Financeiro', url: '/admin/financial', icon: DollarSign },
      { title: 'Clientes (CRM)', url: '/admin/customers', icon: Users },
      { title: 'Avaliações NPS', url: '/admin/feedback', icon: MessageSquare, requireRole: 'manager' },
      { title: 'Relatórios PDV', url: '/admin/pdv/relatorios', icon: PieChart, requireRole: 'manager' },
      { title: 'Food Analytics', url: '/admin/analytics', icon: BarChart3, requireRole: 'manager' },
    ]
  },
  {
    label: '📣 Marketing',
    items: [
      { title: 'Campanhas', url: '/admin/marketing', icon: Megaphone, requireRole: 'manager' },
    ]
  },
  {
    label: '⚙️ Sistema',
    items: [
      { title: 'Franqueados', url: '/admin/franchisees', icon: Store, requireRole: 'franchisee_master' },
      { title: 'Configurações PDV', url: '/admin/pdv/configuracoes', icon: Settings },
      { title: 'Configurações Gerais', url: '/admin/settings', icon: Settings },
    ]
  },
];


export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { signOut, user } = useAuth();

  const isActive = (path: string) => location.pathname === path;
  const isCollapsed = state === 'collapsed';


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
        {menuSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      className={item.highlight ? 'bg-primary/10 hover:bg-primary/20 font-semibold' : ''}
                    >
                      <NavLink to={item.url}>
                        <item.icon className={`h-4 w-4 ${item.highlight ? 'text-primary' : ''}`} />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
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
