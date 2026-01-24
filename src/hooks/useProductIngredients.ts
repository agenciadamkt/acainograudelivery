import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ProductIngredient {
  id: string;
  product_id: string;
  item_id: string;
  quantity: number;
  created_at: string;
  item?: {
    name: string;
    unit: string;
    current_stock: number;
  };
}

export function useProductIngredients(productId?: string) {
  return useQuery({
    queryKey: ['product-ingredients', productId],
    queryFn: async () => {
      let query = supabase
        .from('product_ingredients')
        .select('*, item:inventory_items(name, unit, current_stock)');

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ProductIngredient[];
    },
    enabled: !!productId,
  });
}

export function useCreateProductIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ingredient: Omit<ProductIngredient, 'id' | 'created_at' | 'item'>) => {
      const { data, error } = await supabase
        .from('product_ingredients')
        .insert(ingredient)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-ingredients'] });
      toast({
        title: 'Ingrediente adicionado',
        description: 'Ingrediente adicionado ao produto com sucesso.',
      });
    },
  });
}

export function useDeleteProductIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_ingredients')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-ingredients'] });
      toast({
        title: 'Ingrediente removido',
        description: 'Ingrediente removido do produto com sucesso.',
      });
    },
  });
}
