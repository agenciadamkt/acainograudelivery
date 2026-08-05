import { useMemo } from 'react';
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

  return useMemo(() => {
    const ctx: NavContext = { isMasterAdmin, hasRole, can };
    const sections = filterSections(MODULE_MENUS[activeModule] ?? [], ctx);
    return { activeModule, sections, allVisibleItems: flattenItems(sections) };
    // `hasRole` e `can` são recriados a cada render dos contextos; incluí-los
    // aqui anularia o memo. O que realmente muda o resultado é o módulo e o
    // usuário, então a dependência é essa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule, isMasterAdmin, user?.id]);
}
