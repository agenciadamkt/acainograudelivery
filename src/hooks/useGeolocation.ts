import { useState } from 'react';
import { toast } from 'sonner';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Hook para obter a localização atual do usuário
 */
export function useGeolocation() {
  const [isLoading, setIsLoading] = useState(false);

  const getCurrentLocation = (): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        toast.error('Geolocalização não é suportada pelo seu navegador');
        reject(new Error('Geolocation not supported'));
        return;
      }

      setIsLoading(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsLoading(false);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          setIsLoading(false);
          
          let message = 'Erro ao obter localização';
          
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Permissão de localização negada. Por favor, habilite nas configurações do navegador.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'Localização não disponível no momento';
          } else if (error.code === error.TIMEOUT) {
            message = 'Tempo esgotado ao buscar localização';
          }
          
          toast.error(message);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  return {
    getCurrentLocation,
    isLoading,
  };
}
