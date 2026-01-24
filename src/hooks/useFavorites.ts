import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useFavorites(customerId?: string) {
  return useQuery({
    queryKey: ['favorites', customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from('customer_favorites')
        .select(`
          *,
          product:products(
            *,
            category:categories(name),
            sizes:product_sizes(*)
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!customerId,
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customerId, productId }: { customerId: string; productId: string }) => {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('customer_favorites')
        .select('id')
        .eq('customer_id', customerId)
        .eq('product_id', productId)
        .maybeSingle();

      if (existing) {
        // Remover
        const { error } = await supabase
          .from('customer_favorites')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        return { action: 'removed' };
      } else {
        // Adicionar
        const { error } = await supabase
          .from('customer_favorites')
          .insert({ customer_id: customerId, product_id: productId });

        if (error) throw error;
        return { action: 'added' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast({
        title: result.action === 'added' ? 'Adicionado aos favoritos!' : 'Removido dos favoritos',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar favoritos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useIsFavorite(customerId?: string, productId?: string) {
  return useQuery({
    queryKey: ['is-favorite', customerId, productId],
    queryFn: async () => {
      if (!customerId || !productId) return false;

      const { data } = await supabase
        .from('customer_favorites')
        .select('id')
        .eq('customer_id', customerId)
        .eq('product_id', productId)
        .maybeSingle();

      return !!data;
    },
    enabled: !!customerId && !!productId,
  });
}
