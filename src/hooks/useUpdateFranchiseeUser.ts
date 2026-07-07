import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateFranchiseeUserData {
  userId: string;
  email?: string;
  password?: string;
  fullName?: string;
  phone?: string;
}

export function useUpdateFranchiseeUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateFranchiseeUserData) => {
      const { data: result, error } = await supabase.functions.invoke('update-franchisee-user', {
        body: data,
      });

      if (error) {
        throw error;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Credenciais do franqueado atualizadas com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro ao atualizar credenciais:', error);
      toast.error('Erro ao atualizar credenciais: ' + error.message);
    },
  });
}
