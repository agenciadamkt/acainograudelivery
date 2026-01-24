import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCustomerAddresses(customerId?: string) {
  return useQuery({
    queryKey: ['customer-addresses', customerId],
    queryFn: async () => {
      if (!customerId) return [];
      
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', customerId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (address: any) => {
      const { data, error } = await supabase
        .from('customer_addresses')
        .insert(address)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      toast.success('Endereço adicionado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar endereço: ' + error.message);
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...address }: any) => {
      const { data, error } = await supabase
        .from('customer_addresses')
        .update(address)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      toast.success('Endereço atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar endereço: ' + error.message);
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      toast.success('Endereço removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover endereço: ' + error.message);
    },
  });
}

export function useSetDefaultAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, addressId }: { customerId: string; addressId: string }) => {
      // Remover default de todos os endereços
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('customer_id', customerId);

      // Definir novo default
      const { error } = await supabase
        .from('customer_addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses'] });
      toast.success('Endereço padrão atualizado!');
    },
  });
}
