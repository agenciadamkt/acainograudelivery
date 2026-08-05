# Redesign da Sidebar do GrauOS

**Data:** 2026-08-05
**Status:** aprovado para planejamento
**Escopo:** camada de interface da navegação do admin

---

## 1. Problema

A `AdminSidebar.tsx` funciona, mas parece um menu administrativo, não um produto SaaS. Três causas concretas, todas verificadas no código:

1. **Os tokens de superfície não existem.** `src/components/ui/sidebar.tsx` usa `bg-sidebar`, `text-sidebar-foreground`, `bg-sidebar-accent` e `border-sidebar-border`, mas nenhum desses tokens está definido em `tailwind.config.ts` nem em `src/index.css` (zero ocorrências). As classes não geram estilo, a sidebar herda o fundo da página e o resultado é uma navegação sem separação visual do conteúdo.
2. **O item ativo comunica seleção só por cor** (`text-primary` + `font-semibold`), sem fundo, borda ou indicador de posição.
3. **O modo recolhido é cego.** Com 48px e sem tooltip, o usuário precisa reexpandir para descobrir o que cada ícone faz.

Somado a isso, o arquivo tem 440 linhas concentrando permissões, favoritos, busca, render de item e rodapé — o que torna cada adição mais cara que a anterior.

## 2. Objetivo

Elevar a navegação ao padrão de Linear/Stripe/Notion **sem tocar em comportamento**: nenhuma rota, item de menu, regra de permissão, chamada de API ou tabela muda.

### Não-objetivos

- Redesenhar o Hub (`/admin/hub`) ou qualquer página de conteúdo.
- Alterar `MODULE_MENUS` — os itens e grupos permanecem exatamente como estão.
- Alterar a identidade visual. O roxo `--primary: 262 50% 47%` e a Inter continuam; o que muda é o uso deliberado deles.
- Mexer nos layouts CheckGrau, Frota ou Colaborador. Verificado: só `AdminLayout`, `AdminSidebar` e `MobileBottomNav` importam de `@/components/ui/sidebar`.

## 3. Decisões tomadas

| Tema | Decisão | Motivo |
|---|---|---|
| Arquitetura de navegação | Mantém um módulo por vez (`getActiveModule`) | O pedido dizia "não alterar estrutura de módulos". A lista de grupos do pedido (Comercial, Produção, Logística, Pessoas, Inteligência) era texto genérico de template e foi descartada — a estrutura real já bate 1:1 com as seções existentes. |
| Rollout | Componente novo atrás de flag | Produção ativa. Rollback instantâneo apagando uma chave de LocalStorage. |
| Virtualização | Cortada | O maior módulo tem ~45 itens e só grupos abertos renderizam. Virtualizar adicionaria dependência, quebraria navegação por teclado e brigaria com as animações de acordeão. Em vez disso, grupos fechados passam a desmontar de fato (hoje só recebem `hidden`). |
| Reordenar favoritos | Setas ↑↓ no hover | Máximo de 6 itens. Funciona por teclado sem trabalho extra e não adiciona os ~30kb do `@dnd-kit`. |
| Acordeão | Grupos e subgrupos ambos multi-abertos | O pedido se contradizia (item 5 pedia grupos livres, item 6 pedia um submenu por vez). Forçar um só aberto atrapalha quem monta lista de compras olhando o estoque. |

## 4. Arquitetura

### 4.1 Estrutura de arquivos

```
src/components/admin/sidebar/
  AdminSidebarV2.tsx      shell; orquestra estado e decide expandido/recolhido
  SidebarNavItem.tsx      item: ícone, label, badge, estrela, tooltip
  SidebarSection.tsx      grupo recolhível (OPERAÇÃO, CARDÁPIO, …)
  SidebarSubGroup.tsx     acordeão dos subGroups (Controle, Compras, …)
  SidebarFavorites.tsx    favoritos + reordenação ↑↓
  SidebarUserMenu.tsx     rodapé: avatar, nome, cargo, menu contextual
  SidebarSearch.tsx       dialog Ctrl+K
  useSidebarPrefs.ts      toda a persistência em LocalStorage
  useSidebarNav.ts        filtro por permissão → itens visíveis
```

### 4.2 Fronteiras

**`useSidebarNav(pathname)`** — única fonte de verdade sobre visibilidade. Recebe a rota, lê `MODULE_MENUS`, aplica `isMasterOnly` / `requireRole` / `requiredPermission` e devolve `{ sections, allVisibleItems, activeModule }`. A camada visual nunca decide permissão. É isto que garante o "não alterar permissões": a regra existe num lugar só e o redesign não encosta nela.

**`useSidebarPrefs()`** — única escrita em LocalStorage. Devolve `{ collapsed, openSections, favorites, toggleCollapsed, toggleSection, toggleFavorite, moveFavorite }`.

**Componentes de apresentação** — `SidebarNavItem`, `SidebarSection`, `SidebarSubGroup` recebem tudo por props e não leem contexto de permissão nem LocalStorage. Testáveis isoladamente.

### 4.3 Persistência e migração

| Chave | Formato hoje | Formato novo |
|---|---|---|
| `grauos_sidebar_open` | `string[]` | inalterado |
| `grauos_favorites` | `string[]` (de um `Set`, sem ordem) | `string[]` **ordenado** |
| `grauos_active_module` | `ModuleId` | inalterado |
| `grauos_sidebar_collapsed` | — | `boolean` (novo) |

A mudança nos favoritos é só semântica: o formato serializado continua sendo um array de URLs. `useSidebarPrefs` lê o array existente e passa a respeitar a ordem — **nenhum usuário perde favoritos já fixados** e não é preciso código de migração especial. URLs que não existem mais em `MODULE_MENUS` são ignoradas na renderização (já é o comportamento atual, via `filter`).

## 5. Design visual

### 5.1 Tokens novos

Definidos em `src/index.css`, derivados da identidade existente. O conjunto é exatamente o que o `ui/sidebar.tsx` referencia: `sidebar`, `sidebar-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border` e `sidebar-ring`.

**Atenção ao significado de `--sidebar-accent`.** No `ui/sidebar.tsx` ele é o fundo de **hover** de todo botão do menu (`hover:bg-sidebar-accent`). Ele fica **neutro**, não roxo: o roxo é reservado para o estado ativo. Se os dois fossem roxo claro ficariam quase indistinguíveis — `primary/10` sobre branco resulta praticamente na mesma cor de um tint roxo a 96% de luminosidade. Hover neutro e ativo roxo é o padrão de Linear e Stripe, e mantém a hierarquia legível.

```css
:root {
  --sidebar:                     0 0% 100%;
  --sidebar-foreground:          0 0% 20%;
  --sidebar-accent:              0 0% 94%;    /* hover NEUTRO */
  --sidebar-accent-foreground:   0 0% 20%;
  --sidebar-border:              0 0% 90%;
  --sidebar-ring:              262 50% 47%;   /* foco = roxo da identidade */
}
.dark {
  --sidebar:                   222.2 84% 7%;
  --sidebar-foreground:          210 40% 98%;
  --sidebar-accent:            217.2 32.6% 17.5%;
  --sidebar-accent-foreground:   210 40% 98%;
  --sidebar-border:            217.2 32.6% 17.5%;
  --sidebar-ring:              262 50% 47%;
}
```

Registrados em `tailwind.config.ts` sob `colors.sidebar` para que as classes que o `ui/sidebar.tsx` já usa passem a funcionar.

O estado ativo **não** usa `bg-sidebar-accent`. O `SidebarNavItem` sobrescreve `data-[active=true]` com o tratamento roxo descrito em 5.3. Essa sobrescrita é intencional e precisa ser mantida caso o `ui/sidebar.tsx` seja atualizado.

O contraste de `--sidebar-accent-foreground` sobre `--sidebar-accent` deve ser conferido contra WCAG AA (mínimo 4.5:1) nos dois temas durante a implementação.

### 5.2 Dimensões

| Constante | Hoje | Novo |
|---|---|---|
| `SIDEBAR_WIDTH` | `16rem` (256px) | `17.5rem` (280px) |
| `SIDEBAR_WIDTH_ICON` | `3rem` (48px) | `4.5rem` (72px) |
| `SIDEBAR_WIDTH_MOBILE` | `18rem` | inalterado |

### 5.3 Estados do item

| Estado | Tratamento |
|---|---|
| Repouso | `text-sidebar-foreground/80`, ícone 16px, peso 500 |
| Hover | fundo `sidebar-accent` (neutro), texto full opacity, 180ms |
| Ativo | fundo `primary/10`, radius 8px, barra 3px roxa à esquerda, `ring-1 ring-primary/20`, ícone e texto roxos, peso 600 |
| Foco | `focus-visible:ring-2 ring-primary` |
| `highlight` (PDV) | mantém o realce atual, sem conflitar com o estado ativo |

A barra lateral é um pseudo-elemento posicionado, não um `border-left` — assim não desloca o conteúdo ao ativar.

### 5.4 Tipografia

| Elemento | Tamanho | Peso |
|---|---|---|
| Rótulo de grupo | 11px, uppercase, `tracking-wider` | 600 |
| Item | 14px | 500 |
| Item ativo | 14px | 600 |
| Subgrupo | 13px | 400 |
| Rodapé (cargo) | 11px | 500 |

### 5.5 Modo recolhido (72px)

Ícones centralizados. Tooltip Radix `side="right"`, delay 200ms, mostrando o título do item. Rótulos de grupo viram um separador de 1px, preservando a noção de blocos sem texto. Favoritos e busca aparecem como ícone único.

### 5.6 Rodapé

Expandido: avatar (`profile.foto`, com iniciais de `profile.nome` como fallback), nome, cargo derivado de `profile.perfil` via `PERFIL_INFO` (já existe em `src/lib/permissions.ts`, com label e cores), botão ⋮ abrindo Meu Perfil / Sair, e a versão do sistema.

Recolhido: só o avatar; clique abre `DropdownMenu` com as mesmas ações.

Nenhuma consulta nova: `usePermissions()` já devolve `profile` com `nome`, `foto` e `perfil`.

## 6. Movimento

Todas as transições em **180ms `ease-out`** (dentro do limite de 200ms pedido).

Acordeões animam `grid-template-rows: 0fr → 1fr`, que anima altura variável sem JS e sem medir o DOM. O conteúdo interno usa `overflow: hidden` e `min-height: 0`.

Tudo envolto em `@media (prefers-reduced-motion: reduce)` zerando durações — requisito de acessibilidade, não enfeite.

## 7. Acessibilidade

- `<nav aria-label="Navegação principal">` envolvendo a lista.
- Grupos: `<button aria-expanded aria-controls>`; a região correspondente com `id` e `role="region"`.
- Item ativo: `aria-current="page"`.
- Botão de recolher: `aria-label` dinâmico ("Recolher menu" / "Expandir menu").
- Estrela de favorito: `aria-pressed` + `aria-label` descritivo.
- Setas ↑↓ de reordenação: `aria-label` ("Mover Pedidos para cima").
- Navegação: ↑↓ percorre itens, Enter abre, Esc fecha a busca, Ctrl/Cmd+K abre.
- `focus-visible` com ring roxo em todo elemento interativo.
- Tooltips do modo recolhido não são a única fonte do nome: o `aria-label` do link carrega o título.

## 8. Scrollbar

6px de largura, `transparent` em repouso, `hsl(var(--sidebar-border))` no hover da sidebar, via `::-webkit-scrollbar` mais `scrollbar-width: thin` e `scrollbar-color` para Firefox. Aplicada só ao container da sidebar, por uma classe dedicada — não global.

## 9. Responsividade

Desktop e notebook: expandido ou recolhido, conforme preferência salva.

Tablet (`< 1024px`): recolhido **como padrão inicial apenas quando não existe preferência salva**. Se o usuário já escolheu um estado, a escolha dele vence em qualquer largura — preferência explícita nunca é sobrescrita por heurística de viewport.

Mobile (`< 768px`): `Sheet` lateral, que o `ui/sidebar.tsx` já implementa. Nesse modo não existe estado recolhido, e a preferência de desktop fica intocada. `MobileBottomNav` permanece sem alteração.

## 10. Rollout

`AdminLayout` escolhe o componente:

```
grauos_sidebar_v2 === 'true'  →  AdminSidebarV2
caso contrário                →  AdminSidebar (atual, intacta)
```

A chave é ativada por `?sidebar=v2` na URL, que grava no LocalStorage. `?sidebar=v1` volta atrás.

Depois da aprovação em produção: remover `AdminSidebar.tsx`, renomear a V2 para `AdminSidebar.tsx` e apagar a flag. Essa limpeza é parte do trabalho, não um "depois" indefinido.

## 11. Verificação

Sem suíte de testes de UI no projeto hoje, a verificação é manual e roteirizada:

1. `npx tsc --noEmit` limpo.
2. Com a flag ligada, percorrer os 11 módulos (`operacao`, `estoque`, `financeiro`, `performance`, `assistente`, `pedidos`, `crm`, `caf`, `agenda`, `universidade`, `frota`) e conferir que cada um mostra exatamente as mesmas seções e itens da V1. Este é o teste que protege o "não remover nenhuma funcionalidade".
3. Repetir com um usuário não-master (o Ítalo, `manager`) e confirmar que os itens `isMasterOnly` seguem ocultos.
4. Alternar expandido/recolhido, recarregar, confirmar persistência.
5. Fixar, reordenar e remover favoritos; recarregar; confirmar ordem.
6. Navegar a sidebar inteira só com teclado.
7. Conferir claro e escuro.
8. Conferir mobile (Sheet) e tablet.

## 12. Riscos

| Risco | Mitigação |
|---|---|
| Regressão na navegação em produção | Flag com rollback instantâneo |
| Um item sumir por engano na V2 | Passo 2 da verificação compara módulo a módulo |
| Tokens novos afetarem outra área | Verificado: só 3 arquivos do admin importam `ui/sidebar`; os tokens `--sidebar-*` não são usados em nenhum outro lugar |
| Mudar largura quebrar o `AdminLayout` | O layout usa a variável CSS, não valores fixos |
| Código duplicado enquanto a flag existe | Remoção da V1 é item explícito do plano |
