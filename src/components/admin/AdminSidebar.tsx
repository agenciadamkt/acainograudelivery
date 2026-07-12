import { Fragment, useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { APP_VERSION, APP_BUILD_NUMBER, APP_COMMIT } from '@/version';
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
  Leaf,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  ListChecks,
  ClipboardList,
  Settings2,
  FileText,
  UserCircle,
  Gift,
  RotateCcw,
  KanbanSquare,
  BookMarked,
  BarChart2,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Star,
  Search,
  Headphones,
  Video,
  CalendarDays,
  CalendarRange,
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
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';
import logoCircular from '@/assets/logo-circular.png';
import logoGrauOS from '@/assets/logo-grauos.png';
import { MODULE_MENUS, getActiveModule, type MenuItem, type MenuSection } from '@/config/adminModules';

interface BadgeConfig {
  count: number;
  color: string;
}

const STORAGE_OPEN = 'grauos_sidebar_open';
const STORAGE_FAVORITES = 'grauos_favorites';
const MAX_FAVORITES = 6;

function getInitialOpenSections(): Set<string> {
  try {
    const saved = localStorage.getItem(STORAGE_OPEN);
    if (saved) return new Set(JSON.parse(saved));
  } catch {}
  return new Set(['operacao', 'cardapio']);
}

function getInitialFavorites(): Set<string> {
  try {
    const saved = localStorage.getItem(STORAGE_FAVORITES);
    if (saved) return new Set(JSON.parse(saved));
  } catch {}
  return new Set();
}


export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, hasRole } = useAuth();
  const { can } = usePermissions();

  const [openSections, setOpenSections] = useState<Set<string>>(getInitialOpenSections);
  const [favorites, setFavorites] = useState<Set<string>>(getInitialFavorites);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: badgeData } = useSidebarBadges();

  const badgeMap = useMemo<Record<string, BadgeConfig>>(() => ({
    '/admin/orders': { count: badgeData?.pending ?? 0, color: 'bg-red-500' },
    '/admin/kds':    { count: badgeData?.kitchen ?? 0, color: 'bg-amber-500' },
  }), [badgeData]);

  const isActive = (path: string) => location.pathname === path;
  const isCollapsed = state === 'collapsed';
  const isMasterAdmin = user?.email === 'agenciadamkt@gmail.com' || hasRole('franchisee_master');

  // Cmd+K to open search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem(STORAGE_OPEN, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const toggleFavorite = (url: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else if (next.size < MAX_FAVORITES) {
        next.add(url);
      }
      try { localStorage.setItem(STORAGE_FAVORITES, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  // Módulo ativo (definido pelo cartão do Hub / inferido pela rota).
  // O sidebar renderiza APENAS as seções deste módulo — nunca mistura módulos.
  const activeModule = getActiveModule(location.pathname);
  const moduleSections = MODULE_MENUS[activeModule] ?? [];

  const filteredSections = moduleSections
    .map(section => {
      if (section.isMasterOnly && !isMasterAdmin) return null;
      if (section.requireRole && !hasRole(section.requireRole)) return null;

      const filteredItems = section.items.filter(item => {
        if (item.isMasterOnly && !isMasterAdmin) return false;
        if (item.requireRole && !hasRole(item.requireRole)) return false;
        if (item.requiredPermission && !can(item.requiredPermission, 1)) return false;
        return true;
      });

      if (filteredItems.length === 0) return null;
      return { ...section, items: filteredItems };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  // All items visible to this user (for search + favorites resolution)
  const allVisibleItems = filteredSections.flatMap(s =>
    s.items.map(item => ({ ...item, sectionLabel: s.label }))
  );

  const favoritedItems = allVisibleItems.filter(item => favorites.has(item.url));

  const searchResults = searchQuery.trim().length >= 2
    ? allVisibleItems.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const renderMenuItem = (item: MenuItem & { sectionLabel?: string }, showStar = true) => {
    const badge = badgeMap[item.url];
    const activeBadge = badge && badge.count > 0 ? badge : undefined;
    const starOffset = activeBadge ? 'right-7' : 'right-1.5';

    return (
      <SidebarMenuItem key={item.url} className="group/item relative">
        <SidebarMenuButton
          asChild
          isActive={isActive(item.url)}
          className={cn(
            'transition-colors duration-150',
            item.highlight
              ? 'bg-primary/10 hover:bg-primary/20 font-semibold text-primary'
              : 'hover:text-primary data-[active=true]:text-primary data-[active=true]:font-semibold'
          )}
        >
          <NavLink to={item.url}>
            <item.icon className={cn('h-4 w-4 shrink-0', item.highlight && 'text-primary')} />
            {!isCollapsed && <span className="flex-1 truncate">{item.title}</span>}
            {!isCollapsed && activeBadge && (
              <span className={cn(
                'text-[10px] font-bold text-white rounded-full px-1.5 leading-5 min-w-[20px] text-center shrink-0',
                activeBadge.color
              )}>
                {activeBadge.count > 99 ? '99+' : activeBadge.count}
              </span>
            )}
          </NavLink>
        </SidebarMenuButton>

        {/* Favorite toggle — only in expanded mode */}
        {showStar && !isCollapsed && (
          <button
            className={cn(
              'absolute top-1/2 -translate-y-1/2 z-10 p-0.5 rounded opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-accent',
              starOffset
            )}
            onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFavorite(item.url); }}
            title={favorites.has(item.url) ? 'Remover dos favoritos' : `Adicionar aos favoritos (${favorites.size}/${MAX_FAVORITES})`}
          >
            <Star
              className={cn(
                'h-3 w-3 transition-colors',
                favorites.has(item.url)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              )}
            />
          </button>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b p-4">
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate('/admin/hub')}
          >
            {isCollapsed ? (
              <img src={logoCircular} alt="Logo" className="h-8 w-8" />
            ) : (
              <img src={logoGrauOS} alt="GrauOS" className="h-14 w-auto object-contain" />
            )}
          </div>

          {/* Search trigger */}
          {!isCollapsed && (
            <button
              className="mt-2 flex items-center gap-2 w-full text-xs text-muted-foreground border rounded-md px-2 py-1.5 hover:border-primary/40 hover:text-foreground transition-colors"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-3 w-3 shrink-0" />
              <span className="flex-1 text-left">Buscar no menu...</span>
              <kbd className="text-[10px] border rounded px-1 py-0.5 hidden sm:inline">⌘K</kbd>
            </button>
          )}
          {isCollapsed && (
            <button
              className="mt-2 flex items-center justify-center w-full p-1.5 rounded-md hover:bg-accent transition-colors"
              onClick={() => setSearchOpen(true)}
              title="Buscar (⌘K)"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </SidebarHeader>

        <SidebarContent>
          {/* Favorites section */}
          {favoritedItems.length > 0 && !isCollapsed && (
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center justify-between px-2 py-1">
                <span>📌 FAVORITOS</span>
                <span className="text-[10px] text-muted-foreground/60">{favoritedItems.length}/{MAX_FAVORITES}</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {favoritedItems.map(item => renderMenuItem(item))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Main sections */}
          {filteredSections.map(section => {
            const isOpen = isCollapsed || openSections.has(section.id);

            return (
              <SidebarGroup key={section.id}>
                {!isCollapsed && (
                  <SidebarGroupLabel
                    className="cursor-pointer select-none hover:text-primary transition-colors duration-150 flex items-center justify-between px-2 py-1"
                    onClick={() => toggleSection(section.id)}
                  >
                    <span>{section.label}</span>
                    {isOpen ? (
                      <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                  </SidebarGroupLabel>
                )}

                <SidebarGroupContent className={cn(!isOpen && 'hidden')}>
                  <SidebarMenu>
                    {section.items.map((item, index) => {
                      const prevItem = index > 0 ? section.items[index - 1] : null;
                      const showSubGroupLabel =
                        !isCollapsed &&
                        item.subGroup &&
                        (!prevItem || prevItem.subGroup !== item.subGroup);

                      return (
                        <Fragment key={item.url}>
                          {showSubGroupLabel && (
                            <div className="px-2 pt-3 pb-1">
                              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                {item.subGroup}
                              </span>
                            </div>
                          )}
                          {renderMenuItem(item)}
                        </Fragment>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          })}
        </SidebarContent>

        <SidebarFooter className="border-t p-4 space-y-1">
          {!isCollapsed && user && (
            <div className="mb-2 px-2">
              <p className="text-xs font-medium truncate text-muted-foreground">{user.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => navigate('/admin/meu-perfil')}
          >
            <UserCircle className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Meu Perfil</span>}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Sair</span>}
          </Button>
          {!isCollapsed && (
            <p className="text-[10px] text-center text-muted-foreground pt-1" title={`Build ${APP_BUILD_NUMBER} · ${APP_COMMIT}`}>
              GrauOS <span className="font-bold text-foreground">{APP_VERSION}</span>
            </p>
          )}
        </SidebarFooter>
      </Sidebar>

      {/* Search dialog */}
      <Dialog open={searchOpen} onOpenChange={open => { setSearchOpen(open); if (!open) setSearchQuery(''); }}>
        <DialogContent className="p-0 gap-0 max-w-md overflow-hidden" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Buscar no menu</DialogTitle>

          {/* Search input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              autoFocus
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              placeholder="Buscar no menu..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchResults.length > 0) {
                  navigate(searchResults[0].url);
                  setSearchOpen(false);
                  setSearchQuery('');
                }
              }}
            />
            <kbd className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">ESC</kbd>
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map(item => (
                <button
                  key={item.url}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent text-left transition-colors"
                  onClick={() => {
                    navigate(item.url);
                    setSearchOpen(false);
                    setSearchQuery('');
                  }}
                >
                  <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium leading-tight">{item.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{item.sectionLabel}</div>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0 ml-auto" />
                </button>
              ))
            ) : searchQuery.trim().length >= 2 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum resultado para "<strong>{searchQuery}</strong>"
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Digite 2+ caracteres para buscar
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
