/**
 * CheckGrau — gestão de lojas (Bloco A). Reusa a tabela `stores`, editando os
 * campos operacionais (nome, código, endereço, cidade, estado, telefone, status).
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CgStore {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  status: string | null;
}

export type NewStore = Omit<CgStore, 'id'>;

const QK = ['checkgrau_stores'];

export function useCheckgrauStores() {
  return useQuery({
    queryKey: QK,
    queryFn: async (): Promise<CgStore[]> => {
      const { data, error } = await (supabase as any)
        .from('stores')
        .select('id, name, code, address, city, state, phone, status')
        .order('name');
      if (error) throw error;
      return (data ?? []) as CgStore[];
    },
  });
}

export function useStoreMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: QK });

  const create = useMutation({
    mutationFn: async (s: Partial<NewStore>) => {
      const { error } = await (supabase as any).from('stores').insert({ status: 'ativo', ...s });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Loja criada.'); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao criar loja.'),
  });

  const update = useMutation({
    mutationFn: async (s: Pick<CgStore, 'id'> & Partial<NewStore>) => {
      const { id, ...fields } = s;
      const { error } = await (supabase as any).from('stores').update(fields).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Loja atualizada.'); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao atualizar loja.'),
  });

  return { create, update };
}
