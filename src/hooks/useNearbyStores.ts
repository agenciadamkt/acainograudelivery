import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateDistance } from '@/utils/distance';
import type { Store } from './useStores';
import type { Coordinates } from './useGeolocation';

export interface StoreWithDistance extends Store {
  distance?: number;
  deliveryTime?: number;
}

interface UseNearbyStoresParams {
  city: string;
  state: string;
  coordinates?: Coordinates | null;
}

/**
 * Hook para buscar lojas próximas baseado em cidade/estado e coordenadas
 */
export function useNearbyStores({ city, state, coordinates }: UseNearbyStoresParams) {
  return useQuery({
    queryKey: ['nearby-stores', city, state, coordinates],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('status', 'active')
        .eq('active', true)
        .eq('city', city)
        .eq('state', state);

      if (error) throw error;

      let stores: StoreWithDistance[] = data as StoreWithDistance[];

      // Se tiver coordenadas do usuário, calcular distância
      if (coordinates) {
        stores = stores.map((store) => {
          // Assumindo que as lojas tenham latitude/longitude armazenadas
          // Se não tiverem, precisará adicionar essas colunas ao banco
          const storeCoords = {
            // Temporariamente usando coordenadas fixas de Teresina como fallback
            // TODO: Adicionar colunas latitude/longitude na tabela stores
            latitude: -5.0892,
            longitude: -42.8019,
          };

          const distance = calculateDistance(
            coordinates.latitude,
            coordinates.longitude,
            storeCoords.latitude,
            storeCoords.longitude
          );

          // Estimar tempo de entrega: preparation_time + delivery_time (em minutos)
          const deliveryTime = (store.preparation_time || 30) + (store.delivery_time || 40);

          return {
            ...store,
            distance,
            deliveryTime,
          };
        });

        // Ordenar por distância (mais próxima primeiro)
        stores.sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      return stores;
    },
    enabled: !!city && !!state,
  });
}
