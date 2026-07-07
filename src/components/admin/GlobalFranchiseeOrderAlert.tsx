import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';
import { useRealtimeFranchiseeOrders } from '@/hooks/useRealtimeFranchiseeOrders';
import { NewFranchiseeOrderAlert } from '@/components/admin/orders/NewFranchiseeOrderAlert';

// Montado UMA VEZ na raiz do App (App.tsx, acima de <Routes>) — funciona em
// QUALQUER rota, mesmo as que não usam AdminLayout (ex: /admin/hub renderiza
// <GrauOSHub /> direto).
//
// hasRole('staff') não basta pra excluir franqueados: a criação de conta de
// franqueado atribui role 'admin' em user_roles (só pra liberar acesso ao
// catálogo /admin/orders/catalog), então todo franqueado também passa esse
// check. O sinal que de fato distingue é user_profiles.perfil (RBAC novo:
// MASTER / FRANQUEADO / COLABORADOR) — só MASTER/COLABORADOR (ou ausência de
// perfil, contas legadas) recebem o alerta; FRANQUEADO nunca.
export function GlobalFranchiseeOrderAlert() {
  const { user, hasRole } = useAuth();
  const { profile } = usePermissions();
  const isStaff = !!user && hasRole('staff') && profile?.perfil !== 'FRANQUEADO';

  const { newOrderAlert, clearNewOrderAlert } = useRealtimeFranchiseeOrders(isStaff);

  if (!isStaff) return null;

  return <NewFranchiseeOrderAlert order={newOrderAlert} onAcknowledge={clearNewOrderAlert} />;
}
