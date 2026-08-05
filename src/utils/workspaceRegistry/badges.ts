import { useSidebarBadges } from '@/hooks/useSidebarBadges';

// Hook para consultar os badges em tempo real integrados ao sistema.
export function useWorkspaceTabBadges() {
  const { data: badgeData } = useSidebarBadges();

  const getBadgeValue = (path: string): number => {
    if (!badgeData) return 0;

    // Vincula rotas com suas contagens em tempo real
    if (path === '/admin/orders') {
      return badgeData.pending ?? 0;
    }
    if (path === '/admin/kds') {
      return badgeData.kitchen ?? 0;
    }

    return 0;
  };

  return { getBadgeValue };
}
