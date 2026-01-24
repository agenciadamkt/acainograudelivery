import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface CustomerSegment {
  id: string;
  name: string;
  description: string | null;
  criteria: any;
  color: string | null;
  active: boolean;
  created_at: string;
}

export function useCustomerSegments() {
  return useQuery({
    queryKey: ['customer-segments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_segments')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data as CustomerSegment[];
    },
  });
}

export function useCreateCustomerSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (segment: Omit<CustomerSegment, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('customer_segments')
        .insert(segment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments'] });
      toast({
        title: 'Segmento criado',
        description: 'Segmento de clientes criado com sucesso.',
      });
    },
  });
}

export function useUpdateCustomerSegment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...segment }: Partial<CustomerSegment> & { id: string }) => {
      const { data, error } = await supabase
        .from('customer_segments')
        .update(segment)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-segments'] });
      toast({
        title: 'Segmento atualizado',
        description: 'Segmento de clientes atualizado com sucesso.',
      });
    },
  });
}
