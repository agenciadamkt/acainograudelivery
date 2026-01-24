import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CustomerNote {
  id: string;
  customer_id: string;
  note: string;
  created_by: string | null;
  created_at: string;
}

export function useCustomerNotes(customerId?: string) {
  return useQuery({
    queryKey: ['customer-notes', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CustomerNote[];
    },
    enabled: !!customerId,
  });
}

export function useAddCustomerNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customer_id, note }: { customer_id: string; note: string }) => {
      const { data, error } = await supabase
        .from('customer_notes')
        .insert({ customer_id, note })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes'] });
      toast({
        title: 'Nota adicionada',
        description: 'Nota adicionada ao cliente com sucesso.',
      });
    },
  });
}

export function useDeleteCustomerNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes'] });
      toast({
        title: 'Nota excluída',
        description: 'Nota excluída com sucesso.',
      });
    },
  });
}
