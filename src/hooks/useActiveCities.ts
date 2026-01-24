import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para buscar cidades únicas de lojas ativas em um estado específico
 */
export function useActiveCities(state: string | null) {
  const query = useQuery({
    queryKey: ['active-cities', state],
    queryFn: async () => {
      if (!state) return [];

      const { data, error } = await supabase
        .from('stores')
        .select('city')
        .eq('status', 'active')
        .eq('active', true)
        .eq('state', state)
        .not('city', 'is', null)
        .order('city');

      if (error) throw error;

      // Extrair cidades únicas
      const uniqueCities = [...new Set(data.map((store) => store.city as string))];
      
      console.log(`[useActiveCities] Estado: ${state}, Cidades encontradas:`, uniqueCities);
      
      return uniqueCities.sort();
    },
    enabled: !!state,
  });

  return {
    ...query,
    refetch: query.refetch,
  };
}
