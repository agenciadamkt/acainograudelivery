import { routeTitles } from './routes';
import { routeIcons, routeColors, defaultIcon, defaultColor } from './appearance';
import { routeCapabilities, defaultPinnedRoutes, defaultCapabilities } from './capabilities';
import { WorkspaceTabConfig } from './types';
import { MODULE_MENUS } from '@/config/adminModules';

export * from './types';
export * from './badges';

/**
 * Retorna as configurações completas e consolidadas de uma aba de acordo com sua rota.
 */
export function getTabMetadata(path: string): WorkspaceTabConfig {
  let title = routeTitles[path];
  let icon = routeIcons[path];
  const color = routeColors[path] || defaultColor;
  const capabilities = routeCapabilities[path] || defaultCapabilities;

  // Busca dinâmica nos menus cadastrados do sistema se não houver mapeamento estático
  if (!title || !icon) {
    for (const sections of Object.values(MODULE_MENUS)) {
      for (const section of sections) {
        for (const item of section.items) {
          if (item.url === path) {
            title = title || item.title;
            icon = icon || item.icon;
            break;
          }
        }
        if (title && icon) break;
      }
      if (title && icon) break;
    }
  }

  // Fallbacks finais se não achou em lugar nenhum
  title = title || 'Tela GrauOS';
  icon = icon || defaultIcon;

  return {
    path,
    title,
    icon,
    color,
    capabilities
  };
}

/**
 * Verifica se a rota deve vir fixada por padrão.
 */
export function isRoutePinnedByDefault(path: string): boolean {
  return defaultPinnedRoutes.has(path);
}
