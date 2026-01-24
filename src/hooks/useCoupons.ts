import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useStore } from '@/contexts/StoreContext';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  store_id: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  valid_from: string;
  valid_until: string;
  active: boolean;
  created_at: string;
}

export function useCoupons() {
  const { currentStore } = useStore();
  
  return useQuery({
    queryKey: ['coupons', currentStore?.id],
    queryFn: async () => {
      let query = supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentStore?.id) {
        query = query.eq('store_id', currentStore.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!currentStore?.id,
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  const { currentStore } = useStore();

  return useMutation({
    mutationFn: async (coupon: Omit<Coupon, 'id' | 'usage_count' | 'created_at' | 'store_id'>) => {
      const { data, error } = await supabase
        .from('coupons')
        .insert({ ...coupon, store_id: currentStore?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast({
        title: 'Cupom criado',
        description: 'Cupom criado com sucesso.',
      });
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...coupon }: Partial<Coupon> & { id: string }) => {
      const { data, error } = await supabase
        .from('coupons')
        .update(coupon)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast({
        title: 'Cupom atualizado',
        description: 'Cupom atualizado com sucesso.',
      });
    },
  });
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast({
        title: 'Cupom excluído',
        description: 'Cupom excluído com sucesso.',
      });
    },
  });
}
