import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateDistance } from '@/utils/distance';
import { isStoreOpen } from '@/utils/businessHours';
import type { Store } from './useStores';
import type { Coordinates } from './useGeolocation';

export interface StoreWithInfo extends Store {
  distance?: number;
  isOpen: boolean;
  estimatedTime?: number;
}

/**
 * Hook para buscar todas as lojas de uma cidade com informações adicionais
 */
export function useStoresByCity(city: string | null, coordinates?: Coordinates | null) {
  return useQuery({
    queryKey: ['stores-by-city', city, coordinates],
    queryFn: async () => {
      if (!city) return [];

      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('status', 'active')
        .eq('active', true)
        .eq('city', city)
        .order('name');

      if (error) throw error;

      const stores: StoreWithInfo[] = data.map((store) => {
        const storeIsOpen = isStoreOpen(store.business_hours as any);
        
        let distance: number | undefined;
        let estimatedTime: number | undefined;

        if (coordinates) {
          // Temporariamente usando coordenadas fixas
          // TODO: Adicionar latitude/longitude nas lojas
          const storeCoords = {
            latitude: -5.0892,
            longitude: -42.8019,
          };

          distance = calculateDistance(
            coordinates.latitude,
            coordinates.longitude,
            storeCoords.latitude,
            storeCoords.longitude
          );

          estimatedTime = (store.preparation_time || 30) + (store.delivery_time || 40);
        }

        return {
          ...store,
          distance,
          isOpen: storeIsOpen,
          estimatedTime,
        };
      });

      // Ordenar: abertas primeiro, depois por distância se disponível
      stores.sort((a, b) => {
        if (a.isOpen && !b.isOpen) return -1;
        if (!a.isOpen && b.isOpen) return 1;
        if (a.distance !== undefined && b.distance !== undefined) {
          return a.distance - b.distance;
        }
        return 0;
      });

      return stores;
    },
    enabled: !!city,
  });
}
