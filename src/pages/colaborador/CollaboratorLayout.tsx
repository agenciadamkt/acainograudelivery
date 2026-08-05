import { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCollaborator, CollaboratorProvider } from '@/contexts/CollaboratorContext';
import { OfflineLayer } from './_components/OfflineLayer';
import { MessageAlert } from './_components/MessageAlert';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

/** Dialog para Retomada Inteligente de checklists em andamento */
function AndamentoDialog() {
  const { collaborator, selectedStore } = useCollaborator();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const path = location.pathname;
  const isExecuting = path.includes('/executar') || path.includes('/concluido') || path.includes('/tarefa/');
  const enabled = !!collaborator?.id && !!selectedStore?.id && !isExecuting && !dismissed;

  const { data: activeExec } = useQuery({
    queryKey: ['cg_active_execution', selectedStore?.id, collaborator?.id],
    enabled,
    queryFn: async () => {
      const { data: schedule } = await (supabase as any)
        .from('inventory_checklist_schedules')
        .select(`
          id, checklist_id, store_id,
          checklist:inventory_checklists(name),
          execution:inventory_checklist_executions(id)
        `)
        .eq('store_id', selectedStore!.id)
        .eq('status', 'IN_PROGRESS')
        .eq('collaborator_id', collaborator!.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!schedule || schedule.length === 0) return null;
      const sched = schedule[0];

      const { count: totalItems } = await (supabase as any)
        .from('inventory_checklist_items')
        .select('*', { count: 'exact', head: true })
        .eq('checklist_id', sched.checklist_id);

      let answeredItems = 0;
      const execArr = sched.execution;
      const executionId = Array.isArray(execArr) ? execArr[0]?.id : execArr?.id;
      if (executionId) {
        const { count } = await (supabase as any)
          .from('inventory_checklist_execution_items')
          .select('*', { count: 'exact', head: true })
          .eq('execution_id', executionId);
        answeredItems = count ?? 0;
      }

      return {
        scheduleId: sched.id,
        checklistName: sched.checklist?.name ?? 'Checklist',
        storeName: selectedStore!.name,
        answered: answeredItems,
        total: totalItems ?? 0,
      };
    },
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (activeExec) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [activeExec]);

  if (!open || !activeExec) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#16161D]">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Você possui um checklist em andamento
        </h3>
        <div className="mt-4 space-y-2 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-white/5 dark:text-white/70">
          <p>
            <span className="font-semibold text-gray-400">Checklist:</span>{' '}
            <span className="text-gray-900 dark:text-white">{activeExec.checklistName}</span>
          </p>
          <p>
            <span className="font-semibold text-gray-400">Loja:</span>{' '}
            <span className="text-gray-900 dark:text-white">{activeExec.storeName}</span>
          </p>
          <p>
            <span className="font-semibold text-gray-400">Progresso:</span>{' '}
            <span className="text-gray-900 dark:text-white">
              {activeExec.answered} de {activeExec.total} perguntas
            </span>
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              setOpen(false);
              setDismissed(true);
            }}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-50 dark:border-white/10 dark:text-white/70"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              setOpen(false);
              navigate(`/colaborador/tarefa/${activeExec.scheduleId}/executar`);
            }}
            className="flex-1 rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white hover:bg-[#6D28D9]"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Raiz do app do colaborador: provê a sessão para toda a subárvore /colaborador. */
export function CollaboratorRoot() {
  return (
    <CollaboratorProvider>
      <OfflineLayer />
      <MessageAlert />
      <AndamentoDialog />
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

  const needsStore = stores.length > 1 && !selectedStore;
  if (needsStore && location.pathname !== '/colaborador/selecionar-loja') {
    return <Navigate to="/colaborador/selecionar-loja" replace />;
  }

  return <Outlet />;
}
