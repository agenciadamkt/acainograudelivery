import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { MODULE_MENUS, getActiveModule, type ModuleId, type MenuSection } from '@/config/adminModules';
import { filterSections, flattenItems, type NavContext, type VisibleItem } from './navFilter';

export interface SidebarNav {
  activeModule: ModuleId;
  sections: MenuSection[];
  allVisibleItems: VisibleItem[];
}

/**
 * Única fonte de verdade sobre o que aparece na sidebar.
 * A camada visual nunca decide permissão.
 */
export function useSidebarNav(pathname: string): SidebarNav {
  const { user, hasRole } = useAuth();
  const { can } = usePermissions();

  const isMasterAdmin = user?.email === 'agenciadamkt@gmail.com' || hasRole('franchisee_master');
  const activeModule = getActiveModule(pathname);

  // SEM useMemo, de propósito. `hasRole` e `can` leem estado que carrega de
  // forma assíncrona (a role chega por fetch em AuthContext; as permissões
  // começam em {} em PermissionContext). Memoizar por [activeModule,
  // isMasterAdmin, user?.id] devolvia resultado obsoleto: os itens com
  // requireRole/requiredPermission sumiam do menu depois do login e só
  // voltavam ao trocar de módulo. Filtrar a cada render é o que a
  // AdminSidebar atual faz, e custa nada — são ~45 itens.
  const ctx: NavContext = { isMasterAdmin, hasRole, can };
  const sections = filterSections(MODULE_MENUS[activeModule] ?? [], ctx);
  return { activeModule, sections, allVisibleItems: flattenItems(sections) };
}
