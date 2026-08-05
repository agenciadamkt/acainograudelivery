# Redesign da Sidebar do GrauOS — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir a navegação do admin no padrão Linear/Stripe, sem alterar rotas, itens de menu, permissões, APIs ou banco.

**Architecture:** Um componente novo (`AdminSidebarV2`) convive com o atual atrás de uma flag em LocalStorage. A lógica de permissão sai da camada visual e vira uma função pura testável; a persistência vira um hook único. Só ao final a V1 é removida.

**Tech Stack:** React 18, TypeScript, Vite, TailwindCSS, shadcn/ui (Radix), react-router-dom, framer-motion, cmdk, vitest.

**Spec:** `docs/superpowers/specs/2026-08-05-sidebar-grauos-redesign-design.md`

## Global Constraints

- **Não alterar** rotas, `MODULE_MENUS`, regras de permissão, APIs ou schema do banco.
- Identidade visual preservada: `--primary: 262 50% 47%`, fonte Inter (já importada em `src/index.css:1`).
- Larguras: expandida `17.5rem` (280px), recolhida `4.5rem` (72px), mobile `18rem` (inalterada).
- Toda transição em **180ms** máximo, sempre sob `@media (prefers-reduced-motion: reduce)`.
- Persistência: as chaves de LocalStorage são declaradas **só** em `prefsStorage.ts`, e nenhum componente chama `localStorage` diretamente. Preferências de conteúdo (grupos abertos, favoritos, recentes) passam pelo `useSidebarPrefs`. O estado recolhido e a flag de versão são do `AdminLayout` — porque quem manda no recolhido é o `SidebarProvider`, que também decide o Sheet do mobile — e usam os helpers `readBool`/`writeBool` do mesmo módulo.
- Chaves existentes preservadas: `grauos_sidebar_open`, `grauos_favorites`, `grauos_active_module`.
- Máximo de 6 favoritos (`MAX_FAVORITES = 6`), como hoje.
- Comandos: `npm run test` (novo), `npx tsc --noEmit`, `npm run build`.
- Commits em português, seguindo o padrão do repositório (`feat:`, `fix:`, `docs:`, `chore:`).
- Trabalhar na branch atual `feat/modulo-fiscal`. **Não** fazer merge para `main` — isso dispara deploy em produção via GitHub Actions.
- **Área intocável (trabalho do Fábio, commit `94dd577`).** Não alterar, refatorar
  nem "melhorar" nenhum destes: `src/components/admin/CommandLauncher.tsx`,
  `WorkspaceTabs.tsx`, `WorkspaceTab.tsx`, `AdminWorkspaceLayout.tsx`,
  `src/contexts/WorkspaceTabsContext.tsx`, `src/contexts/TelemetryContext.tsx`,
  `src/utils/searchRegistry.ts`, `src/utils/workspaceRegistry/`. Consumir a API
  pública deles é permitido; editá-los, não. O `AdminLayout.tsx` só pode receber
  acréscimos — tudo que já existe nele deve ser preservado.
- **`Ctrl/Cmd+K` pertence ao `CommandLauncher`.** Nenhum componente da sidebar
  registra esse atalho. Atalhos já ocupados: `Ctrl+Tab`, `Ctrl+Shift+Tab`,
  `Ctrl+W`, `Alt+W`, `Ctrl+K`. `Alt+1..9` está livre (verificado).

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `vitest.config.ts` | Config de teste isolada (não mexe no `vite.config.ts`, que tem PWA) |
| `src/index.css` | Tokens `--sidebar-*` |
| `tailwind.config.ts` | Registro dos tokens em `colors.sidebar` |
| `src/components/ui/sidebar.tsx` | Só as 2 constantes de largura |
| `src/components/admin/sidebar/navFilter.ts` | **Função pura** de filtro por permissão |
| `src/components/admin/sidebar/navFilter.test.ts` | Testes do filtro |
| `src/components/admin/sidebar/useSidebarNav.ts` | Hook que liga o filtro aos contextos |
| `src/components/admin/sidebar/prefsStorage.ts` | **Funções puras** de leitura/escrita |
| `src/components/admin/sidebar/prefsStorage.test.ts` | Testes da persistência |
| `src/components/admin/sidebar/useSidebarPrefs.ts` | Hook de preferências |
| `src/components/admin/sidebar/SidebarNavItem.tsx` | Item: ícone, label, badge, estrela, tooltip, menu de contexto |
| `src/components/admin/sidebar/SidebarSection.tsx` | Grupo recolhível |
| `src/components/admin/sidebar/SidebarSubGroup.tsx` | Acordeão de subgrupo |
| `src/components/admin/sidebar/SidebarFavorites.tsx` | Favoritos + reordenar |
| `src/components/admin/sidebar/SidebarRecent.tsx` | Recentes (V1.1) |
| `src/components/admin/sidebar/SidebarQuickActions.tsx` | Botão `+` (V1.1) |
| `src/components/admin/sidebar/SidebarUserMenu.tsx` | Rodapé |
| `src/components/admin/sidebar/SidebarSearch.tsx` | Dialog Ctrl+K |
| `src/components/admin/sidebar/AdminSidebarV2.tsx` | Shell orquestrador |
| `src/components/admin/AdminLayout.tsx` | Escolha da versão pela flag |
| `src/hooks/useSidebarBadges.ts` | Badges estendidos (V1.1) |
| `src/components/copilot/CopilotPanel.tsx` | Listener do `CustomEvent` (V1.1) |

---

## Task 1: Infraestrutura de teste

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Modify: `package.json` (scripts + devDependencies)

**Interfaces:**
- Consumes: nada
- Produces: comando `npm run test`; alias `@` funcionando em testes

- [ ] **Step 1: Instalar as dependências**

```bash
npm install -D vitest@^2.1.8 jsdom@^25.0.1 @testing-library/react@^16.1.0 @testing-library/jest-dom@^6.6.3
```

- [ ] **Step 2: Criar `vitest.config.ts`**

Config separada de propósito: o `vite.config.ts` carrega `VitePWA` e `lovable-tagger`, que não devem rodar em teste.

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
```

- [ ] **Step 3: Criar `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';

// Cada teste começa com LocalStorage limpo — senão a persistência
// de um teste vaza para o seguinte.
beforeEach(() => {
  localStorage.clear();
});
```

- [ ] **Step 4: Adicionar os scripts no `package.json`**

Dentro de `"scripts"`, acrescentar:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Criar um teste temporário para validar a infra**

Criar `src/test/setup.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('infra de teste', () => {
  it('roda e enxerga o localStorage do jsdom', () => {
    localStorage.setItem('x', '1');
    expect(localStorage.getItem('x')).toBe('1');
  });
});
```

- [ ] **Step 6: Rodar e confirmar que passa**

Run: `npm run test`
Expected: PASS, 1 teste.

- [ ] **Step 7: Apagar o teste temporário**

```bash
rm src/test/setup.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add vitest.config.ts src/test/setup.ts package.json package-lock.json
git commit -m "chore: adiciona vitest para testar a lógica da sidebar

O projeto não tinha runner de teste. Config separada do vite.config.ts
porque aquele carrega VitePWA e lovable-tagger, que não devem rodar em teste."
```

---

## Task 2: Tokens de superfície e larguras

**Files:**
- Modify: `src/index.css` (blocos `:root` e `.dark`)
- Modify: `tailwind.config.ts` (`theme.extend.colors`)
- Modify: `src/components/ui/sidebar.tsx:17-19`

**Interfaces:**
- Consumes: nada
- Produces: classes `bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-accent`, `border-sidebar-border`, `ring-sidebar-ring` passam a gerar estilo

**Contexto:** o `ui/sidebar.tsx` já usa essas classes, mas os tokens nunca existiram — por isso a sidebar hoje não se separa visualmente do conteúdo. Esta task conserta isso e **já melhora a V1 atual**, antes de qualquer componente novo.

- [ ] **Step 1: Acrescentar os tokens em `src/index.css`**

No final do bloco `:root { ... }`:

```css
    --sidebar:                     0 0% 100%;
    --sidebar-foreground:          0 0% 20%;
    --sidebar-accent:              0 0% 94%;
    --sidebar-accent-foreground:   0 0% 20%;
    --sidebar-border:              0 0% 90%;
    --sidebar-ring:              262 50% 47%;
```

No final do bloco `.dark { ... }`:

```css
    --sidebar:                   222.2 84% 7%;
    --sidebar-foreground:          210 40% 98%;
    --sidebar-accent:            217.2 32.6% 17.5%;
    --sidebar-accent-foreground:   210 40% 98%;
    --sidebar-border:            217.2 32.6% 17.5%;
    --sidebar-ring:              262 50% 47%;
```

`--sidebar-accent` é **neutro** de propósito: no `ui/sidebar.tsx` ele é o fundo de hover. O roxo fica reservado ao estado ativo (Task 5).

- [ ] **Step 2: Registrar em `tailwind.config.ts`**

Dentro de `theme.extend.colors`:

```ts
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
```

- [ ] **Step 3: Ajustar as larguras em `src/components/ui/sidebar.tsx`**

Linhas 17 e 19:

```ts
const SIDEBAR_WIDTH = "17.5rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "4.5rem"
```

- [ ] **Step 4: Verificar tipos e build**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npm run build`
Expected: build conclui.

- [ ] **Step 5: Conferir visualmente**

Run: `npm run dev`, abrir `/admin/dashboard`.
Expected: a sidebar agora tem fundo branco distinto do cinza da página (claro) e uma borda visível; está mais larga. No tema escuro, um pouco mais clara que o fundo.

- [ ] **Step 6: Commit**

```bash
git add src/index.css tailwind.config.ts src/components/ui/sidebar.tsx
git commit -m "feat: define os tokens --sidebar-* e ajusta as larguras

O ui/sidebar.tsx já usava bg-sidebar, text-sidebar-foreground e
border-sidebar-border, mas nenhum desses tokens existia — as classes não
geravam estilo e a sidebar herdava o fundo da página.

--sidebar-accent fica neutro: é o fundo de hover no primitivo. O roxo
fica reservado ao estado ativo."
```

---

## Task 3: Filtro de permissão (função pura + testes)

**Files:**
- Create: `src/components/admin/sidebar/navFilter.ts`
- Create: `src/components/admin/sidebar/navFilter.test.ts`

**Interfaces:**
- Consumes: `MenuSection`, `MenuItem`, `MODULE_MENUS`, `getActiveModule` de `@/config/adminModules`; `UserRole` de `@/contexts/AuthContext`
- Produces:
  - `interface NavContext { isMasterAdmin: boolean; hasRole: (r: UserRole) => boolean; can: (codigo: string, nivel?: number) => boolean }`
  - `function filterSections(sections: MenuSection[], ctx: NavContext): MenuSection[]`
  - `type VisibleItem = MenuItem & { sectionLabel: string }`
  - `function flattenItems(sections: MenuSection[]): VisibleItem[]`

**Por que função pura:** é aqui que mora o risco de "sumir um item" ou "vazar permissão". Sem React no meio, o teste é direto e roda em milissegundos.

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/components/admin/sidebar/navFilter.test.ts`:

```ts
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
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test`
Expected: FAIL — `Failed to resolve import "./navFilter"`.

- [ ] **Step 3: Implementar `navFilter.ts`**

```ts
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
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test`
Expected: PASS, 8 testes.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/sidebar/navFilter.ts src/components/admin/sidebar/navFilter.test.ts
git commit -m "feat: extrai o filtro de permissão da sidebar para função pura

Mesma regra da AdminSidebar atual, agora testável sem React. É a peça
que garante que o redesign não altere permissões nem esconda itens."
```

---

## Task 4: Hook de navegação

**Files:**
- Create: `src/components/admin/sidebar/useSidebarNav.ts`

**Interfaces:**
- Consumes: `filterSections`, `flattenItems`, `NavContext`, `VisibleItem` da Task 3
- Produces: `function useSidebarNav(pathname: string): { activeModule: ModuleId; sections: MenuSection[]; allVisibleItems: VisibleItem[] }`

- [ ] **Step 1: Implementar o hook**

```ts
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
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/sidebar/useSidebarNav.ts
git commit -m "feat: adiciona useSidebarNav ligando o filtro puro aos contextos"
```

---

## Task 5: Persistência (funções puras + testes + hook)

**Files:**
- Create: `src/components/admin/sidebar/prefsStorage.ts`
- Create: `src/components/admin/sidebar/prefsStorage.test.ts`
- Create: `src/components/admin/sidebar/useSidebarPrefs.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `const STORAGE = { open, favorites, collapsed, recent }` (nomes das chaves)
  - `const MAX_FAVORITES = 6`
  - `function readArray(key: string): string[]`
  - `function writeArray(key: string, value: string[]): void`
  - `function moveInArray<T>(arr: T[], from: number, to: number): T[]`
  - `function toggleInArray(arr: string[], value: string, max?: number): string[]`
  - `function useSidebarPrefs(): SidebarPrefs`

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/components/admin/sidebar/prefsStorage.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readArray, writeArray, moveInArray, toggleInArray, STORAGE, MAX_FAVORITES } from './prefsStorage';

describe('readArray', () => {
  it('devolve vazio quando a chave não existe', () => {
    expect(readArray('nada')).toEqual([]);
  });

  it('lê um array salvo', () => {
    localStorage.setItem('k', JSON.stringify(['a', 'b']));
    expect(readArray('k')).toEqual(['a', 'b']);
  });

  it('devolve vazio (sem lançar) quando o JSON está corrompido', () => {
    localStorage.setItem('k', '{isso não é json');
    expect(readArray('k')).toEqual([]);
  });

  it('devolve vazio quando o valor salvo não é array', () => {
    localStorage.setItem('k', JSON.stringify({ a: 1 }));
    expect(readArray('k')).toEqual([]);
  });

  it('preserva a ordem dos favoritos já salvos pela V1', () => {
    // A V1 salvava [...Set], que serializa como array — a ordem só passa
    // a ser respeitada agora, sem precisar de migração.
    localStorage.setItem(STORAGE.favorites, JSON.stringify(['/b', '/a', '/c']));
    expect(readArray(STORAGE.favorites)).toEqual(['/b', '/a', '/c']);
  });
});

describe('writeArray', () => {
  it('grava e relê', () => {
    writeArray('k', ['x']);
    expect(readArray('k')).toEqual(['x']);
  });
});

describe('moveInArray', () => {
  it('move um item para cima', () => {
    expect(moveInArray(['a', 'b', 'c'], 1, 0)).toEqual(['b', 'a', 'c']);
  });

  it('move um item para baixo', () => {
    expect(moveInArray(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });

  it('ignora índice fora do intervalo', () => {
    expect(moveInArray(['a', 'b'], 0, 5)).toEqual(['a', 'b']);
    expect(moveInArray(['a', 'b'], -1, 0)).toEqual(['a', 'b']);
  });

  it('não modifica o array original', () => {
    const orig = ['a', 'b'];
    moveInArray(orig, 0, 1);
    expect(orig).toEqual(['a', 'b']);
  });
});

describe('toggleInArray', () => {
  it('adiciona no fim quando ausente', () => {
    expect(toggleInArray(['a'], 'b')).toEqual(['a', 'b']);
  });

  it('remove quando presente', () => {
    expect(toggleInArray(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('não adiciona além do máximo', () => {
    const cheio = ['1', '2', '3', '4', '5', '6'];
    expect(toggleInArray(cheio, '7', MAX_FAVORITES)).toEqual(cheio);
  });

  it('remove mesmo estando no máximo', () => {
    const cheio = ['1', '2', '3', '4', '5', '6'];
    expect(toggleInArray(cheio, '3', MAX_FAVORITES)).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm run test`
Expected: FAIL — `Failed to resolve import "./prefsStorage"`.

- [ ] **Step 3: Implementar `prefsStorage.ts`**

```ts
// Todas as chaves de LocalStorage da sidebar são declaradas aqui, e só aqui.
export const STORAGE = {
  open: 'grauos_sidebar_open',
  favorites: 'grauos_favorites',
  collapsed: 'grauos_sidebar_collapsed',
  recent: 'grauos_sidebar_recent',
  versionFlag: 'grauos_sidebar_v2',
} as const;

export const MAX_FAVORITES = 6;
export const MAX_RECENT = 5;

/** Nunca lança: LocalStorage pode estar indisponível (modo privado) ou corrompido. */
export function readArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function writeArray(key: string, value: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota cheia ou storage bloqueado — preferência não é crítica */
  }
}

/** Distingue "sem preferência salva" de "salvo como false". */
export function hasKey(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

export function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    return fallback;
  }
}

export function writeBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* idem */
  }
}

export function moveInArray<T>(arr: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function toggleInArray(arr: string[], value: string, max?: number): string[] {
  if (arr.includes(value)) return arr.filter(v => v !== value);
  if (max !== undefined && arr.length >= max) return arr;
  return [...arr, value];
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm run test`
Expected: PASS, 14 testes novos.

- [ ] **Step 5: Implementar `useSidebarPrefs.ts`**

```ts
import { useCallback, useState } from 'react';
import {
  STORAGE, MAX_FAVORITES, MAX_RECENT,
  readArray, writeArray, readBool, writeBool,
  moveInArray, toggleInArray,
} from './prefsStorage';

export interface SidebarPrefs {
  openSections: string[];
  favorites: string[];
  recent: string[];
  toggleSection: (id: string) => void;
  toggleFavorite: (url: string) => void;
  moveFavorite: (from: number, to: number) => void;
  pushRecent: (url: string) => void;
}

/**
 * Único ponto do app que escreve preferências da sidebar em LocalStorage.
 * Nenhum componente deve chamar localStorage diretamente.
 *
 * O estado expandido/recolhido NÃO mora aqui: quem manda nele é o
 * `SidebarProvider` do shadcn (é ele que também decide o Sheet no mobile).
 * O AdminLayout usa `readBool`/`writeBool` para semear e persistir esse
 * estado — ter duas fontes de verdade para "recolhida" daria dessincronia.
 */
export function useSidebarPrefs(): SidebarPrefs {
  const [openSections, setOpenSections] = useState(() => {
    const saved = readArray(STORAGE.open);
    return saved.length > 0 ? saved : ['operacao', 'cardapio'];
  });
  const [favorites, setFavorites] = useState(() => readArray(STORAGE.favorites));
  const [recent, setRecent] = useState(() => readArray(STORAGE.recent));

  const toggleSection = useCallback((id: string) => {
    setOpenSections(prev => {
      const next = toggleInArray(prev, id);
      writeArray(STORAGE.open, next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((url: string) => {
    setFavorites(prev => {
      const next = toggleInArray(prev, url, MAX_FAVORITES);
      writeArray(STORAGE.favorites, next);
      return next;
    });
  }, []);

  const moveFavorite = useCallback((from: number, to: number) => {
    setFavorites(prev => {
      const next = moveInArray(prev, from, to);
      writeArray(STORAGE.favorites, next);
      return next;
    });
  }, []);

  const pushRecent = useCallback((url: string) => {
    setRecent(prev => {
      if (prev[0] === url) return prev;
      const next = [url, ...prev.filter(u => u !== url)].slice(0, MAX_RECENT);
      writeArray(STORAGE.recent, next);
      return next;
    });
  }, []);

  return {
    openSections, favorites, recent,
    toggleSection, toggleFavorite, moveFavorite, pushRecent,
  };
}
```

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/sidebar/prefsStorage.ts src/components/admin/sidebar/prefsStorage.test.ts src/components/admin/sidebar/useSidebarPrefs.ts
git commit -m "feat: centraliza a persistência da sidebar em useSidebarPrefs

Favoritos passam de Set para array ordenado. O formato serializado não
muda, então ninguém perde favoritos já fixados."
```

---

## Task 6: SidebarNavItem

**Files:**
- Create: `src/components/admin/sidebar/SidebarNavItem.tsx`

**Interfaces:**
- Consumes: `VisibleItem` (Task 3)
- Produces: `<SidebarNavItem item collapsed isActive isFavorite badge onToggleFavorite />`

**Design (spec 5.3):** repouso `text-sidebar-foreground/80`; hover `bg-sidebar-accent` neutro; ativo fundo `primary/10` + barra 3px roxa via pseudo-elemento + `ring-1 ring-primary/20` + texto roxo peso 600.

- [ ] **Step 1: Implementar o componente**

```tsx
import { NavLink } from 'react-router-dom';
import { Star, ArrowUp, ArrowDown } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import type { VisibleItem } from './navFilter';

export interface BadgeConfig {
  count: number;
  color: string;
}

interface Props {
  item: VisibleItem;
  collapsed: boolean;
  isActive: boolean;
  isFavorite: boolean;
  badge?: BadgeConfig;
  onToggleFavorite: (url: string) => void;
  /** Presentes só na lista de favoritos. */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function SidebarNavItem({
  item, collapsed, isActive, isFavorite, badge,
  onToggleFavorite, onMoveUp, onMoveDown,
}: Props) {
  const Icon = item.icon;
  const showBadge = badge && badge.count > 0;

  const link = (
    <NavLink
      to={item.url}
      aria-label={item.title}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'group/item relative flex items-center gap-3 rounded-lg px-3 py-2',
        'text-sm font-medium transition-colors duration-[180ms]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        collapsed && 'justify-center px-0',
        isActive
          ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/20'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        item.highlight && !isActive && 'text-primary',
      )}
    >
      {/* Barra de seleção: pseudo-elemento posicionado, não border-left,
          para não deslocar o conteúdo ao ativar. */}
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
        />
      )}

      <Icon className="h-4 w-4 shrink-0" />

      {!collapsed && <span className="flex-1 truncate">{item.title}</span>}

      {!collapsed && showBadge && (
        <span
          className={cn(
            'shrink-0 rounded-full px-1.5 text-[10px] font-bold leading-5',
            'min-w-[20px] text-center text-white',
            badge.color,
          )}
        >
          {badge.count > 99 ? '99+' : badge.count}
        </span>
      )}

      {/* Estrela aparece no hover; no modo recolhido não há espaço. */}
      {!collapsed && (
        <button
          type="button"
          aria-label={isFavorite ? `Remover ${item.title} dos favoritos` : `Adicionar ${item.title} aos favoritos`}
          aria-pressed={isFavorite}
          className={cn(
            'shrink-0 rounded p-0.5 transition-opacity',
            'opacity-0 focus-visible:opacity-100 group-hover/item:opacity-100',
            'hover:bg-sidebar-accent',
            isFavorite && 'opacity-100',
          )}
          onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(item.url); }}
        >
          <Star className={cn('h-3 w-3', isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground')} />
        </button>
      )}

      {!collapsed && onMoveUp && (
        <span className="flex shrink-0 flex-col opacity-0 group-hover/item:opacity-100">
          <button
            type="button" aria-label={`Mover ${item.title} para cima`}
            className="rounded p-px hover:bg-sidebar-accent"
            onClick={e => { e.preventDefault(); e.stopPropagation(); onMoveUp(); }}
          >
            <ArrowUp className="h-2.5 w-2.5 text-muted-foreground" />
          </button>
          <button
            type="button" aria-label={`Mover ${item.title} para baixo`}
            className="rounded p-px hover:bg-sidebar-accent"
            onClick={e => { e.preventDefault(); e.stopPropagation(); onMoveDown?.(); }}
          >
            <ArrowDown className="h-2.5 w-2.5 text-muted-foreground" />
          </button>
        </span>
      )}
    </NavLink>
  );

  const comMenu = (
    <ContextMenu>
      <ContextMenuTrigger asChild>{link}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onSelect={() => window.open(item.url, '_blank', 'noopener')}>
          Abrir em nova aba
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onToggleFavorite(item.url)}>
          {isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => navigator.clipboard?.writeText(`${window.location.origin}${item.url}`)}
        >
          Copiar link
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  // No modo recolhido o nome do módulo só existe no tooltip — e no aria-label.
  if (!collapsed) return comMenu;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{comMenu}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {item.title}
        {showBadge && ` (${badge.count})`}
      </TooltipContent>
    </Tooltip>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/sidebar/SidebarNavItem.tsx
git commit -m "feat: adiciona SidebarNavItem com tooltip, menu de contexto e estado ativo

Estado ativo com fundo, ring e barra lateral em pseudo-elemento — a barra
não desloca o conteúdo porque não é border-left."
```

---

## Task 7: SidebarSection e SidebarSubGroup

**Files:**
- Create: `src/components/admin/sidebar/SidebarSubGroup.tsx`
- Create: `src/components/admin/sidebar/SidebarSection.tsx`

**Interfaces:**
- Consumes: `SidebarNavItem` (Task 6), `MenuSection`, `VisibleItem`
- Produces:
  - `<SidebarSubGroup label items collapsed renderItem />`
  - `<SidebarSection section collapsed isOpen onToggle renderItem />`

**Técnica de animação:** `grid-template-rows: 0fr → 1fr` anima altura variável em CSS puro, sem medir o DOM.

- [ ] **Step 1: Implementar `SidebarSubGroup.tsx`**

```tsx
import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VisibleItem } from './navFilter';

interface Props {
  label: string;
  items: VisibleItem[];
  collapsed: boolean;
  renderItem: (item: VisibleItem) => ReactNode;
}

export function SidebarSubGroup({ label, items, collapsed, renderItem }: Props) {
  const [open, setOpen] = useState(true);
  const id = `subgroup-${label.toLowerCase().replace(/\s+/g, '-')}`;

  // Recolhida: sem espaço para o título, os itens entram direto na lista.
  if (collapsed) return <>{items.map(renderItem)}</>;

  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex w-full items-center gap-1 px-3 py-1',
          'text-[10px] font-semibold uppercase tracking-widest',
          'text-muted-foreground/60 transition-colors hover:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded',
        )}
      >
        <ChevronDown
          className={cn('h-3 w-3 transition-transform duration-[180ms]', !open && '-rotate-90')}
          aria-hidden="true"
        />
        <span>{label}</span>
      </button>

      <div
        id={id}
        className={cn(
          'grid transition-[grid-template-rows] duration-[180ms] ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          {/* Guia vertical: reforça a hierarquia do subgrupo. */}
          <div className="ml-4 space-y-0.5 border-l border-sidebar-border pl-2">
            {open && items.map(renderItem)}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implementar `SidebarSection.tsx`**

```tsx
import { Fragment, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarSubGroup } from './SidebarSubGroup';
import type { MenuSection } from '@/config/adminModules';
import type { VisibleItem } from './navFilter';

interface Props {
  section: MenuSection;
  collapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
  renderItem: (item: VisibleItem) => ReactNode;
}

/** Agrupa itens consecutivos que compartilham o mesmo `subGroup`. */
function agrupar(items: VisibleItem[]): { label: string | null; items: VisibleItem[] }[] {
  const out: { label: string | null; items: VisibleItem[] }[] = [];
  for (const item of items) {
    const label = item.subGroup ?? null;
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.label === label) ultimo.items.push(item);
    else out.push({ label, items: [item] });
  }
  return out;
}

export function SidebarSection({ section, collapsed, isOpen, onToggle, renderItem }: Props) {
  const id = `section-${section.id}`;
  const items = section.items as VisibleItem[];
  const grupos = agrupar(items);

  // Recolhida: sem título; um separador preserva a noção de bloco.
  if (collapsed) {
    return (
      <div className="space-y-0.5 border-t border-sidebar-border/60 pt-2 first:border-t-0 first:pt-0">
        {items.map(renderItem)}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={onToggle}
        className={cn(
          'flex w-full items-center justify-between rounded px-3 py-1.5',
          'text-[11px] font-semibold uppercase tracking-wider',
          'text-muted-foreground transition-colors hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        )}
      >
        <span className="truncate">{section.label}</span>
        <ChevronDown
          className={cn('h-3 w-3 shrink-0 transition-transform duration-[180ms]', !isOpen && '-rotate-90')}
          aria-hidden="true"
        />
      </button>

      <div
        id={id}
        role="region"
        aria-label={section.label}
        className={cn(
          'grid transition-[grid-template-rows] duration-[180ms] ease-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          {/* Grupo fechado desmonta de verdade (não é só `hidden`) — foi a
              alternativa escolhida no lugar de virtualizar. */}
          {isOpen && (
            <div className="mt-1 space-y-0.5">
              {grupos.map((g, i) => (
                <Fragment key={g.label ?? `sem-grupo-${i}`}>
                  {g.label
                    ? <SidebarSubGroup label={g.label} items={g.items} collapsed={false} renderItem={renderItem} />
                    : g.items.map(renderItem)}
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/sidebar/SidebarSection.tsx src/components/admin/sidebar/SidebarSubGroup.tsx
git commit -m "feat: adiciona grupos e subgrupos recolhíveis da sidebar

Acordeão por grid-template-rows 0fr→1fr: anima altura variável sem medir
o DOM. Grupo fechado desmonta os filhos em vez de só escondê-los."
```

---

## Task 8: Favoritos, Recentes e Quick Actions

**Files:**
- Create: `src/components/admin/sidebar/SidebarFavorites.tsx`
- Create: `src/components/admin/sidebar/SidebarRecent.tsx`
- Create: `src/components/admin/sidebar/SidebarQuickActions.tsx`

**Interfaces:**
- Consumes: `SidebarNavItem` (Task 6), `VisibleItem` (Task 3), `MAX_FAVORITES` (Task 5)
- Produces: `<SidebarFavorites …/>`, `<SidebarRecent …/>`, `<SidebarQuickActions collapsed />`

- [ ] **Step 1: Implementar `SidebarFavorites.tsx`**

```tsx
import type { ReactNode } from 'react';
import { MAX_FAVORITES } from './prefsStorage';
import type { VisibleItem } from './navFilter';

interface Props {
  items: VisibleItem[];
  collapsed: boolean;
  renderItem: (item: VisibleItem, index: number, total: number) => ReactNode;
}

export function SidebarFavorites({ items, collapsed, renderItem }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      {!collapsed && (
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Favoritos
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            {items.length}/{MAX_FAVORITES}
          </span>
        </div>
      )}
      <div className="space-y-0.5">
        {items.map((item, i) => renderItem(item, i, items.length))}
      </div>
      {collapsed && <div className="mx-3 mt-2 border-t border-sidebar-border/60" />}
    </div>
  );
}
```

- [ ] **Step 2: Implementar `SidebarRecent.tsx`**

```tsx
import type { ReactNode } from 'react';
import type { VisibleItem } from './navFilter';

interface Props {
  items: VisibleItem[];
  collapsed: boolean;
  renderItem: (item: VisibleItem) => ReactNode;
}

/** Recolhida, Recentes não aparece: competiria por espaço com os favoritos. */
export function SidebarRecent({ items, collapsed, renderItem }: Props) {
  if (collapsed || items.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Recentes
        </span>
      </div>
      <div className="space-y-0.5">{items.map(renderItem)}</div>
    </div>
  );
}
```

- [ ] **Step 3: Implementar `SidebarQuickActions.tsx`**

```tsx
import { useNavigate } from 'react-router-dom';
import { Plus, ShoppingCart, Grid, PackageOpen, ClipboardCheck, Users } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { VisibleItem } from './navFilter';

interface Props {
  collapsed: boolean;
  /** Itens visíveis ao usuário; usados para não oferecer ação sem permissão. */
  visibleItems: VisibleItem[];
}

// Cada ação aponta para uma rota que já existe e é liberada pela mesma
// permissão do item de menu correspondente.
const ACOES = [
  { label: 'Novo Pedido',  url: '/admin/pdv/nova-venda',      icon: ShoppingCart },
  { label: 'Nova Mesa',    url: '/admin/pdv/mesas',           icon: Grid },
  { label: 'Novo Produto', url: '/admin/menu/products',       icon: PackageOpen },
  { label: 'Nova Compra',  url: '/admin/stock/purchases',     icon: ClipboardCheck },
  { label: 'Novo Usuário', url: '/admin/settings/usuarios',   icon: Users },
];

export function SidebarQuickActions({ collapsed, visibleItems }: Props) {
  const navigate = useNavigate();
  const permitidas = new Set(visibleItems.map(i => i.url));
  const acoes = ACOES.filter(a => permitidas.has(a.url));

  if (acoes.length === 0) return null;

  const gatilho = (
    <button
      type="button"
      aria-label="Ações rápidas"
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg py-2',
        'bg-primary text-primary-foreground text-sm font-medium',
        'transition-opacity duration-[180ms] hover:opacity-90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        collapsed ? 'w-9' : 'w-full',
      )}
    >
      <Plus className="h-4 w-4 shrink-0" />
      {!collapsed && <span>Criar</span>}
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>{gatilho}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>Ações rápidas</TooltipContent>
          </Tooltip>
        ) : gatilho}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" className="w-48">
        {acoes.map(a => (
          <DropdownMenuItem key={a.url} onSelect={() => navigate(a.url)}>
            <a.icon className="mr-2 h-4 w-4" />
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/sidebar/SidebarFavorites.tsx src/components/admin/sidebar/SidebarRecent.tsx src/components/admin/sidebar/SidebarQuickActions.tsx
git commit -m "feat: adiciona favoritos, recentes e ações rápidas da sidebar

Quick Actions só oferece o que o usuário já tem permissão de ver: a lista
é cruzada com os itens visíveis, sem regra de permissão própria."
```

---

## Task 9: Rodapé com avatar, nome e cargo

**Files:**
- Create: `src/components/admin/sidebar/SidebarUserMenu.tsx`

**Interfaces:**
- Consumes: `usePermissions().profile` (tem `nome`, `foto`, `perfil`), `useAuth().signOut`, `PERFIL_INFO` de `@/lib/permissions`
- Produces: `<SidebarUserMenu collapsed />`

**Nenhuma query nova:** `usePermissions()` já devolve o perfil completo.

- [ ] **Step 1: Implementar o componente**

```tsx
import { useNavigate } from 'react-router-dom';
import { UserCircle, LogOut, MoreVertical } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { PERFIL_INFO } from '@/lib/permissions';
import { APP_VERSION, APP_BUILD_NUMBER, APP_COMMIT } from '@/version';
import { cn } from '@/lib/utils';

function iniciais(nome: string | undefined, email: string | undefined): string {
  const base = nome?.trim() || email?.split('@')[0] || '?';
  const partes = base.split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

export function SidebarUserMenu({ collapsed }: { collapsed: boolean }) {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { profile } = usePermissions();

  const nome = profile?.nome || user?.email || 'Usuário';
  const cargo = profile?.perfil ? PERFIL_INFO[profile.perfil]?.label : null;

  const avatar = (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {profile?.foto
        ? <img src={profile.foto} alt="" className="h-full w-full object-cover" />
        : iniciais(profile?.nome, user?.email)}
    </span>
  );

  const menu = (
    <DropdownMenuContent align="end" side="top" className="w-56">
      <div className="px-2 py-1.5">
        <p className="truncate text-sm font-medium">{nome}</p>
        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => navigate('/admin/meu-perfil')}>
        <UserCircle className="mr-2 h-4 w-4" />
        Meu Perfil
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={signOut}>
        <LogOut className="mr-2 h-4 w-4" />
        Sair
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  if (collapsed) {
    return (
      <div className="flex justify-center border-t border-sidebar-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Menu de ${nome}`}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            {avatar}
          </DropdownMenuTrigger>
          {menu}
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="border-t border-sidebar-border p-3">
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Menu de ${nome}`}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left',
            'transition-colors duration-[180ms] hover:bg-sidebar-accent',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          )}
        >
          {avatar}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{nome}</span>
            {cargo && <span className="block truncate text-[11px] font-medium text-muted-foreground">{cargo}</span>}
          </span>
          <MoreVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </DropdownMenuTrigger>
        {menu}
      </DropdownMenu>

      <p
        className="pt-2 text-center text-[10px] text-muted-foreground"
        title={`Build ${APP_BUILD_NUMBER} · ${APP_COMMIT}`}
      >
        GrauOS <span className="font-bold text-foreground">{APP_VERSION}</span>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/sidebar/SidebarUserMenu.tsx
git commit -m "feat: adiciona rodapé da sidebar com avatar, nome e cargo

Sem query nova: usePermissions() já devolve profile com nome, foto e perfil."
```

---

## Task 10: Ligar a busca ao CommandLauncher existente

> **CANCELADA como estava escrita.** Durante a execução do plano, o Fábio
> implementou em paralelo um `CommandLauncher` (`src/components/admin/CommandLauncher.tsx`,
> commit `94dd577`) que já é uma paleta de comandos sobre `cmdk` + `SearchRegistry`
> e **já registra `Ctrl/Cmd+K`**. Construir um `SidebarSearch` próprio criaria um
> segundo handler na mesma tecla e dois diálogos concorrentes.
>
> **Não criar `SidebarSearch.tsx`.** O botão de busca da sidebar apenas abre a
> paleta que já existe. Restrição: **não alterar** `CommandLauncher`,
> `WorkspaceTabs`, `WorkspaceTabsContext`, `TelemetryContext`,
> `AdminWorkspaceLayout`, `searchRegistry` nem `workspaceRegistry/` — são do
> Fábio e ficam como estão.

**Files:** nenhum arquivo novo. A ligação acontece na Task 11.

**Interfaces:**
- Consumes: `useWorkspaceTabs()` de `@/contexts/WorkspaceTabsContext`, que expõe
  `setCommandLauncherOpen(open: boolean)` e `isCommandLauncherOpen: boolean`
- Produces: nada

- [ ] **Step 1: Confirmar a API do contexto**

Run: `grep -n "setCommandLauncherOpen\|openTab" src/contexts/WorkspaceTabsContext.tsx`
Expected: ambos exportados no value do provider.

- [ ] **Step 2: Nenhum código nesta task**

A Task 11 usa `setCommandLauncherOpen(true)` no botão de busca e **não** registra
`Ctrl+K`. Seguir para a Task 11.

<details>
<summary>Implementação original (descartada — mantida só como registro)</summary>

**Interfaces originais:**
- Consumes: `VisibleItem` (Task 3), `ui/command.tsx`
- Produces: `<SidebarSearch open onOpenChange items />`

- [ ] **Step 1: Implementar o componente**

```tsx
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import type { VisibleItem } from './navFilter';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: VisibleItem[];
}

export function SidebarSearch({ open, onOpenChange, items }: Props) {
  const navigate = useNavigate();

  // Agrupa por seção para o resultado ter contexto, como no Linear.
  const porSecao = items.reduce<Record<string, VisibleItem[]>>((acc, item) => {
    (acc[item.sectionLabel] ??= []).push(item);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar no menu..." />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        {Object.entries(porSecao).map(([secao, itens]) => (
          <CommandGroup key={secao} heading={secao}>
            {itens.map(item => (
              <CommandItem
                key={item.url}
                // `value` é o que o cmdk filtra: inclui a seção para que
                // buscar por "estoque" ache os itens daquele grupo.
                value={`${item.title} ${secao}`}
                onSelect={() => { navigate(item.url); onOpenChange(false); }}
              >
                <item.icon className="mr-2 h-4 w-4 shrink-0" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/sidebar/SidebarSearch.tsx
git commit -m "feat: reescreve a busca da sidebar sobre cmdk

Resultados agrupados por seção e filtro que casa também com o nome do
grupo — buscar 'estoque' passa a achar os itens daquele bloco."
```

</details>

---

## Task 11: Shell AdminSidebarV2 e flag de versão

> **AMENDADA** após o commit `94dd577` (abas + CommandLauncher do Fábio):
> 1. **Não** registrar `Ctrl+K` — o `CommandLauncher` já registra. Remover o
>    `useEffect` de Ctrl+K do código abaixo.
> 2. **Não** importar nem renderizar `SidebarSearch` (não existe mais).
>    O botão de busca chama `setCommandLauncherOpen(true)` de `useWorkspaceTabs()`.
> 3. Os itens de menu continuam `NavLink` comuns: o `WorkspaceTabsContext` abre a
>    aba sozinho via `useEffect` em `location.pathname`. **Não** chamar `openTab`.
> 4. O `AdminLayout.tsx` mudou (novo `AdminLayoutContext`, early-return `isNested`,
>    `<WorkspaceTabs />`). Ler o arquivo atual antes de editar e **preservar tudo
>    isso**; apenas acrescentar a flag e tornar o `SidebarProvider` controlado.
> 5. **Não alterar** `CommandLauncher`, `WorkspaceTabs*`, `WorkspaceTabsContext`,
>    `TelemetryContext`, `AdminWorkspaceLayout`, `searchRegistry`,
>    `workspaceRegistry/`.

**Files:**
- Create: `src/components/admin/sidebar/AdminSidebarV2.tsx`
- Modify: `src/components/admin/AdminLayout.tsx`

**Interfaces:**
- Consumes: todos os componentes das Tasks 6–10, `useSidebarNav` (Task 4), `useSidebarPrefs` (Task 5), `useSidebarBadges`
- Produces: `<AdminSidebarV2 />`; flag `grauos_sidebar_v2`

**Este é o primeiro momento em que dá para ver o resultado funcionando.**

**Decisão de shell:** a V2 renderiza **dentro** do primitivo `<Sidebar>` do shadcn, não num `<aside>` próprio. É o primitivo que entrega o `Sheet` lateral no mobile, as variáveis de largura ajustadas na Task 2 e a integração com o `SidebarTrigger` que o `AdminLayout` já usa. Só o conteúdo interno é nosso — `SidebarMenuButton` e afins não são usados, para não brigar com o estilo da Task 6.

Por consequência, **quem manda no estado recolhido é o `SidebarProvider`**, não o `useSidebarPrefs`. O `AdminLayout` semeia e persiste esse estado em LocalStorage.

- [ ] **Step 1: Implementar `AdminSidebarV2.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen, Search, Sparkles } from 'lucide-react';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, useSidebar } from '@/components/ui/sidebar';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useSidebarBadges } from '@/hooks/useSidebarBadges';
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
import { useWorkspaceTabs } from '@/contexts/WorkspaceTabsContext';
import type { VisibleItem } from './navFilter';

export function AdminSidebarV2() {
  const location = useLocation();
  const navigate = useNavigate();

  const { sections, allVisibleItems } = useSidebarNav(location.pathname);
  const prefs = useSidebarPrefs();
  const { data: badgeData } = useSidebarBadges();

  // O primitivo é a fonte de verdade do recolhido. No mobile ele vira Sheet
  // (largura cheia), então lá `collapsed` é sempre false.
  const { state, isMobile, toggleSidebar, setOpenMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;

  const badgeMap = useMemo<Record<string, BadgeConfig>>(() => ({
    '/admin/orders': { count: badgeData?.pending ?? 0, color: 'bg-red-500' },
    '/admin/kds':    { count: badgeData?.kitchen ?? 0, color: 'bg-amber-500' },
  }), [badgeData]);

  // Ctrl+K NAO e registrado aqui: o CommandLauncher do Fabio ja registra
  // esse atalho. A sidebar so abre a paleta que ja existe.
  const { setCommandLauncherOpen } = useWorkspaceTabs();

  // Registra a tela atual em Recentes.
  const { pushRecent } = prefs;
  useEffect(() => {
    if (allVisibleItems.some(i => i.url === location.pathname)) {
      pushRecent(location.pathname);
    }
  }, [location.pathname, allVisibleItems, pushRecent]);

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

  // No mobile, navegar precisa fechar o Sheet — senão ele cobre a tela nova.
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [location.pathname, isMobile, setOpenMobile]);

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

          {/* Busca */}
          {collapsed ? (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setCommandLauncherOpen(true)}
                  aria-label="Buscar no menu"
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
              <span className="flex-1 text-left">Buscar no menu...</span>
              <kbd className="rounded border border-sidebar-border px-1 py-0.5 text-[10px]">Ctrl K</kbd>
            </button>
          )}
        </SidebarHeader>

        {/* Navegação */}
        <SidebarContent
          asChild
          className="sidebar-scroll flex-1 overflow-y-auto px-2 py-3"
        >
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
        {/* IA */}
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
```

- [ ] **Step 2: Adicionar a scrollbar customizada em `src/index.css`**

No final do arquivo:

```css
/* Scrollbar da sidebar: some em repouso, aparece ao passar o mouse. */
.sidebar-scroll {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.sidebar-scroll:hover {
  scrollbar-color: hsl(var(--sidebar-border)) transparent;
}
.sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}
.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-scroll::-webkit-scrollbar-thumb {
  background-color: transparent;
  border-radius: 3px;
}
.sidebar-scroll:hover::-webkit-scrollbar-thumb {
  background-color: hsl(var(--sidebar-border));
}
```

- [ ] **Step 3: Ligar a flag e controlar o provider no `AdminLayout.tsx`**

Imports novos:

```tsx
import { AdminSidebarV2 } from './sidebar/AdminSidebarV2';
import { STORAGE, readBool, writeBool, hasKey } from './sidebar/prefsStorage';
```

Dentro do componente, antes do `return`:

```tsx
  // ?sidebar=v2 liga, ?sidebar=v1 desliga; a escolha fica salva.
  const [usarV2] = useState(() => {
    try {
      const escolha = new URLSearchParams(window.location.search).get('sidebar');
      if (escolha === 'v2' || escolha === 'v1') {
        writeBool(STORAGE.versionFlag, escolha === 'v2');
      }
      return readBool(STORAGE.versionFlag, false);
    } catch {
      return false;
    }
  });

  // O provider é a fonte de verdade do recolhido; aqui ele é semeado do
  // LocalStorage e persistido a cada mudança.
  //
  // Sem preferência salva, tablet (<1024px) começa recolhido. Preferência
  // explícita do usuário sempre vence a heurística de viewport.
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (hasKey(STORAGE.collapsed)) return !readBool(STORAGE.collapsed, false);
    return window.innerWidth >= 1024;
  });

  const onSidebarOpenChange = useCallback((open: boolean) => {
    setSidebarOpen(open);
    writeBool(STORAGE.collapsed, !open);
  }, []);
```

Tornar o provider controlado — trocar `<SidebarProvider>` (linha 276) por:

```tsx
    <SidebarProvider open={sidebarOpen} onOpenChange={onSidebarOpenChange}>
```

E onde hoje está `<AdminSidebar />`:

```tsx
{usarV2 ? <AdminSidebarV2 /> : <AdminSidebar />}
```

Garantir que `useState` e `useCallback` estão importados de `react` no arquivo.

- [ ] **Step 4: Verificar tipos e testes**

Run: `npx tsc --noEmit && npm run test`
Expected: sem erros de tipo; todos os testes passam.

- [ ] **Step 5: Conferir no navegador**

Run: `npm run dev`, abrir `/admin/dashboard?sidebar=v2`.
Expected: sidebar nova; recolher/expandir funciona e persiste no reload; tooltip aparece no modo recolhido; Ctrl+K abre a busca; item ativo com barra roxa.

Abrir `/admin/dashboard?sidebar=v1`.
Expected: volta a sidebar antiga, intacta.

Reduzir a janela para menos de 768px com `?sidebar=v2`.
Expected: a sidebar vira o `Sheet` lateral (mesmo comportamento da V1); tocar num item navega **e fecha** o Sheet; o `SidebarTrigger` do cabeçalho continua abrindo.

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/sidebar/AdminSidebarV2.tsx src/components/admin/AdminLayout.tsx src/index.css
git commit -m "feat: monta a AdminSidebarV2 atrás da flag grauos_sidebar_v2

Liga com ?sidebar=v2 e volta com ?sidebar=v1. A V1 segue intacta e é o
padrão até a aprovação em produção."
```

---

## Task 12: Badges estendidos

**Files:**
- Modify: `src/hooks/useSidebarBadges.ts`
- Modify: `src/components/admin/sidebar/AdminSidebarV2.tsx` (`badgeMap`)

**Interfaces:**
- Consumes: `useSidebarBadges`
- Produces: `SidebarBadges` com `pending`, `kitchen`, `delivery`, `nps`, `supplyOrders`

**Restrição:** uma query agregada por assunto, não uma por badge. São leituras em tabelas existentes — não altera API nem schema.

- [ ] **Step 1: Estender o hook**

Substituir o conteúdo de `src/hooks/useSidebarBadges.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { startOfDay } from 'date-fns';

export interface SidebarBadges {
  pending: number;       // pedidos aguardando → Pedidos
  kitchen: number;       // em preparo → KDS
  delivery: number;      // saiu para entrega → Entregas
  nps: number;           // avaliações não lidas → Avaliações NPS
  supplyOrders: number;  // pedidos de insumo em aberto → Meus Pedidos
}

const VAZIO: SidebarBadges = { pending: 0, kitchen: 0, delivery: 0, nps: 0, supplyOrders: 0 };

export function useSidebarBadges() {
  const { currentStore } = useStore();

  return useQuery<SidebarBadges>({
    queryKey: ['sidebar-badges', currentStore?.id],
    queryFn: async () => {
      if (!currentStore?.id) return VAZIO;

      const today = startOfDay(new Date()).toISOString();

      // Uma leitura de `orders` cobre três badges de uma vez.
      //
      // Schema conferido nas migrations antes de escrever estas queries:
      //  · order_feedback (20260124151500): id, order_id, customer_id,
      //    nps_score, category, comment, created_at. NÃO tem `read_at`
      //    nem `store_id` — daí o join com orders e o critério ser
      //    "negativas de hoje" em vez de "não lidas", que é impossível.
      //  · franchisee_orders (20260312000000): tem `franchisee_user_id`,
      //    NÃO tem `store_id`. Status: pending, approved, rejected,
      //    shipping, delivered.
      const [orders, feedback, supply] = await Promise.all([
        supabase
          .from('orders')
          .select('status')
          .eq('store_id', currentStore.id)
          .in('status', ['pending', 'confirmed', 'preparing', 'out_for_delivery'])
          .gte('created_at', today),
        // `as any`: a tabela não está nos tipos gerados (a FeedbackPage
        // faz o mesmo cast, em src/pages/admin/feedback/FeedbackPage.tsx:24).
        (supabase as any)
          .from('order_feedback')
          .select('id, orders!inner(store_id)', { count: 'exact', head: true })
          .eq('orders.store_id', currentStore.id)
          .eq('category', 'negative')
          .gte('created_at', today),
        supabase
          .from('franchisee_orders')
          .select('id', { count: 'exact', head: true })
          .eq('franchisee_user_id', userId)
          .in('status', ['pending', 'approved', 'shipping']),
      ]);

      const rows = orders.data ?? [];

      return {
        pending: rows.filter(o => o.status === 'pending').length,
        kitchen: rows.filter(o => ['confirmed', 'preparing'].includes(o.status)).length,
        delivery: rows.filter(o => o.status === 'out_for_delivery').length,
        nps: feedback.count ?? 0,
        supplyOrders: supply.count ?? 0,
      };
    },
    enabled: !!currentStore?.id && !!userId,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
```

O `userId` vem do `useAuth()`, porque `franchisee_orders` é por usuário e não por loja. Acrescentar no topo do hook:

```ts
import { useAuth } from '@/contexts/AuthContext';
// dentro de useSidebarBadges():
const { user } = useAuth();
const userId = user?.id;
```
e incluir `userId` na `queryKey`: `['sidebar-badges', currentStore?.id, userId]`.

- [ ] **Step 2: Confirmar o schema antes de rodar**

Run:
```bash
grep -rn -A9 "CREATE TABLE.*order_feedback" supabase/migrations/*.sql | head -12
grep -rn -A6 "CREATE TABLE.*franchisee_orders" supabase/migrations/*.sql | head -8
```
Expected: `order_feedback` sem `read_at`/`store_id`; `franchisee_orders` com `franchisee_user_id`.

**Se a realidade divergir do comentário acima, corrigir a query — nunca inventar coluna.** Se um badge não for computável com o schema atual, remover o campo de `SidebarBadges` em vez de forçar.

- [ ] **Step 3: Ligar os badges novos no `badgeMap`**

Em `AdminSidebarV2.tsx`, substituir o `badgeMap`:

```tsx
  const badgeMap = useMemo<Record<string, BadgeConfig>>(() => ({
    '/admin/orders':               { count: badgeData?.pending ?? 0,      color: 'bg-red-500' },
    '/admin/kds':                  { count: badgeData?.kitchen ?? 0,      color: 'bg-amber-500' },
    '/admin/delivery':             { count: badgeData?.delivery ?? 0,     color: 'bg-blue-500' },
    '/admin/feedback':             { count: badgeData?.nps ?? 0,          color: 'bg-violet-500' },
    '/admin/orders/history':       { count: badgeData?.supplyOrders ?? 0, color: 'bg-emerald-600' },
  }), [badgeData]);
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit && npm run test`
Expected: sem erros.

Run: `npm run dev`, abrir `/admin/dashboard?sidebar=v2`.
Expected: badges aparecem e batem com a contagem da tela correspondente.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSidebarBadges.ts src/components/admin/sidebar/AdminSidebarV2.tsx
git commit -m "feat: estende os badges da sidebar para entregas, NPS e insumos

Três consultas em paralelo em vez de cinco: uma leitura de orders cobre
pedidos, cozinha e entregas."
```

---

## Task 13: Atalhos de teclado e listener da IA

**Files:**
- Modify: `src/components/admin/sidebar/AdminSidebarV2.tsx`
- Modify: `src/components/copilot/CopilotPanel.tsx`

**Interfaces:**
- Consumes: `MODULE_MENUS`, `setActiveModule` de `@/config/adminModules`
- Produces: `Alt+1..9` troca de módulo; `CustomEvent('grauos:copilot:open')` abre o Copilot

- [ ] **Step 1: Adicionar o listener no `CopilotPanel.tsx`**

Dentro do componente `CopilotPanel`, junto aos outros `useEffect`:

```tsx
    // Permite abrir o painel de fora (item "Pergunte à IA" na sidebar) sem
    // acoplar os componentes: se ninguém despachar o evento, nada acontece.
    useEffect(() => {
        const abrir = () => setIsOpen(true);
        window.addEventListener('grauos:copilot:open', abrir);
        return () => window.removeEventListener('grauos:copilot:open', abrir);
    }, []);
```

- [ ] **Step 2: Adicionar os atalhos de módulo no `AdminSidebarV2.tsx`**

Acrescentar o import:

```tsx
import { MODULE_MENUS, setActiveModule, type ModuleId } from '@/config/adminModules';
```

E o efeito, logo após o handler de Ctrl+K:

```tsx
  // Alt+1..9 troca de módulo, na ordem de MODULE_MENUS.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;

      // Não sequestrar o teclado enquanto o usuário digita.
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest('input, textarea, [contenteditable="true"]')) return;

      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 9) return;

      const modulos = Object.keys(MODULE_MENUS) as ModuleId[];
      const alvoModulo = modulos[n - 1];
      if (!alvoModulo) return;

      e.preventDefault();
      setActiveModule(alvoModulo);
      navigate('/admin/hub');
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit && npm run test`
Expected: sem erros.

Run: `npm run dev`, abrir `/admin/dashboard?sidebar=v2`.
Expected: `Alt+2` troca de módulo; digitar "2" com Alt dentro de um campo de busca **não** troca; clicar em "Pergunte à IA" abre o Copilot.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/sidebar/AdminSidebarV2.tsx src/components/copilot/CopilotPanel.tsx
git commit -m "feat: adiciona Alt+1..9 para trocar de módulo e abre o Copilot pela sidebar

O CopilotPanel guarda isOpen local; o CustomEvent evita levantar esse
estado para um contexto só por causa de um botão."
```

---

## Task 14: Animações e movimento reduzido

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Consumes: nada
- Produces: regra global de `prefers-reduced-motion` para a sidebar

**Decisão:** os acordeões já animam por CSS (`grid-template-rows`), que é mais leve que JS. `framer-motion` fica reservado a um único ponto — a entrada dos itens quando um grupo abre — e só se a animação CSS não bastar na revisão visual. Não introduzir `framer-motion` sem necessidade demonstrada é intencional.

- [ ] **Step 1: Adicionar a regra de movimento reduzido em `src/index.css`**

No final do arquivo:

```css
/* Acessibilidade: quem pediu menos movimento no sistema não recebe nenhum. */
@media (prefers-reduced-motion: reduce) {
  aside .sidebar-scroll *,
  aside [class*='transition-'],
  aside [class*='duration-'] {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 2: Conferir com movimento reduzido ligado**

No macOS: Ajustes → Acessibilidade → Tela → Reduzir movimento.
Run: `npm run dev`, abrir `/admin/dashboard?sidebar=v2`.
Expected: recolher/expandir e abrir/fechar grupo acontecem instantaneamente, sem animação.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: respeita prefers-reduced-motion na sidebar"
```

---

## Task 15: Verificação final e remoção da V1

**Files:**
- Delete: `src/components/admin/AdminSidebar.tsx`
- Modify: `src/components/admin/AdminLayout.tsx`

**Interfaces:**
- Consumes: tudo
- Produces: `AdminSidebarV2` como única sidebar

**Só executar depois da aprovação do Fábio em produção.** Se a aprovação ainda não veio, parar na Task 14 e reportar.

- [ ] **Step 1: Roteiro de verificação — paridade de itens**

Com `?sidebar=v2`, percorrer os 11 módulos e conferir que cada um mostra **exatamente** as mesmas seções e itens da V1 (`?sidebar=v1`):

`operacao`, `estoque`, `financeiro`, `performance`, `assistente`, `pedidos`, `crm`, `caf`, `agenda`, `universidade`, `frota`.

Expected: nenhum item a mais, nenhum a menos, em nenhum módulo.

- [ ] **Step 2: Roteiro de verificação — permissões**

Repetir o passo 1 logado como `itallogeroncio@gmail.com` (perfil não-master).
Expected: itens `isMasterOnly` seguem ocultos; nenhum item novo aparece.

- [ ] **Step 3: Roteiro de verificação — restante**

- Alternar expandido/recolhido, recarregar → estado persiste.
- Fixar, reordenar e remover favoritos, recarregar → ordem persiste.
- Navegar a sidebar inteira só com teclado (Tab, ↑↓, Enter, Esc).
- Conferir tema claro e escuro.
- Conferir mobile (< 768px) e tablet.
- Recentes registra e limita a 3 exibidos.
- Quick Actions some para quem não tem a permissão correspondente.

- [ ] **Step 4: Remover a V1**

```bash
rm src/components/admin/AdminSidebar.tsx
```

Em `AdminLayout.tsx`: remover o import de `AdminSidebar`, remover o bloco da flag (`params`, `escolha`, `usarV2`) e deixar apenas:

```tsx
<AdminSidebarV2 />
```

- [ ] **Step 5: Confirmar que nada mais referencia a V1**

Run: `grep -rn "AdminSidebar\b" src/ | grep -v AdminSidebarV2`
Expected: nenhuma ocorrência.

- [ ] **Step 6: Verificação final**

Run: `npx tsc --noEmit && npm run test && npm run build`
Expected: tudo passa.

- [ ] **Step 7: Commit**

```bash
git add -A src/components/admin/
git commit -m "chore: remove a sidebar V1 e a flag de versão

A V2 foi aprovada em produção. Paridade de itens conferida nos 11
módulos, com usuário master e não-master."
```

---

## Registro no Obsidian

Ao final da implementação, conforme o `CLAUDE.md` do projeto:

- `Açaí no Grau/Decisões.md` — decisão de redesenhar a navegação mantendo a arquitetura de módulos, com o motivo de ter recusado a lista global; e a decisão de adotar vitest para a lógica da sidebar.
- `Açaí no Grau/Sessões/2026-08-05.md` — resumo do trabalho.
- `Açaí no Grau/Bugs & Pendências.md` — a V2 "Central de Comando" (Command Palette com busca de entidades e Mission Sidebar) fica registrada como pendência, com as perguntas de produto em aberto.
