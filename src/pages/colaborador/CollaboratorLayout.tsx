/**
 * CheckGrau App — shell mobile do colaborador (Bloco B). Guarda a sessão:
 * sem login → /colaborador/login; sem loja escolhida (e >1) → seleção.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCollaborator, CollaboratorProvider } from '@/contexts/CollaboratorContext';
import { OfflineLayer } from './_components/OfflineLayer';
import { MessageAlert } from './_components/MessageAlert';

/** Raiz do app do colaborador: provê a sessão para toda a subárvore /colaborador. */
export function CollaboratorRoot() {
  return (
    <CollaboratorProvider>
      <OfflineLayer />
      <MessageAlert />
      <Outlet />
    </CollaboratorProvider>
  );
}

export default function CollaboratorLayout() {
  const { loading, collaborator, stores, selectedStore } = useCollaborator();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-[#0F0F14]">
        <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!collaborator) return <Navigate to="/colaborador/login" replace />;

  // precisa escolher a loja (mais de uma) e ainda não escolheu
  const needsStore = stores.length > 1 && !selectedStore;
  if (needsStore && location.pathname !== '/colaborador/selecionar-loja') {
    return <Navigate to="/colaborador/selecionar-loja" replace />;
  }

  return <Outlet />;
}
