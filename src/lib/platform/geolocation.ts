// Camada de abstração sobre geolocalização — ponto único de troca entre Web
// APIs e plugins Capacitor, sem precisar tocar nas telas que consomem (ex:
// MotoristaDashboard.tsx, useRouteEvents.ts).
//
// watchPosition() usa @capacitor-community/background-geolocation: mantém o
// rastreamento contínuo da rota mesmo com o app minimizado/tela apagada
// (requisito da Frota). Esse plugin é "types-only" (sem implementação web
// embutida, registerPlugin puro) — por isso o branch manual abaixo cai pro
// navigator.geolocation quando fora de contexto nativo, senão não dava pra
// testar a tela no navegador sem precisar do app empacotado.
//
// getLastKnownOrCurrentPosition() usa @capacitor/geolocation (oficial): é só
// uma leitura pontual (ex: localização ao registrar uma ocorrência), não
// precisa de segundo plano — esse já tem fallback web automático.
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GeoError {
  code: number;
  message: string;
}

export function watchPosition(
  onUpdate: (position: GeoPosition) => void,
  onError: (error: GeoError) => void,
): () => void {
  if (!Capacitor.isNativePlatform()) {
    if (!navigator.geolocation) {
      onError({ code: 0, message: 'Geolocalização não suportada neste dispositivo' });
      return () => {};
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      (error) => onError({ code: error.code, message: error.message }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }

  let watcherId: string | null = null;
  let stopped = false;

  BackgroundGeolocation.addWatcher(
    {
      backgroundTitle: 'Açaí no Grau Motorista',
      backgroundMessage: 'Rastreando sua localização durante a rota de entrega.',
      requestPermissions: true,
      stale: false,
      distanceFilter: 10,
    },
    (location, error) => {
      if (stopped) return;
      if (error) {
        onError({ code: 0, message: error.message || 'Erro de localização em segundo plano' });
        return;
      }
      if (location) {
        onUpdate({ latitude: location.latitude, longitude: location.longitude, accuracy: location.accuracy });
      }
    },
  ).then((id) => {
    if (stopped) {
      BackgroundGeolocation.removeWatcher({ id }).catch(() => {});
    } else {
      watcherId = id;
    }
  }).catch((err: any) => {
    if (!stopped) onError({ code: 0, message: err?.message || 'Falha ao iniciar rastreamento de localização' });
  });

  return () => {
    stopped = true;
    if (watcherId) BackgroundGeolocation.removeWatcher({ id: watcherId }).catch(() => {});
  };
}

export async function getLastKnownOrCurrentPosition(): Promise<GeoPosition | null> {
  try {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  } catch {
    return null;
  }
}
