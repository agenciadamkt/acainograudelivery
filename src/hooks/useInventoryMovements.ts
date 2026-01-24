import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface InventoryMovement {
  id: string;
  item_id: string;
  movement_type: 'entrada' | 'saida' | 'ajuste' | 'perda';
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  reason: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_by: string | null;
  created_at: string;
  notes: string | null;
  item?: {
    name: string;
    unit: string;
  };
}

export function useInventoryMovements(itemId?: string) {
  return useQuery({
    queryKey: ['inventory-movements', itemId],
    queryFn: async () => {
      let query = supabase
        .from('inventory_movements')
        .select('*, item:inventory_items(name, unit)')
        .order('created_at', { ascending: false });

      if (itemId) {
        query = query.eq('item_id', itemId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InventoryMovement[];
    },
  });
}

export function useCreateInventoryMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movement: Omit<InventoryMovement, 'id' | 'created_at' | 'item'>) => {
      const { data, error } = await supabase
        .from('inventory_movements')
        .insert(movement)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      toast({
        title: 'Movimentação registrada',
        description: 'Movimentação de estoque registrada com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Erro ao registrar movimentação de estoque.',
        variant: 'destructive',
      });
    },
  });
}
