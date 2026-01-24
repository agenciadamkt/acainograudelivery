import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CustomerTag {
  id: string;
  customer_id: string;
  tag: string;
  created_at: string;
}

export function useCustomerTags(customerId?: string) {
  return useQuery({
    queryKey: ['customer-tags', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('customer_tags')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomerTag[];
    },
    enabled: !!customerId,
  });
}

export function useAddCustomerTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customer_id, tag }: { customer_id: string; tag: string }) => {
      const { data, error } = await supabase
        .from('customer_tags')
        .insert({ customer_id, tag })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tags'] });
      toast({
        title: 'Tag adicionada',
        description: 'Tag adicionada ao cliente com sucesso.',
      });
    },
  });
}

export function useRemoveCustomerTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-tags'] });
      toast({
        title: 'Tag removida',
        description: 'Tag removida do cliente com sucesso.',
      });
    },
  });
}
