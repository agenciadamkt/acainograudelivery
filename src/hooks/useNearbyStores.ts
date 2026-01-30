import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateDistance } from '@/utils/distance';
import type { Store } from './useStores';
import type { Coordinates } from './useGeolocation';

export interface StoreWithDistance extends Store {
  distance?: number;
  deliveryTime?: string;
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

      let stores: StoreWithDistance[] = data as unknown as StoreWithDistance[];

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

          // Estimar tempo de entrega: usar campo delivery_time ou calcular
          let deliveryTime: string;
          if (store.delivery_time) {
            deliveryTime = store.delivery_time;
          } else {
            const prepTime = store.preparation_time || 30;
            deliveryTime = `${prepTime + 20}-${prepTime + 40} min`;
          }

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
