import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface FinancialCategory {
  id: string;
  name: string;
  type: 'receita' | 'despesa';
  color: string | null;
  icon: string | null;
  active: boolean;
  created_at: string;
}

export function useFinancialCategories(type?: 'receita' | 'despesa') {
  return useQuery({
    queryKey: ['financial-categories', type],
    queryFn: async () => {
      let query = supabase
        .from('financial_categories')
        .select('*')
        .eq('active', true)
        .order('name');

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as FinancialCategory[];
    },
  });
}

export function useCreateFinancialCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (category: Omit<FinancialCategory, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('financial_categories')
        .insert(category)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-categories'] });
      toast({
        title: 'Categoria criada',
        description: 'Categoria financeira criada com sucesso.',
      });
    },
  });
}

export function useUpdateFinancialCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...category }: Partial<FinancialCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('financial_categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-categories'] });
      toast({
        title: 'Categoria atualizada',
        description: 'Categoria financeira atualizada com sucesso.',
      });
    },
  });
}
