import { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Search, Sparkles } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from '@/components/ui/sidebar';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';
import { useWorkspaceTabs } from '@/contexts/WorkspaceTabsContext';
import logoCircular from '@/assets/logo-circular.png';
import logoGrauOS from '@/assets/logo-grauos.png';

import { useSidebarNav } from './useSidebarNav';
import { useSidebarPrefs } from './useSidebarPrefs';
import { SidebarNavItem, type BadgeConfig } from './SidebarNavItem';
import { SidebarSection } from './SidebarSection';
import { SidebarFavorites } from './SidebarFavorites';
import { SidebarRecent } from './SidebarRecent';
import { SidebarQuickActions } from './SidebarQuickActions';
import { SidebarUserMenu } from './SidebarUserMenu';
import type { VisibleItem } from './navFilter';

export function AdminSidebarV2() {
  const location = useLocation();
  const navigate = useNavigate();

  const { sections, allVisibleItems } = useSidebarNav(location.pathname);
  const prefs = useSidebarPrefs();
  const { data: badgeData } = useSidebarBadges();

  // Ctrl+K NÃO é registrado aqui: o CommandLauncher já registra esse atalho.
  // A sidebar apenas abre a paleta que já existe.
  const { setCommandLauncherOpen } = useWorkspaceTabs();

  // O primitivo é a fonte de verdade do recolhido. No mobile ele vira Sheet
  // (largura cheia), então lá `collapsed` é sempre false.
  const { state, isMobile, toggleSidebar, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;

  const badgeMap = useMemo<Record<string, BadgeConfig>>(() => ({
    '/admin/orders': { count: badgeData?.pending ?? 0, color: 'bg-red-500' },
    '/admin/kds': { count: badgeData?.kitchen ?? 0, color: 'bg-amber-500' },
  }), [badgeData]);

  // Registra a tela atual em Recentes.
  const { pushRecent } = prefs;
  useEffect(() => {
    if (allVisibleItems.some(i => i.url === location.pathname)) {
      pushRecent(location.pathname);
    }
  }, [location.pathname, allVisibleItems, pushRecent]);

  // No mobile, navegar precisa fechar o Sheet — senão ele cobre a tela nova.
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname, isMobile, setOpenMobile]);

  const porUrl = useMemo(
    () => new Map(allVisibleItems.map(i => [i.url, i])),
    [allVisibleItems],
  );

  const favoritos = prefs.favorites
    .map(url => porUrl.get(url))
    .filter((i): i is VisibleItem => i !== undefined);

  const recentes = prefs.recent
    .filter(url => url !== location.pathname)
    .map(url => porUrl.get(url))
    .filter((i): i is VisibleItem => i !== undefined)
    .slice(0, 3);

  const item = (i: VisibleItem, extra?: { onMoveUp?: () => void; onMoveDown?: () => void }) => (
    <SidebarNavItem
      key={i.url}
      item={i}
      collapsed={collapsed}
      isActive={location.pathname === i.url}
      isFavorite={prefs.favorites.includes(i.url)}
      badge={badgeMap[i.url]}
      onToggleFavorite={prefs.toggleFavorite}
      {...extra}
    />
  );

  return (
    <TooltipProvider>
      {/* O primitivo cuida de: Sheet no mobile, larguras via CSS vars e
          integração com o SidebarTrigger do AdminLayout. */}
      <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
        <SidebarHeader className="flex flex-col gap-2 border-b border-sidebar-border p-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate('/admin/hub')}
              aria-label="Ir para o Hub"
              className="min-w-0 rounded transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <img
                src={collapsed ? logoCircular : logoGrauOS}
                alt="GrauOS"
                className={collapsed ? 'h-8 w-8' : 'h-10 w-auto object-contain'}
              />
            </button>

            {!collapsed && !isMobile && (
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Recolher menu"
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>

          {collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Expandir menu"
              className="mx-auto rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}

          <SidebarQuickActions collapsed={collapsed} visibleItems={allVisibleItems} />

          {/* Busca: abre o CommandLauncher existente. */}
          {collapsed ? (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setCommandLauncherOpen(true)}
                  aria-label="Buscar"
                  className="mx-auto rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                >
                  <Search className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>Buscar (Ctrl+K)</TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => setCommandLauncherOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg border border-sidebar-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 text-left">Buscar...</span>
              <kbd className="rounded border border-sidebar-border px-1 py-0.5 text-[10px]">Ctrl K</kbd>
            </button>
          )}
        </SidebarHeader>

        <SidebarContent asChild className="sidebar-scroll flex-1 overflow-y-auto px-2 py-3">
          <nav aria-label="Navegação principal">
            <SidebarFavorites
              items={favoritos}
              collapsed={collapsed}
              renderItem={(i, index, total) => item(i, {
                onMoveUp: index > 0 ? () => prefs.moveFavorite(index, index - 1) : undefined,
                onMoveDown: index < total - 1 ? () => prefs.moveFavorite(index, index + 1) : undefined,
              })}
            />

            <SidebarRecent items={recentes} collapsed={collapsed} renderItem={i => item(i)} />

            {sections.map(section => (
              <SidebarSection
                key={section.id}
                section={section}
                collapsed={collapsed}
                isOpen={prefs.openSections.includes(section.id)}
                onToggle={() => prefs.toggleSection(section.id)}
                renderItem={i => item(i)}
              />
            ))}
          </nav>
        </SidebarContent>

        <SidebarFooter className="p-0">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('grauos:copilot:open'))}
            aria-label="Pergunte à IA"
            className={cn(
              'mx-2 mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
              'text-primary transition-colors duration-[180ms] hover:bg-primary/10',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              collapsed && 'justify-center px-0',
            )}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Pergunte à IA</span>}
          </button>

          <SidebarUserMenu collapsed={collapsed} />
        </SidebarFooter>
      </Sidebar>
    </TooltipProvider>
  );
}
