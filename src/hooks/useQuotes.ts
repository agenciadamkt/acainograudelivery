import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Quote {
  id: string;
  text: string;
  author_name: string;
  author_color: string;
  category_name: string;
  source: string;
}

export function useRandomQuote(categoryId?: number) {
  return useQuery({
    queryKey: ['random_quote', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_random_quote', { 
          p_category_id: categoryId || null 
        });

      if (error) {
        console.error('Error fetching random quote:', error);
        throw error;
      }
      
      return data && data.length > 0 ? (data[0] as Quote) : null;
    },
    // Refetch daily or manually
    staleTime: 1000 * 60 * 60 * 24,
  });
}

export function useFavoriteQuote() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('quote_favorites')
        .insert({
          quote_id: quoteId,
          franchisee_id: user.id
        })
        .select()
        .single();
        
      if (error) {
        // Se já favoritou (violation of unique constraint), silenciosamente retorna
        if (error.code === '23505') return null;
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Citação salva nos favoritos!');
      queryClient.invalidateQueries({ queryKey: ['favorite_quotes'] });
    },
    onError: (err: any) => {
      if(err?.code !== '23505') {
        toast.error('Erro ao salvar citação');
      }
    }
  });
}
