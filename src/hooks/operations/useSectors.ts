/**
 * Setores da unidade (Operações 2.0 — M1). CRUD simples sobre `sectors`,
 * escopado pela loja atual (`currentStore`).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';

export interface Sector {
  id: string;
  store_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export function useSectors(includeInactive = false) {
  const { currentStore } = useStore();
  return useQuery({
    queryKey: ['op_sectors', currentStore?.id, includeInactive],
    enabled: !!currentStore?.id,
    queryFn: async (): Promise<Sector[]> => {
      let q = (supabase as any)
        .from('sectors')
        .select('*')
        .eq('store_id', currentStore!.id)
        .order('name');
      if (!includeInactive) q = q.eq('is_active', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Sector[];
    },
  });
}

export function useSectorMutations() {
  const { currentStore } = useStore();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['op_sectors'] });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await (supabase as any)
        .from('sectors')
        .insert({ store_id: currentStore?.id, name: name.trim() });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Setor criado.'); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao criar setor.'),
  });

  const update = useMutation({
    mutationFn: async (s: Pick<Sector, 'id'> & Partial<Sector>) => {
      const { id, ...fields } = s;
      const { error } = await (supabase as any).from('sectors').update(fields).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Setor atualizado.'); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao atualizar.'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('sectors').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Setor removido.'); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao remover.'),
  });

  return { create, update, remove };
}
