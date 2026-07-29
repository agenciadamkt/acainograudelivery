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

      // Extrair estados únicos, descartando vazios/espaços. O filtro do banco
      // só remove NULL — uma loja com state = '' (string vazia) passaria e
      // viraria um <SelectItem value=""> no seletor de estado, o que o Radix
      // proíbe e derruba a landing pública inteira. Por isso filtramos aqui.
      const uniqueStates = [
        ...new Set(
          (data ?? [])
            .map((store) => (store.state ?? '').trim())
            .filter((state) => state.length > 0),
        ),
      ];

      return uniqueStates.sort();
    },
  });
}
