import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useStore } from '@/contexts/StoreContext';

export interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  unit: string;
  store_id: string | null;
  current_stock: number;
  min_stock: number;
  max_stock: number | null;
  unit_cost: number;
  supplier: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useInventoryItems() {
  const { currentStore } = useStore();
  
  return useQuery({
    queryKey: ['inventory-items', currentStore?.id],
    queryFn: async () => {
      let query = supabase
        .from('inventory_items')
        .select('*')
        .order('name');

      if (currentStore?.id) {
        query = query.eq('store_id', currentStore.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!currentStore?.id,
  });
}

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();
  const { currentStore } = useStore();

  return useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'store_id'>) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert({ ...item, store_id: currentStore?.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'Item criado',
        description: 'Item de estoque criado com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao criar item de estoque.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...item }: Partial<InventoryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(item)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'Item atualizado',
        description: 'Item de estoque atualizado com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar item de estoque.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'Item excluído',
        description: 'Item de estoque excluído com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir item de estoque.',
        variant: 'destructive',
      });
    },
  });
}
