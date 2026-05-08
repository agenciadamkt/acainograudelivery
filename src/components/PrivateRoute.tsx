import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';

interface PrivateRouteProps {
  children: ReactNode;
  requiredRole?: 'admin' | 'manager' | 'staff' | 'franchisee_master';
  requiredPermission?: string; // código RBAC ex: 'sis.usuarios'
  requiredNivel?: number;      // nível mínimo (padrão: 1)
}

export function PrivateRoute({ children, requiredRole, requiredPermission, requiredNivel = 1 }: PrivateRouteProps) {
  const { user, isLoading, hasRole } = useAuth();
  const { can, isLoading: permLoading } = usePermissions();

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

  // Verifica role (sistema legado)
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  // Verifica permissão RBAC granular (nova camada)
  if (requiredPermission && !can(requiredPermission, requiredNivel)) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return <>{children}</>;
}
