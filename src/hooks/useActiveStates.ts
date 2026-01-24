import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook para buscar estados únicos de lojas ativas
 */
export function useActiveStates() {
  return useQuery({
    queryKey: ['active-states'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('state')
        .eq('status', 'active')
        .eq('active', true)
        .not('state', 'is', null)
        .order('state');

      if (error) throw error;

      // Extrair estados únicos
      const uniqueStates = [...new Set(data.map((store) => store.state as string))];
      
      return uniqueStates.sort();
    },
  });
}
