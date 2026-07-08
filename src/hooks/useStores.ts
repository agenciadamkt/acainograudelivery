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
  zipcode: string | null;
  phone: string | null;
  logo_url: string | null;
  banner_url: string | null;
  delivery_fee: number | null;
  min_order_value: number | null;
  delivery_radius_km: number | null;
  preparation_time: number | null;
  delivery_time: number | null;
  mercadopago_public_key: string | null;
  // mercadopago_access_token é segredo: existe na coluna do banco mas NUNCA é
  // lido pelo cliente (só a Edge Function acessa via service_role). Não declarar
  // aqui evita que um select('*') ou Partial<Store> volte a expô-lo (SEC-014).
  accepts_cash?: boolean;
  accepts_card?: boolean;
  accepts_pix?: boolean;
  requires_change?: boolean;
  business_hours: any;
  distribution_center_id: string | null;
  franchisee_user_id: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Perfil do franqueado (opcional, pode ser carregado separadamente)
  franchisee_profile?: {
    email: string;
    full_name: string | null;
  } | null;
}

export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        // mercadopago_access_token excluído intencionalmente — chave secreta, processada só na Edge Function
        .select('id, name, slug, status, city, state, address, zipcode, phone, logo_url, banner_url, delivery_fee, min_order_value, delivery_radius_km, preparation_time, delivery_time, mercadopago_public_key, accepts_cash, accepts_card, accepts_pix, requires_change, business_hours, distribution_center_id, franchisee_user_id, created_by, approved_by, approved_at, active, created_at, updated_at, distribution_center:distribution_centers(id, name)')
        .order('name');

      if (error) throw error;
      return data as unknown as Store[];
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
        .select('id, name, slug, status, city, state, address, zipcode, phone, logo_url, banner_url, delivery_fee, min_order_value, delivery_radius_km, preparation_time, delivery_time, mercadopago_public_key, accepts_cash, accepts_card, accepts_pix, requires_change, business_hours, active, created_at, updated_at, franchisee_user_id, distribution_center_id, created_by, approved_by, approved_at, latitude, longitude')
        .eq('slug', slug)
        .eq('status', 'active')
        .single();

      if (error) throw error;
      return data as unknown as Store;
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
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as Store;
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
