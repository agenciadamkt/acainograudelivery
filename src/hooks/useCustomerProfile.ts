import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CustomerProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  birth_date?: string;
  gender?: string;
  total_orders: number;
  total_spent: number;
  loyalty_points: number;
  loyalty_tier?: string;
}

export function useCustomerProfile(userId?: string) {
  return useQuery({
    queryKey: ['customer-profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data as CustomerProfile;
    },
    enabled: !!userId,
  });
}

export function useUpdateCustomerProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      customerId, 
      data 
    }: { 
      customerId: string; 
      data: Partial<CustomerProfile> 
    }) => {
      const { error } = await supabase
        .from('customers')
        .update(data)
        .eq('id', customerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-profile'] });
      toast.success('Perfil atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar perfil');
    },
  });
}