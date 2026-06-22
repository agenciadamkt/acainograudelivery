import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

interface RotaPreviewMapProps {
  driverPosition: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  className?: string;
  heightClass?: string;
}

// Mini mapa não-interativo (sem zoom/drag) — preview visual da rota, no
// mesmo padrão de tiles (OpenStreetMap, sem chave de API) já usado no mapa
// administrativo da Frota (RotaDoDiaMap.tsx). Enquanto não há posição
// suficiente pra centralizar, mostra um placeholder estilizado em vez de
// área vazia.
export function RotaPreviewMap({ driverPosition, destination, className = '', heightClass = 'h-36' }: RotaPreviewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const layersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  const hasCoords = !!(driverPosition || destination);

  useEffect(() => {
    if (!hasCoords || mapRef.current || !containerRef.current) return;
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;

      const center = destination ?? driverPosition!;
      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        touchZoom: false,
      }).setView([center.lat, center.lng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

      leafletRef.current = L;
      mapRef.current = map;
      setReady(true);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCoords]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !ready) return;

    layersRef.current.forEach(l => l.remove());
    layersRef.current = [];

    const bounds: [number, number][] = [];

    if (driverPosition) {
      const icon = L.divIcon({
        html: `<div style="background:#7C3AED;border-radius:50%;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 6px rgba(124,58,237,0.5);">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="white" stroke-width="2.5" viewBox="0 0 24 24"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        </div>`,
        className: '',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const marker = L.marker([driverPosition.lat, driverPosition.lng], { icon, zIndexOffset: 500 }).addTo(map);
      layersRef.current.push(marker);
      bounds.push([driverPosition.lat, driverPosition.lng]);
    }

    if (destination) {
      const icon = L.divIcon({
        html: `<div style="background:#DC2626;border-radius:50% 50% 50% 0;width:26px;height:26px;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(220,38,38,0.5);">
          <div style="transform:rotate(45deg);width:8px;height:8px;background:white;border-radius:50%;"></div>
        </div>`,
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 26],
      });
      const marker = L.marker([destination.lat, destination.lng], { icon, zIndexOffset: 600 }).addTo(map);
      layersRef.current.push(marker);
      bounds.push([destination.lat, destination.lng]);
    }

    if (driverPosition && destination) {
      const line = L.polyline(
        [[driverPosition.lat, driverPosition.lng], [destination.lat, destination.lng]],
        { color: '#7C3AED', weight: 3, opacity: 0.6, dashArray: '6, 8' },
      ).addTo(map);
      layersRef.current.push(line);
    }

    if (bounds.length === 2) {
      map.fitBounds(bounds, { padding: [28, 28] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    }

    setTimeout(() => map.invalidateSize(), 50);
  }, [ready, driverPosition, destination]);

  if (!hasCoords) {
    return (
      <div className={`relative ${heightClass} rounded-xl overflow-hidden bg-gradient-to-br from-violet-50 to-violet-100 flex flex-col items-center justify-center gap-1.5 ${className}`}>
        <MapPin className="h-6 w-6 text-violet-300" />
        <span className="text-xs font-medium text-violet-400">Prévia do percurso indisponível</span>
      </div>
    );
  }

  return (
    <div className={`relative ${heightClass} rounded-xl overflow-hidden ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-violet-100 animate-pulse flex items-center justify-center">
          <MapPin className="h-6 w-6 text-violet-300" />
        </div>
      )}
    </div>
  );
}
