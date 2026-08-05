import { WorkspaceCapabilities } from './types';

// Mapeamento de capacidades por rota
export const routeCapabilities: Record<string, WorkspaceCapabilities> = {
  '/admin/dashboard': {
    supportsDuplicate: false,
    supportsSplitView: true,
    supportsBackgroundRefresh: true,
    supportsExport: false
  },
  '/admin/pdv/nova-venda': {
    supportsDuplicate: false, // Checkout de PDV é stateful, não deve duplicar
    supportsSplitView: false,
    supportsBackgroundRefresh: false,
    supportsExport: false
  },
  '/admin/pdv/mesas': {
    supportsDuplicate: false,
    supportsSplitView: false,
    supportsBackgroundRefresh: true,
    supportsExport: false
  },
  '/admin/pdv/caixa': {
    supportsDuplicate: false,
    supportsSplitView: false,
    supportsBackgroundRefresh: true,
    supportsExport: true
  },
  '/admin/kds': {
    supportsDuplicate: false, // Cozinha em tempo real
    supportsSplitView: true,
    supportsBackgroundRefresh: true,
    supportsExport: false
  },
  '/admin/financeiro': {
    supportsDuplicate: true, // Útil para comparar diferentes meses/filtros
    supportsSplitView: true,
    supportsBackgroundRefresh: true,
    supportsExport: true
  },
  '/admin/orders': {
    supportsDuplicate: true,
    supportsSplitView: true,
    supportsBackgroundRefresh: true,
    supportsExport: true
  }
};

// Rotas que começam fixadas por padrão
export const defaultPinnedRoutes = new Set<string>([
  '/admin/dashboard'
]);

export const defaultCapabilities: WorkspaceCapabilities = {
  supportsDuplicate: true,
  supportsSplitView: true,
  supportsBackgroundRefresh: true,
  supportsExport: true
};
