import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ProductSize {
  id: string;
  product_id: string;
  name: string;
  ml_size: number | null;
  price: number;
  active: boolean;
  display_order: number;
  created_at: string;
}

export function useProductSizes(productId: string) {
  return useQuery({
    queryKey: ['product-sizes', productId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('product_sizes')
          .select('*')
          .eq('product_id', productId)
          .order('display_order', { ascending: true });

        if (error) {
          console.error("Error fetching product sizes:", error);
          return [];
        }
        return data as ProductSize[];
      } catch (err) {
        console.error("Unexpected error in useProductSizes:", err);
        return [];
      }
    },
    enabled: !!productId,
  });
}

export function useCreateProductSize() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (size: Omit<ProductSize, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('product_sizes')
        .insert(size)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-sizes', variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProductSize() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, product_id, ...updates }: Partial<ProductSize> & { id: string; product_id: string }) => {
      const { error } = await supabase
        .from('product_sizes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return { id, product_id, ...updates };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-sizes', variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProductSize() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, product_id }: { id: string; product_id: string }) => {
      const { error } = await supabase
        .from('product_sizes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-sizes', variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Tamanho excluído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir tamanho',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
}
