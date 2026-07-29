/**
 * Rotinas de checklist (Operações 2.0 — M1): a recorrência que gera as tarefas.
 * CRUD sobre `inventory_checklist_routines` + dropdowns de apoio (checklists e
 * responsáveis).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';

export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'once';

export interface Routine {
  id: string;
  store_id: string;
  checklist_id: string;
  sector_id: string | null;
  shift_id: string | null;
  responsible_user_id: string | null;
  collaborator_id: string | null;
  recurrence_type: RecurrenceType;
  weekdays: number[];
  specific_date: string | null;      // 'once' → data única (YYYY-MM-DD)
  day_of_month: number | null;       // 'monthly' → dia do mês (1..31)
  last_day_of_month: boolean;        // 'monthly' → último dia do mês
  scheduled_time: string;
  sla_grace_minutes: number;
  critical: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // joins
  checklist?: { name: string } | null;
  sector?: { name: string } | null;
  shift?: { name: string } | null;
  collaborator?: { name: string } | null;
}

export type NewRoutine = Omit<
  Routine,
  'id' | 'store_id' | 'created_at' | 'updated_at' | 'checklist' | 'sector' | 'shift' | 'collaborator'
>;

export function useRoutines() {
  const { currentStore } = useStore();
  return useQuery({
    queryKey: ['op_routines', currentStore?.id],
    enabled: !!currentStore?.id,
    queryFn: async (): Promise<Routine[]> => {
      const { data, error } = await (supabase as any)
        .from('inventory_checklist_routines')
        .select('*, checklist:inventory_checklists(name), sector:sectors(name), shift:shifts(name), collaborator:checkgrau_collaborators(name)')
        .eq('store_id', currentStore!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Routine[];
    },
  });
}

/** Checklists ativos da unidade — origem do template da rotina. */
export function useChecklistsForRoutine() {
  const { currentStore } = useStore();
  return useQuery({
    queryKey: ['op_checklists_active', currentStore?.id],
    enabled: !!currentStore?.id,
    queryFn: async (): Promise<{ id: string; name: string }[]> => {
      const { data, error } = await (supabase as any)
        .from('inventory_checklists')
        .select('id, name')
        .eq('store_id', currentStore!.id)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });
}

/** Usuários candidatos a responsável (nome de exibição). */
export function useResponsibles() {
  return useQuery({
    queryKey: ['op_responsibles'],
    queryFn: async (): Promise<{ id: string; nome: string }[]> => {
      const { data, error } = await (supabase as any)
        .from('user_profiles')
        .select('id, nome')
        .order('nome');
      if (error) throw error;
      return (data ?? []).filter((u: any) => u.nome) as { id: string; nome: string }[];
    },
  });
}

export function useRoutineMutations() {
  const { currentStore } = useStore();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['op_routines'] });

  const create = useMutation({
    mutationFn: async (r: NewRoutine) => {
      const { error } = await (supabase as any)
        .from('inventory_checklist_routines')
        .insert({ ...r, store_id: currentStore?.id });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Rotina criada.'); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao criar rotina.'),
  });

  const update = useMutation({
    mutationFn: async (r: Pick<Routine, 'id'> & Partial<NewRoutine>) => {
      const { id, ...fields } = r;
      const { error } = await (supabase as any)
        .from('inventory_checklist_routines')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Rotina atualizada.'); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao atualizar.'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('inventory_checklist_routines')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Rotina removida.'); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao remover.'),
  });

  return { create, update, remove };
}
