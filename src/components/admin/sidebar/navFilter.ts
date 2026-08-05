import type { MenuItem, MenuSection } from '@/config/adminModules';
import type { UserRole } from '@/contexts/AuthContext';

/**
 * Contexto de permissão da navegação. Existe para manter a regra de
 * visibilidade fora da camada visual — é o que garante que o redesign
 * não altere permissões.
 */
export interface NavContext {
  isMasterAdmin: boolean;
  hasRole: (role: UserRole) => boolean;
  can: (codigo: string, nivel?: number) => boolean;
}

export type VisibleItem = MenuItem & { sectionLabel: string };

function itemVisivel(item: MenuItem, ctx: NavContext): boolean {
  if (item.isMasterOnly && !ctx.isMasterAdmin) return false;
  if (item.requireRole && !ctx.hasRole(item.requireRole)) return false;
  if (item.requiredPermission && !ctx.can(item.requiredPermission, 1)) return false;
  return true;
}

/**
 * Mesma regra da AdminSidebar atual (linhas 163-178), extraída sem
 * alteração de comportamento. Seções que ficam sem itens somem.
 */
export function filterSections(sections: MenuSection[], ctx: NavContext): MenuSection[] {
  const out: MenuSection[] = [];

  for (const section of sections) {
    if (section.isMasterOnly && !ctx.isMasterAdmin) continue;
    if (section.requireRole && !ctx.hasRole(section.requireRole)) continue;

    const items = section.items.filter(item => itemVisivel(item, ctx));
    if (items.length === 0) continue;

    out.push({ ...section, items });
  }

  return out;
}

export function flattenItems(sections: MenuSection[]): VisibleItem[] {
  return sections.flatMap(s => s.items.map(item => ({ ...item, sectionLabel: s.label })));
}
