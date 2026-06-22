// Camada de abstração sobre geolocalização contínua — hoje implementada com
// navigator.geolocation; ponto único de troca pra @capacitor/geolocation
// quando o app for empacotado nativamente, sem precisar tocar nas telas que
// consomem (ex: MotoristaDashboard.tsx).

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface GeoError {
  code: number;
  message: string;
}

export interface WatchPositionOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export function watchPosition(
  onUpdate: (position: GeoPosition) => void,
  onError: (error: GeoError) => void,
  options: WatchPositionOptions = {},
): () => void {
  if (!navigator.geolocation) {
    onError({ code: 0, message: 'Geolocalização não suportada neste dispositivo' });
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      });
    },
    (error) => onError({ code: error.code, message: error.message }),
    {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: options.timeout ?? 15000,
      maximumAge: options.maximumAge ?? 0,
    },
  );

  return () => navigator.geolocation.clearWatch(watchId);
}

export function getLastKnownOrCurrentPosition(): Promise<GeoPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60_000 },
    );
  });
}
