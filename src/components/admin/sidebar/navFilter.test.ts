import { describe, it, expect } from 'vitest';
import { filterSections, flattenItems, type NavContext } from './navFilter';
import type { MenuSection } from '@/config/adminModules';
import { LayoutDashboard } from 'lucide-react';

const permissivo: NavContext = {
  isMasterAdmin: true,
  hasRole: () => true,
  can: () => true,
};

const restrito: NavContext = {
  isMasterAdmin: false,
  hasRole: () => false,
  can: () => false,
};

const secoes: MenuSection[] = [
  {
    id: 'a',
    label: 'A',
    items: [
      { title: 'Livre', url: '/livre', icon: LayoutDashboard },
      { title: 'SoMaster', url: '/master', icon: LayoutDashboard, isMasterOnly: true },
      { title: 'SoManager', url: '/manager', icon: LayoutDashboard, requireRole: 'manager' },
      { title: 'ComPermissao', url: '/perm', icon: LayoutDashboard, requiredPermission: 'x.y' },
    ],
  },
  {
    id: 'so-master',
    label: 'B',
    isMasterOnly: true,
    items: [{ title: 'Interno', url: '/interno', icon: LayoutDashboard }],
  },
];

describe('filterSections', () => {
  it('devolve tudo para quem pode tudo', () => {
    const r = filterSections(secoes, permissivo);
    expect(r).toHaveLength(2);
    expect(r[0].items).toHaveLength(4);
  });

  it('esconde itens isMasterOnly de quem não é master', () => {
    const r = filterSections(secoes, restrito);
    const urls = r.flatMap(s => s.items.map(i => i.url));
    expect(urls).not.toContain('/master');
  });

  it('esconde a seção inteira quando ela é isMasterOnly', () => {
    const r = filterSections(secoes, restrito);
    expect(r.find(s => s.id === 'so-master')).toBeUndefined();
  });

  it('respeita requireRole', () => {
    const r = filterSections(secoes, restrito);
    const urls = r.flatMap(s => s.items.map(i => i.url));
    expect(urls).not.toContain('/manager');
  });

  it('respeita requiredPermission com nível mínimo 1', () => {
    const chamadas: [string, number | undefined][] = [];
    const ctx: NavContext = {
      isMasterAdmin: false,
      hasRole: () => true,
      can: (c, n) => { chamadas.push([c, n]); return false; },
    };
    const r = filterSections(secoes, ctx);
    const urls = r.flatMap(s => s.items.map(i => i.url));
    expect(urls).not.toContain('/perm');
    expect(chamadas).toContainEqual(['x.y', 1]);
  });

  it('remove seções que ficaram sem nenhum item', () => {
    const so: MenuSection[] = [
      { id: 'z', label: 'Z', items: [{ title: 'M', url: '/m', icon: LayoutDashboard, isMasterOnly: true }] },
    ];
    expect(filterSections(so, restrito)).toHaveLength(0);
  });

  it('nunca modifica o array original', () => {
    const antes = JSON.stringify(secoes.map(s => s.items.length));
    filterSections(secoes, restrito);
    expect(JSON.stringify(secoes.map(s => s.items.length))).toBe(antes);
  });
});

describe('flattenItems', () => {
  it('achata os itens carregando o rótulo da seção', () => {
    const r = flattenItems(filterSections(secoes, permissivo));
    expect(r).toHaveLength(5);
    expect(r[0].sectionLabel).toBe('A');
  });
});
