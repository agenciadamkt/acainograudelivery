/**
 * Registro central de módulos da navegação do admin.
 *
 * Objetivo: cada cartão da Home (/admin/hub) é um MÓDULO independente com sua
 * própria navegação. O AdminSidebar renderiza apenas o menu do módulo ATIVO —
 * nunca mistura menus de módulos diferentes.
 *
 * - MODULE_MENUS: para cada módulo, as seções/itens que ele exibe. Um mesmo
 *   item pode aparecer em mais de um módulo quando faz sentido (ex.: "Campanhas"
 *   no PDV e no CRM) — isso é intencional.
 * - O módulo ativo é definido ao clicar no cartão do Hub (persistido em
 *   localStorage) e, como fallback (acesso direto por URL), inferido pela rota.
 */
import {
  LayoutDashboard, ShoppingBag, Package, DollarSign, Users, Settings, Truck,
  Monitor, FolderTree, PackageOpen, Plus, Store, Megaphone, BarChart3,
  MessageSquare, ShoppingCart, Grid, Wallet, History, Barcode, PieChart, Leaf,
  GraduationCap, BookOpen, ClipboardCheck, ListChecks, ClipboardList, Settings2,
  FileText, UserCircle, Gift, RotateCcw, KanbanSquare, BookMarked, BarChart2,
  ShieldCheck, Headphones, Video, CalendarDays, CalendarRange, Building2,
} from 'lucide-react';
import type { UserRole } from '@/contexts/AuthContext';

export interface MenuItem {
  title: string;
  url: string;
  icon: any;
  highlight?: boolean;
  requireRole?: UserRole;
  isMasterOnly?: boolean;
  requiredPermission?: string;
  subGroup?: string;
}

export interface MenuSection {
  id: string;
  label: string;
  requireRole?: UserRole;
  isMasterOnly?: boolean;
  defaultOpen?: boolean;
  items: MenuItem[];
}

export type ModuleId =
  | 'operacao' | 'estoque' | 'performance' | 'financeiro' | 'assistente'
  | 'pedidos' | 'crm' | 'caf' | 'agenda' | 'universidade' | 'frota';

// ──────────────────────────────────────────────────────────────────────────
// Seções reutilizáveis (definição única dos itens)
// ──────────────────────────────────────────────────────────────────────────

const SEC_OPERACAO: MenuSection = {
  id: 'operacao', label: '🔥 OPERAÇÃO EM TEMPO REAL', defaultOpen: true,
  items: [
    { title: 'Dashboard', url: '/admin/dashboard', icon: LayoutDashboard },
    { title: 'PDV [BALCÃO]', url: '/admin/pdv/nova-venda', icon: ShoppingCart, highlight: true },
    { title: 'Mesas', url: '/admin/pdv/mesas', icon: Grid },
    { title: 'Pedidos', url: '/admin/orders', icon: ShoppingBag },
    { title: 'KDS Cozinha', url: '/admin/kds', icon: Monitor },
    { title: 'Caixa', url: '/admin/pdv/caixa', icon: Wallet },
    { title: 'Histórico de Turnos', url: '/admin/pdv/caixa/historico', icon: History, requireRole: 'manager' },
    { title: 'Entregas', url: '/admin/delivery', icon: Truck },
  ],
};

const SEC_CARDAPIO: MenuSection = {
  id: 'cardapio', label: '📋 CARDÁPIO & MENU', defaultOpen: true,
  items: [
    { title: 'Categorias', url: '/admin/menu/categories', icon: FolderTree },
    { title: 'Produtos', url: '/admin/menu/products', icon: PackageOpen },
    { title: 'Complementos', url: '/admin/menu/toppings', icon: Plus },
    { title: 'Ingredientes', url: '/admin/menu/ingredients', icon: Leaf },
    { title: 'Promoções', url: '/admin/promotions', icon: Megaphone },
  ],
};

const SEC_ESTOQUE: MenuSection = {
  id: 'estoque', label: '📦 ESTOQUE & SUPRIMENTOS',
  items: [
    { title: 'Painel Estoque', url: '/admin/stock/dashboard', icon: BarChart3, subGroup: 'Controle' },
    { title: 'Estoque Central', url: '/admin/stock/inventory', icon: Package, subGroup: 'Controle' },
    { title: 'Movimentações', url: '/admin/stock/movements', icon: History, subGroup: 'Controle' },
    { title: 'Contagem (Inventário)', url: '/admin/stock/counts', icon: Barcode, subGroup: 'Controle' },
    { title: 'Grupos de Contagem', url: '/admin/stock/count-groups', icon: ListChecks, requireRole: 'manager', subGroup: 'Controle' },
    { title: 'Contagem Recorrente', url: '/admin/stock/recurring-counts', icon: RotateCcw, requireRole: 'manager', subGroup: 'Controle' },
    { title: 'Lista de Compras', url: '/admin/stock/purchases', icon: ShoppingCart, subGroup: 'Compras' },
    { title: 'Histórico de Compras', url: '/admin/stock/purchase-history', icon: ClipboardCheck, subGroup: 'Compras' },
    { title: 'Rotinas Operacionais', url: '/admin/stock/checklists/execution', icon: ClipboardList, subGroup: 'Operacional' },
    { title: 'Relatórios de Rotinas', url: '/admin/stock/checklists/reports', icon: FileText, subGroup: 'Operacional' },
    { title: 'Gestão de Rotinas', url: '/admin/stock/checklists/admin', icon: Settings2, requireRole: 'manager', subGroup: 'Operacional' },
    { title: 'Gestão de CMV', url: '/admin/stock/cmv', icon: PieChart, subGroup: 'Operacional' },
    { title: 'Bonificações', url: '/admin/stock/bonificacoes', icon: Gift, subGroup: 'Operacional' },
  ],
};

const SEC_PDV_FINANCEIRO: MenuSection = {
  id: 'pdv-financeiro', label: '💰 FINANCEIRO & GESTÃO',
  items: [
    { title: 'Financeiro', url: '/admin/financeiro', icon: DollarSign },
    { title: 'Central de Relatórios', url: '/admin/pdv/relatorios', icon: BarChart3, requireRole: 'manager' },
  ],
};

const SEC_PDV_MARKETING: MenuSection = {
  id: 'pdv-marketing', label: '📣 MARKETING & CRM',
  items: [
    { title: 'Food Analytics', url: '/admin/analytics', icon: BarChart3, requireRole: 'manager' },
    { title: 'Campanhas', url: '/admin/marketing', icon: Megaphone },
    { title: 'Avaliações NPS', url: '/admin/feedback', icon: MessageSquare, requireRole: 'manager' },
  ],
};

const SEC_FRANQUIA: MenuSection = {
  id: 'franquia', label: '🤝 FRANQUIA NO GRAU',
  items: [
    { title: 'Pedido de Insumos', url: '/admin/orders/catalog', icon: ShoppingCart },
    { title: 'Meus Pedidos', url: '/admin/orders/history', icon: History },
    { title: 'Gestão de Cargas', url: '/admin/orders/management', icon: Package, requiredPermission: 'mas.cargas' },
    { title: 'Relatórios', url: '/admin/orders/reports', icon: BarChart2, requiredPermission: 'mas.relatorios' },
    { title: 'Catálogo de Insumos', url: '/admin/orders/products', icon: Grid, requiredPermission: 'mas.catalogo' },
    { title: 'Lista de Franqueados', url: '/admin/franchisees', icon: Store, requiredPermission: 'mas.franqueados' },
  ],
};

const SEC_ADMINISTRACAO: MenuSection = {
  id: 'administracao', label: '🛠️ ADMINISTRAÇÃO',
  items: [
    { title: 'Dados da Loja', url: '/admin/loja/dados', icon: Building2 },
    { title: 'Configurações PDV', url: '/admin/pdv/configuracoes', icon: Settings },
    { title: 'Configurações Gerais', url: '/admin/settings', icon: Settings },
    { title: 'Áreas de Entrega', url: '/admin/delivery/areas', icon: Truck },
    { title: 'Usuários & Permissões', url: '/admin/settings/usuarios', icon: Users, requireRole: 'manager', requiredPermission: 'sis.usuarios' },
    { title: 'Segurança do Sistema', url: '/admin/settings/seguranca', icon: ShieldCheck, isMasterOnly: true },
    { title: 'Manual Operacional', url: '/admin/help', icon: BookOpen },
    { title: 'Meu Perfil', url: '/admin/meu-perfil', icon: UserCircle },
  ],
};

// ──────────────────────────────────────────────────────────────────────────
// Menus por módulo — cada módulo exibe APENAS as seções abaixo
// ──────────────────────────────────────────────────────────────────────────

export const MODULE_MENUS: Record<ModuleId, MenuSection[]> = {
  operacao: [
    SEC_OPERACAO, SEC_CARDAPIO, SEC_ESTOQUE, SEC_PDV_FINANCEIRO,
    SEC_PDV_MARKETING, SEC_FRANQUIA, SEC_ADMINISTRACAO,
  ],
  estoque: [SEC_ESTOQUE],
  financeiro: [
    { id: 'financeiro', label: '💰 FINANCEIRO', defaultOpen: true, items: [
      { title: 'Financeiro', url: '/admin/financeiro', icon: DollarSign },
      { title: 'Central de Relatórios', url: '/admin/pdv/relatorios', icon: BarChart3, requireRole: 'manager' },
      { title: 'Food Analytics', url: '/admin/analytics', icon: BarChart3, requireRole: 'manager' },
    ] },
  ],
  performance: [
    { id: 'performance', label: '🏆 PERFORMANCE', defaultOpen: true, items: [
      { title: 'Performance', url: '/admin/performance', icon: BarChart2 },
      { title: 'Food Analytics', url: '/admin/analytics', icon: BarChart3, requireRole: 'manager' },
    ] },
  ],
  assistente: [
    { id: 'assistente', label: '🤖 ASSISTENTE IA', defaultOpen: true, items: [
      { title: 'GrauBot', url: '/admin/assistente', icon: MessageSquare },
    ] },
  ],
  pedidos: [
    { id: 'pedidos', label: '🤝 PEDIDOS DE INSUMOS', defaultOpen: true, items: [
      { title: 'Pedido de Insumos', url: '/admin/orders/catalog', icon: ShoppingCart },
      { title: 'Meus Pedidos', url: '/admin/orders/history', icon: History },
      { title: 'Gestão de Cargas', url: '/admin/orders/management', icon: Package, requiredPermission: 'mas.cargas' },
      { title: 'Relatórios', url: '/admin/orders/reports', icon: BarChart2, requiredPermission: 'mas.relatorios' },
      { title: 'Catálogo de Insumos', url: '/admin/orders/products', icon: Grid, requiredPermission: 'mas.catalogo' },
      { title: 'Lista de Franqueados', url: '/admin/franchisees', icon: Store, requiredPermission: 'mas.franqueados' },
    ] },
  ],
  crm: [
    { id: 'crm', label: '💬 CRM & MARKETING', isMasterOnly: true, defaultOpen: true, items: [
      { title: 'Pipeline de Leads', url: '/admin/crm/pipeline', icon: KanbanSquare },
      { title: 'Scripts / Playbook', url: '/admin/crm/scripts', icon: BookMarked },
      { title: 'Dashboard CRM', url: '/admin/crm/dashboard', icon: BarChart2 },
      { title: 'Campanhas', url: '/admin/marketing', icon: Megaphone },
      { title: 'Universidade', url: '/admin/universidade/admin', icon: GraduationCap },
    ] },
  ],
  caf: [
    { id: 'caf', label: '🎯 ATENDIMENTO CAF', isMasterOnly: true, defaultOpen: true, items: [
      { title: 'Dashboard CAF', url: '/admin/caf/dashboard', icon: Headphones },
      { title: 'Atendimentos', url: '/admin/caf/atendimentos', icon: MessageSquare },
      { title: 'Base de Conhecimento', url: '/admin/caf/base-conhecimento', icon: BookOpen },
      { title: 'Relatórios CAF', url: '/admin/caf/relatorios', icon: BarChart2, requireRole: 'manager' },
      { title: 'Cadastros CAF', url: '/admin/caf/cadastros', icon: Settings2, requireRole: 'manager' },
      { title: 'CAF Connect', url: '/admin/caf/connect', icon: Video },
    ] },
  ],
  agenda: [
    { id: 'agenda', label: '📅 AGENDA', isMasterOnly: true, defaultOpen: true, items: [
      { title: 'Calendário', url: '/admin/agenda/calendario', icon: CalendarRange },
      { title: 'Dashboard', url: '/admin/agenda/dashboard', icon: LayoutDashboard },
      { title: 'Minha Agenda', url: '/admin/agenda/minha', icon: CalendarDays },
      { title: 'Equipe', url: '/admin/agenda/equipe', icon: Users },
      { title: 'Compromissos', url: '/admin/agenda/compromissos', icon: ListChecks },
      { title: 'Relatórios', url: '/admin/agenda/relatorios', icon: FileText },
    ] },
  ],
  universidade: [
    { id: 'universidade', label: '🎓 UNIVERSIDADE NO GRAU', defaultOpen: true, items: [
      { title: 'Universidade', url: '/admin/universidade', icon: GraduationCap },
      { title: 'Gestão de Conteúdo', url: '/admin/universidade/admin', icon: Settings2, requireRole: 'manager' },
    ] },
  ],
  frota: [
    { id: 'frota', label: '🚚 CONTROLE DE FROTA', defaultOpen: true, items: [
      { title: 'Controle de Frota', url: '/admin/frota', icon: Truck },
    ] },
  ],
};

export const DEFAULT_MODULE: ModuleId = 'operacao';

// ──────────────────────────────────────────────────────────────────────────
// Detecção e persistência do módulo ativo
// ──────────────────────────────────────────────────────────────────────────

const STORAGE_ACTIVE_MODULE = 'grauos_active_module';

// Rotas EXCLUSIVAS de um módulo — sempre determinam o módulo ativo, mesmo que
// o usuário estivesse noutro módulo antes (evita ficar "preso" num módulo).
const EXCLUSIVE_PREFIX: [string, ModuleId][] = [
  ['/admin/crm', 'crm'],
  ['/admin/caf', 'caf'],
  ['/admin/agenda', 'agenda'],
  ['/admin/frota', 'frota'],
  ['/admin/assistente', 'assistente'],
  ['/admin/performance', 'performance'],
  // Operacionais (PDV)
  ['/admin/dashboard', 'operacao'],
  ['/admin/pdv', 'operacao'],
  ['/admin/menu', 'operacao'],
  ['/admin/kds', 'operacao'],
  ['/admin/delivery', 'operacao'],
  ['/admin/promotions', 'operacao'],
  ['/admin/settings', 'operacao'],
  ['/admin/loja', 'operacao'],
  ['/admin/meu-perfil', 'operacao'],
  ['/admin/help', 'operacao'],
  ['/admin/feedback', 'operacao'],
  ['/admin/franchisees', 'operacao'],
];

// Rotas COMPARTILHADAS entre módulos (a intenção vem do cartão clicado, então
// mantêm o módulo persistido): /admin/stock (PDV ou Estoque), /admin/orders
// (PDV ou Pedidos), /admin/marketing e /admin/analytics (PDV, CRM, etc.),
// /admin/universidade (PDV/CRM ou Universidade).

function matchExclusive(pathname: string): ModuleId | null {
  for (const [prefix, mod] of EXCLUSIVE_PREFIX) {
    if (pathname.startsWith(prefix)) return mod;
  }
  return null;
}

export function getActiveModule(pathname: string): ModuleId {
  // Rota exclusiva de um módulo sempre ganha.
  const exclusive = matchExclusive(pathname);
  if (exclusive) return exclusive;

  // Rota compartilhada/desconhecida: usa o módulo persistido (cartão clicado).
  try {
    const saved = localStorage.getItem(STORAGE_ACTIVE_MODULE) as ModuleId | null;
    if (saved && saved in MODULE_MENUS) return saved;
  } catch {}
  return DEFAULT_MODULE;
}

export function setActiveModule(moduleId: ModuleId) {
  try { localStorage.setItem(STORAGE_ACTIVE_MODULE, moduleId); } catch {}
}
