import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface FinancialGoal {
  id: string;
  name: string;
  target_amount: number;
  period: 'diario' | 'semanal' | 'mensal' | 'anual';
  start_date: string;
  end_date: string;
  active: boolean;
  created_at: string;
}

export function useFinancialGoals() {
  return useQuery({
    queryKey: ['financial-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FinancialGoal[];
    },
  });
}

export function useCreateFinancialGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Omit<FinancialGoal, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('financial_goals')
        .insert(goal)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-goals'] });
      toast({
        title: 'Meta criada',
        description: 'Meta financeira criada com sucesso.',
      });
    },
  });
}

export function useUpdateFinancialGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...goal }: Partial<FinancialGoal> & { id: string }) => {
      const { data, error } = await supabase
        .from('financial_goals')
        .update(goal)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-goals'] });
      toast({
        title: 'Meta atualizada',
        description: 'Meta financeira atualizada com sucesso.',
      });
    },
  });
}

export function useDeleteFinancialGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-goals'] });
      toast({
        title: 'Meta excluída',
        description: 'Meta financeira excluída com sucesso.',
      });
    },
  });
}
