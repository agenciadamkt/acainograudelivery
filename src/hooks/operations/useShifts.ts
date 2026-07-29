/**
 * Turnos da unidade (Operações 2.0 — M1). CRUD simples sobre `shifts`,
 * escopado pela loja atual.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';

export interface Shift {
  id: string;
  store_id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  created_at: string;
}

export interface NewShift {
  name: string;
  start_time?: string | null;
  end_time?: string | null;
}

export function useShifts(includeInactive = false) {
  const { currentStore } = useStore();
  return useQuery({
    queryKey: ['op_shifts', currentStore?.id, includeInactive],
    enabled: !!currentStore?.id,
    queryFn: async (): Promise<Shift[]> => {
      let q = (supabase as any)
        .from('shifts')
        .select('*')
        .eq('store_id', currentStore!.id)
        .order('start_time', { nullsFirst: true });
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Shift[];
    },
  });
}

export function useShiftMutations() {
  const { currentStore } = useStore();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['op_shifts'] });

  const create = useMutation({
    mutationFn: async (s: NewShift) => {
      const { error } = await (supabase as any).from('shifts').insert({
        store_id: currentStore?.id,
        name: s.name.trim(),
        start_time: s.start_time || null,
        end_time: s.end_time || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Turno criado.'); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao criar turno.'),
  });

  const update = useMutation({
    mutationFn: async (s: Pick<Shift, 'id'> & Partial<Shift>) => {
      const { id, ...fields } = s;
      const { error } = await (supabase as any).from('shifts').update(fields).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Turno atualizado.'); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao atualizar.'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('shifts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Turno removido.'); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao remover.'),
  });

  return { create, update, remove };
}
