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

// Campos que o próprio cliente pode editar. Campos calculados/de fidelidade
// (loyalty_points, total_spent, total_orders, loyalty_tier) NUNCA entram aqui —
// só o staff/servidor pode alterá-los (SEC-009).
export type CustomerProfileUpdate = Pick<CustomerProfile, 'name' | 'phone' | 'birth_date' | 'gender'>;

const EDITABLE_PROFILE_FIELDS: (keyof CustomerProfileUpdate)[] = ['name', 'phone', 'birth_date', 'gender'];

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
      data: CustomerProfileUpdate
    }) => {
      // Whitelist em runtime: só os campos editáveis vão para o update,
      // ignorando qualquer campo privilegiado que tenha escapado pelo tipo.
      const safeData: Partial<CustomerProfileUpdate> = {};
      for (const key of EDITABLE_PROFILE_FIELDS) {
        if (data[key] !== undefined) {
          (safeData as any)[key] = data[key];
        }
      }

      const { error } = await supabase
        .from('customers')
        .update(safeData)
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