import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useStore } from '@/contexts/StoreContext';

export interface ToppingCategory {
  id: string;
  name: string;
  store_id: string | null;
  max_selections: number | null;
  display_order: number;
  created_at: string;
}

export function useToppingCategories() {
  const { currentStore } = useStore();
  
  return useQuery({
    queryKey: ['topping-categories', currentStore?.id],
    queryFn: async () => {
      let query = supabase
        .from('topping_categories')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (currentStore?.id) {
        query = query.eq('store_id', currentStore.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ToppingCategory[];
    },
    enabled: !!currentStore?.id,
  });
}

export function useCreateToppingCategory() {
  const queryClient = useQueryClient();
  const { currentStore } = useStore();
  
  return useMutation({
    mutationFn: async (category: Omit<ToppingCategory, 'id' | 'created_at' | 'store_id'>) => {
      const { data, error } = await supabase
        .from('topping_categories')
        .insert({ ...category, store_id: currentStore?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topping-categories'] });
      toast({ title: 'Categoria de topping criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao criar categoria',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

export function useUpdateToppingCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ToppingCategory> & { id: string }) => {
      const { data, error } = await supabase
        .from('topping_categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topping-categories'] });
      toast({ title: 'Categoria de topping atualizada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao atualizar categoria',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}

export function useDeleteToppingCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('topping_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topping-categories'] });
      toast({ title: 'Categoria de topping excluída com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Erro ao excluir categoria',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}
