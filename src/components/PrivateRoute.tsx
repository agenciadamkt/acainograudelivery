import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';

interface PrivateRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'manager' | 'staff' | 'franchisee_master';
  requiredPermission?: string; // código RBAC ex: 'sis.usuarios'
  requiredNivel?: number;      // nível mínimo (padrão: 1)
  // Quando true E role+permission forem informados, libera se QUALQUER um passar
  // (role OU permissão RBAC). Padrão false = exige ambos (comportamento legado).
  requireAny?: boolean;
}

// ── Mapa rota → códigos RBAC ────────────────────────────────────────────────
// A rota fica acessível se o usuário tiver permissão (nível ≥1) em ALGUM código.
// Ordenado do mais específico para o mais genérico (vence o primeiro que casar).
// Rotas com requiredPermission explícito (ex: usuários) NÃO entram aqui — os
// props da rota é que valem. Rotas ausentes caem no check de role (legado).
const ROUTE_RBAC: [string, string[]][] = [
  // PDV
  ['/admin/pdv/nova-venda',       ['pdv.nova-venda']],
  ['/admin/pdv/mesas',            ['pdv.mesas']],
  ['/admin/pdv/caixa',            ['pdv.caixa']],
  ['/admin/pdv/relatorios',       ['pdv.historico']],
  ['/admin/pdv/configuracoes',    ['sis.config-pdv']],
  // Fiscal
  ['/admin/fiscal',               ['fin.fiscal']],
  // Operação
  ['/admin/dashboard',            ['op.dashboard']],
  ['/admin/kds',                  ['op.kds']],
  ['/admin/orders/catalog',       ['fra.pedidos']],
  ['/admin/orders/history',       ['fra.meus-pedidos']],
  ['/admin/orders/management',    ['mas.cargas']],
  ['/admin/orders/reports',       ['mas.relatorios']],
  ['/admin/orders/products',      ['mas.catalogo']],
  ['/admin/orders/checkout',      ['fra.pedidos']],
  ['/admin/orders',               ['op.pedidos']],
  ['/admin/delivery/areas',       ['op.areas-entrega']],
  ['/admin/delivery',             ['op.entregas']],
  ['/admin/frota',                ['op.frota']],
  ['/admin/franchisees',          ['mas.franqueados']],
  // Cardápio
  ['/admin/menu/categories',      ['cardapio.cats']],
  ['/admin/menu/products',        ['cardapio.produtos']],
  ['/admin/menu/toppings',        ['cardapio.toppings']],
  ['/admin/menu/ingredients',     ['cardapio.ingreds']],
  ['/admin/promotions',           ['cardapio.promo']],
  // Obs.: /admin/financeiro e /admin/financial NÃO entram no RBAC central —
  // são acessados por funcionários financeiros (financial_users) fora do RBAC
  // de staff; mantêm o guard de role próprio para não trancá-los.
  // Estoque
  ['/admin/stock/movements',      ['est.movimentos']],
  ['/admin/stock/cmv',            ['est.cmv']],
  ['/admin/stock/purchase-history', ['est.hist-compras']],
  ['/admin/stock/purchases',      ['est.compras']],
  ['/admin/stock/count',          ['est.contagem']],
  ['/admin/stock/checklists',     ['est.rotinas']],
  ['/admin/stock/bonificacoes',   ['est.bonificacoes']],
  ['/admin/stock',                ['est.central']],
  // Clientes & Marketing
  ['/admin/crm',                  ['cli.crm']],
  ['/admin/customers',            ['cli.crm']],
  ['/admin/feedback',             ['cli.nps']],
  ['/admin/marketing',            ['mkt.campanhas']],
  ['/admin/analytics',            ['mkt.analytics']],
  ['/admin/comunidade',           ['cli.comunidade']],
  // CAF
  ['/admin/caf/relatorios',       ['caf.relatorios']],
  ['/admin/caf/cadastros',        ['caf.cadastros']],
  ['/admin/caf',                  ['caf.dashboard', 'caf.atendimentos', 'caf.base-conhecimento']],
  // Outros módulos do Hub
  ['/admin/agenda',               ['op.agenda']],
  ['/admin/performance',          ['op.performance']],
  ['/admin/assistente',           ['sis.assistente']],
  ['/admin/grauzinho',            ['sis.grauzinho']],
  ['/admin/universidade',         ['sis.universidade']],
  ['/admin/loja/dados',           ['sis.config-geral']],
];

function routeCodesFor(pathname: string): string[] | null {
  for (const [prefix, codes] of ROUTE_RBAC) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return codes;
  }
  return null;
}

export function PrivateRoute({ children, requiredRole, requiredPermission, requiredNivel = 1, requireAny = false }: PrivateRouteProps) {
  const { user, isLoading, hasRole } = useAuth();
  const { can, isLoading: permLoading } = usePermissions();
  const location = useLocation();

  if (isLoading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Super-admin: e-mail master ou papel franchisee_master → acesso total.
  const isMaster = user.email === 'agenciadamkt@gmail.com' || hasRole('franchisee_master');
  if (isMaster) return <>{children}</>;

  // 1. Rota com permissão explícita (ex: usuários) — props mandam.
  if (requiredPermission) {
    const roleOk = !requiredRole || hasRole(requiredRole);
    const permOk = can(requiredPermission, requiredNivel);
    const allowed = (requireAny && requiredRole) ? (roleOk || permOk) : (roleOk && permOk);
    if (!allowed) return <Navigate to="/admin/unauthorized" replace />;
    return <>{children}</>;
  }

  // 2. Rota mapeada no RBAC central — exige permissão em algum código do módulo.
  const codes = routeCodesFor(location.pathname);
  if (codes) {
    if (!codes.some((c) => can(c, 1))) return <Navigate to="/admin/unauthorized" replace />;
    return <>{children}</>;
  }

  // 3. Legado: rotas não mapeadas seguem só pelo role.
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return <>{children}</>;
}
