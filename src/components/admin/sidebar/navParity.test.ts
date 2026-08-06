import { describe, it, expect } from 'vitest';
import { filterSections, flattenItems, type NavContext } from './navFilter';
import { MODULE_MENUS, type ModuleId } from '@/config/adminModules';

/**
 * Paridade V1 ↔ V2.
 *
 * A V2 troca o filtro inline da AdminSidebar por `filterSections`. Estes
 * testes garantem, para TODOS os módulos de uma vez, que a troca não some
 * com item nem inventa item — que era o risco central do redesign.
 */

const TODOS = Object.keys(MODULE_MENUS) as ModuleId[];

const master: NavContext = {
  isMasterAdmin: true,
  hasRole: () => true,
  can: () => true,
};

/** Franqueado/gerente: tem papel, mas não é master. */
const gerente: NavContext = {
  isMasterAdmin: false,
  hasRole: () => true,
  can: () => true,
};

function urlsDe(mod: ModuleId, ctx: NavContext): string[] {
  return flattenItems(filterSections(MODULE_MENUS[mod], ctx)).map(i => i.url);
}

/** Tudo que está declarado no módulo, sem filtro nenhum. */
function urlsDeclaradas(mod: ModuleId): string[] {
  return MODULE_MENUS[mod].flatMap(s => s.items.map(i => i.url));
}

describe('paridade de itens por módulo', () => {
  it('cobre os 11 módulos declarados', () => {
    expect(TODOS).toHaveLength(11);
  });

  it.each(TODOS)('módulo "%s": master vê exatamente tudo que está declarado', mod => {
    expect(urlsDe(mod, master)).toEqual(urlsDeclaradas(mod));
  });

  it.each(TODOS)('módulo "%s": nenhum item aparece duas vezes', mod => {
    const urls = urlsDe(mod, master);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it.each(TODOS)('módulo "%s": não-master nunca recebe item isMasterOnly', mod => {
    const visiveis = new Set(urlsDe(mod, gerente));
    const restritos = MODULE_MENUS[mod]
      .filter(s => s.isMasterOnly)
      .flatMap(s => s.items.map(i => i.url))
      .concat(
        MODULE_MENUS[mod].flatMap(s => s.items.filter(i => i.isMasterOnly).map(i => i.url)),
      );
    for (const url of restritos) expect(visiveis.has(url)).toBe(false);
  });

  it('a ordem das seções é preservada', () => {
    for (const mod of TODOS) {
      const esperado = MODULE_MENUS[mod].map(s => s.id);
      const obtido = filterSections(MODULE_MENUS[mod], master).map(s => s.id);
      expect(obtido).toEqual(esperado);
    }
  });
});

describe('requireRole em nível de seção', () => {
  // Lacuna apontada na revisão da Task 3: a branch existia sem teste.
  it('esconde a seção inteira de quem não tem o papel', () => {
    const secoes = [
      {
        id: 'restrita',
        label: 'Restrita',
        requireRole: 'manager' as const,
        items: MODULE_MENUS.operacao[0].items.slice(0, 1),
      },
    ];
    const semPapel: NavContext = { isMasterAdmin: false, hasRole: () => false, can: () => true };
    expect(filterSections(secoes, semPapel)).toHaveLength(0);
    expect(filterSections(secoes, gerente)).toHaveLength(1);
  });
});
