import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Store {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  city: string | null;
  state: string | null;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  delivery_fee: number | null;
  min_order_value: number | null;
  delivery_radius_km: number | null;
  preparation_time: number | null;
  delivery_time: number | null;
  business_hours: any;
  franchisee_user_id: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Store[];
    },
  });
}

export function useStoreBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['store', slug],
    queryFn: async () => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      return data as Store;
    },
    enabled: !!slug,
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Store>;
    }) => {
      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Loja atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar loja: ' + error.message);
    },
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (store: Omit<Store, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('stores')
        .insert([store as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Loja criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar loja: ' + error.message);
    },
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stores')
        .update({ active: false, status: 'inactive' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Franqueado removido (inativado) com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover franqueado: ' + error.message);
    },
  });
}
