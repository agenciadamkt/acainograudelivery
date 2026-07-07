import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { RotaOrdem } from '@/hooks/useRotaDoDia';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import FlipClock from '@/components/ui/flip-clock';
import { Loader2, Zap, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { optimizeStopsOrder, STORE_CENTER as DEFAULT_STORE_CENTER, type RouteStop } from '@/lib/optimizeRoute';
import { formatBRL } from '@/lib/utils';

export interface RouteInfo {
  driverName: string;
  status: string; // 'pendente' | 'em_progresso' | 'concluida' | 'cancelada'
  startedAt: string | null;
  completedAt: string | null;
}

interface RotaDoDiaMapProps {
  orders: RotaOrdem[];
  storeCenter?: [number, number];
  routeId?: string;
  onOptimize?: (orderedIds: string[], manualOrderedIds: string[], stopOrder: string[]) => void;
  optimizing?: boolean;
  // fleet_drivers.id do motorista da rota — só passe quando a rota estiver
  // em_progresso, para mostrar o motorista se movendo ao vivo no mapa
  // (localização gravada pelo app do motorista em fleet_drivers.current_location).
  driverId?: string;
  // Resumo operacional exibido numa barra discreta no topo do mapa (substitui
  // qualquer elemento decorativo grande — o mapa é o protagonista da tela).
  routeInfo?: RouteInfo;
}

const STATUS_COLORS: Record<string, string> = {
  out_for_delivery: '#3b82f6',
  delivered: '#10b981',
  pending: '#f97316',
  confirmed: '#f97316',
  preparing: '#f97316',
  ready: '#f97316',
  cancelled: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  out_for_delivery: 'Em Rota',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

const ROUTE_STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_progresso: 'Em Rota',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

function fmtTs(ts: string | number | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDuration(minutes: number): string {
  const totalMin = Math.round(minutes);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m}min`;
}

// Horário mais relevante pra exibir no tooltip compacto do marcador, segundo
// o status atual do pedido.
function relevantTime(ordem: RotaOrdem): string | null {
  if (ordem.status === 'delivered') return fmtTs(ordem.deliveredAt);
  if (ordem.status === 'out_for_delivery') return fmtTs(ordem.outForDeliveryAt);
  return null;
}

const RotaDoDiaMap = ({
  orders,
  storeCenter = DEFAULT_STORE_CENTER,
  routeId,
  onOptimize,
  optimizing = false,
  driverId,
  routeInfo,
}: RotaDoDiaMapProps) => {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<any>(null);
  const leafletRef    = useRef<any>(null);
  const markersRef    = useRef<any[]>([]);
  const routeLayerRef = useRef<any>(null);
  const glowLayerRef  = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; timestamp?: number } | null>(null);
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const [routeKm, setRouteKm] = useState<number | null>(null);

  // Quando o container entra/sai da tela cheia (ex: botão "Expandir Mapa"),
  // o Leaflet não percebe a mudança de tamanho sozinho (não é um resize de
  // window) e continua desenhando com as dimensões antigas — os marcadores e
  // popups ficam fora do lugar ou somem. Recalcula o tamanho manualmente.
  useEffect(() => {
    const handleFullscreenChange = () => {
      setTimeout(() => mapRef.current?.invalidateSize(), 150);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Inicializa mapa uma única vez
  useEffect(() => {
    if (mapRef.current) return;
    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return;
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      leafletRef.current = L;
      const map = L.map(containerRef.current).setView(storeCenter, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      const storeIcon = L.divIcon({
        html: `<div style="background:#8D42DD;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(141,66,221,0.5);">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });
      L.marker(storeCenter, { icon: storeIcon, zIndexOffset: 500 })
        .addTo(map)
        .bindPopup('<b>Loja</b><br>Av. Higino Cunha, 561 - Ilhotas, Teresina - PI');

      mapRef.current = map;
      setReady(true);
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Atualiza marcadores e rota quando orders mudam
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !ready) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    routeLayerRef.current?.remove();
    glowLayerRef.current?.remove();

    const validOrders = orders.filter(o => o.address?.latitude && o.address?.longitude);
    if (validOrders.length === 0) return;

    const bounds = L.latLngBounds([storeCenter]);

    validOrders.forEach((ordem) => {
      const lat = ordem.address!.latitude!;
      const lng = ordem.address!.longitude!;
      const color = STATUS_COLORS[ordem.status] ?? '#f97316';

      bounds.extend([lat, lng]);

      const icon = L.divIcon({
        html: `<div style="background:${color};border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:14px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);">${ordem.sequencia}</div>`,
        className: '',
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const addr = ordem.address;
      const addrLine = [
        [addr?.street, addr?.number].filter(Boolean).join(', '),
        addr?.neighborhood,
        addr?.city,
      ].filter(Boolean).join(' - ');
      const statusLabel = STATUS_LABELS[ordem.status] ?? ordem.status;
      const time = relevantTime(ordem);

      // Tooltip compacto — sempre visível, só o essencial (não compete com o
      // mapa). Detalhe completo (endereço, valor, todos os horários) fica no
      // popup, que só abre ao clicar no marcador.
      const tooltip = `
        <div style="font-family:sans-serif;text-align:center;line-height:1.35;padding:1px 2px;">
          <div style="font-weight:bold;font-size:11px;color:#1f2937;">#${ordem.orderNumber}</div>
          <div style="font-size:10px;color:#374151;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${ordem.customer.name}</div>
          <div style="font-size:9px;font-weight:bold;color:${color};">${statusLabel}</div>
          ${time ? `<div style="font-size:9px;color:#6b7280;">${time}</div>` : ''}
        </div>`;

      const popup = `
        <div style="min-width:220px;font-family:sans-serif;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
            <span style="font-weight:bold;font-size:13px;">#${ordem.orderNumber}</span>
            ${ordem.isManualOrder ? `<span style="background:#ede9fe;color:#7c3aed;font-size:10px;font-weight:bold;padding:1px 6px;border-radius:4px;">Manual</span>` : ''}
            <span style="margin-left:auto;background:${color};color:white;font-size:10px;font-weight:bold;padding:1px 6px;border-radius:4px;white-space:nowrap;">${statusLabel}</span>
          </div>
          <div style="font-size:12px;font-weight:600;margin-bottom:2px;">${ordem.customer.name}</div>
          <div style="font-size:12px;color:#16a34a;font-weight:bold;margin-bottom:5px;">${formatBRL(ordem.totalAmount)}</div>
          ${addrLine ? `<div style="font-size:11px;color:#555;margin-bottom:6px;">${addrLine}</div>` : ''}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;">
            <div>📥 Chegou: <b>${fmtTs(ordem.createdAt)}</b></div>
            <div>✅ Aprovado: <b>${fmtTs(ordem.confirmedAt)}</b></div>
            <div>🛵 Saiu: <b>${fmtTs(ordem.outForDeliveryAt)}</b></div>
            <div>📦 Entregue: <b>${fmtTs(ordem.deliveredAt)}</b></div>
          </div>
          ${ordem.deliveryObservation ? `<div style="margin-top:6px;padding:4px;background:#fef3c7;border-radius:4px;font-size:11px;">⚠️ ${ordem.deliveryObservation}</div>` : ''}
        </div>`;

      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindTooltip(tooltip, {
          permanent: true,
          direction: 'top',
          offset: [0, -16],
          opacity: 0.95,
          className: 'frota-compact-tooltip',
        })
        .bindPopup(popup, { closeButton: true });
      markersRef.current.push(marker);
    });

    const waypoints = [storeCenter, ...validOrders.map(o => [o.address!.latitude!, o.address!.longitude!])];
    const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');

    fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const route0 = data?.routes?.[0];
        if (route0?.distance) setRouteKm(route0.distance / 1000);
        if (route0?.geometry && mapRef.current) {
          const geo = route0.geometry;
          glowLayerRef.current = L.geoJSON(geo, { style: { color: '#a78bfa', weight: 8, opacity: 0.25 } }).addTo(mapRef.current);
          routeLayerRef.current = L.geoJSON(geo, { style: { color: '#8D42DD', weight: 4, opacity: 0.85 } }).addTo(mapRef.current);
        }
      })
      .catch(() => {
        const pts = waypoints as [number, number][];
        glowLayerRef.current = L.polyline(pts, { color: '#a78bfa', weight: 8, opacity: 0.25 }).addTo(map);
        routeLayerRef.current = L.polyline(pts, { color: '#8D42DD', weight: 4, dashArray: '10,8', opacity: 0.7 }).addTo(map);
      });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [orders, ready]);

  // Localização ao vivo do motorista (fleet_drivers.current_location), só
  // quando driverId é passado (rota em_progresso) — independente do módulo
  // Delivery, que usa a tabela delivery_drivers.
  useEffect(() => {
    setDriverLocation(null);
    setLastHeartbeat(null);
    if (!driverId) return;

    supabase
      .from('fleet_drivers' as any)
      .select('current_location, last_heartbeat')
      .eq('id', driverId)
      .single()
      .then(({ data }: any) => {
        const loc = data?.current_location;
        if (loc?.lat && loc?.lng) setDriverLocation({ lat: loc.lat, lng: loc.lng, timestamp: loc.timestamp });
        if (data?.last_heartbeat) setLastHeartbeat(new Date(data.last_heartbeat).getTime());
      });

    const channel = supabase
      .channel(`frota-driver-location-${driverId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'fleet_drivers', filter: `id=eq.${driverId}` },
        (payload: any) => {
          const loc = payload.new?.current_location;
          if (loc?.lat && loc?.lng) setDriverLocation({ lat: loc.lat, lng: loc.lng, timestamp: loc.timestamp });
          if (payload.new?.last_heartbeat) setLastHeartbeat(new Date(payload.new.last_heartbeat).getTime());
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [driverId]);

  // Cria/move o marcador do motorista sem redesenhar o resto do mapa
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || !ready) return;

    if (!driverLocation) {
      driverMarkerRef.current?.remove();
      driverMarkerRef.current = null;
      return;
    }

    const { lat, lng } = driverLocation;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([lat, lng]);
      return;
    }

    const driverIcon = L.divIcon({
      html: `<div style="background:#16a34a;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 10px rgba(22,163,74,0.6);">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M3 13l2-5h11l3 5v5h-2a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H3z"/><circle cx="7" cy="18" r="0" /></svg>
      </div>`,
      className: '',
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    driverMarkerRef.current = L.marker([lat, lng], { icon: driverIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup('<b>Motorista</b>');
  }, [driverLocation, ready]);

  // Pedidos de cliente E pedidos manuais entram no cálculo de distância
  // (franquia fica de fora — fluxo de abastecimento separado). Antes, só
  // pedidos de cliente eram considerados e os manuais sempre ficavam por
  // último na sequência, mesmo quando eram a parada mais próxima da loja.
  const geocodedStops = orders.filter(
    o => !o.isFranchiseeOrder && o.address?.latitude && o.address?.longitude
  );

  const handleOptimize = async () => {
    if (!onOptimize || !routeId || geocodedStops.length < 2) return;

    setCalculating(true);
    try {
      const stops: RouteStop[] = geocodedStops.map(o => ({
        id: o.orderId, lat: o.address!.latitude!, lng: o.address!.longitude!,
      }));
      const optimizedIds = await optimizeStopsOrder(stops, storeCenter) ?? stops.map(s => s.id);

      const otherOrders = orders
        .filter(o => !optimizedIds.includes(o.orderId) && !o.isFranchiseeOrder)
        .map(o => o.orderId);
      const allOrderedIds = [...optimizedIds, ...otherOrders];

      onOptimize(
        allOrderedIds.filter(id => orders.find(o => o.orderId === id && !o.isManualOrder)),
        allOrderedIds.filter(id => orders.find(o => o.orderId === id && o.isManualOrder)),
        allOrderedIds,
      );
    } finally {
      setCalculating(false);
    }
  };

  const canOptimize = onOptimize && routeId && geocodedStops.length >= 2;

  // Sem nenhuma atualização chegando via Realtime, a barra operacional ficaria
  // "congelada" mostrando uma localização antiga como se fosse atual — esse
  // tick força recalcular o tempo decorrido mesmo quando o motorista parou
  // de mandar sinal.
  const [, setStatusTick] = useState(0);
  useEffect(() => {
    if (!driverId) return;
    const id = setInterval(() => setStatusTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, [driverId]);

  // Heartbeat é o sinal de vida do APP (independente do GPS); current_location
  // é o sinal de vida do GPS. Cruzando os dois, o admin distingue "app aberto
  // mas GPS travou" de "app fechado/sem sinal" — hoje os dois pareciam iguais.
  const HEARTBEAT_STALE_MS = 90_000;
  const GPS_STALE_MS = 120_000;
  const heartbeatAgeMs = lastHeartbeat ? Date.now() - lastHeartbeat : null;
  const locationAgeMs = driverLocation?.timestamp ? Date.now() - driverLocation.timestamp : null;
  const appAlive = heartbeatAgeMs !== null && heartbeatAgeMs < HEARTBEAT_STALE_MS;
  const gpsFresh = locationAgeMs !== null && locationAgeMs < GPS_STALE_MS;

  const entregues = orders.filter(o => o.status === 'delivered').length;
  const tempoTotalMin = routeInfo?.startedAt
    ? (routeInfo.completedAt
        ? (new Date(routeInfo.completedAt).getTime() - new Date(routeInfo.startedAt).getTime()) / 60000
        : (Date.now() - new Date(routeInfo.startedAt).getTime()) / 60000)
    : null;

  return (
    <div className="h-full w-full relative z-0">
      <div ref={containerRef} className="h-full w-full rounded-xl border shadow-inner" />

      {/* Barra operacional discreta — substitui qualquer elemento decorativo
          grande. O mapa é o protagonista; isso é só contexto rápido. */}
      {routeInfo && (
        <div className="absolute top-3 left-3 z-[1000] max-w-[calc(100%-1.5rem)] pointer-events-none">
          {/* max-w-md força a quebrar em 2 linhas em vez de esticar até o
              centro do mapa — sem isso, com motorista+status+km+sinal
              juntos, essa barra cobria o relógio. */}
          <div className="inline-flex items-center gap-2.5 bg-white/95 border border-gray-200 rounded-lg shadow-sm px-3 py-1.5 text-xs flex-wrap max-w-md">
            <span className="flex items-center gap-1.5 font-bold text-gray-900">
              <Truck className="h-3.5 w-3.5 text-primary" /> {routeInfo.driverName}
            </span>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-gray-300 text-gray-600">
              {ROUTE_STATUS_LABELS[routeInfo.status] ?? routeInfo.status}
            </Badge>
            <span className="text-gray-300">·</span>
            <span className="text-gray-700">{entregues}/{orders.length} entregues</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-700">{routeKm != null ? `${routeKm.toFixed(1)} km` : '— km'}</span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-700">{tempoTotalMin != null ? fmtDuration(tempoTotalMin) : '—'}</span>
            {driverId && (
              <>
                <span className="text-gray-300">·</span>
                {!appAlive ? (
                  <span className="text-red-600 font-semibold">📵 Sem sinal do app</span>
                ) : !gpsFresh ? (
                  <span className="text-amber-600 font-semibold">⚠️ GPS travado</span>
                ) : (
                  <span className="text-emerald-600 font-semibold">🟢 Ao vivo</span>
                )}
                {driverLocation?.timestamp && (
                  <span className="text-gray-400">· loc. {fmtTs(driverLocation.timestamp)}</span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Relógio — canto superior direito (abaixo do botão "Otimizar Rota"),
          longe da barra operacional que fica à esquerda. Centralizado no topo
          ela ficava embaixo dessa barra quando o texto crescia (motorista +
          status + km + sinal do app). */}
      <div className="absolute top-14 right-3 z-[900] pointer-events-none">
        <div className="bg-white/90 border border-gray-200 rounded-lg shadow-sm px-2 py-1">
          <FlipClock size="sm" color="purple" />
        </div>
      </div>

      {/* Botão otimizar rota */}
      {canOptimize && (
        <div className="absolute top-3 right-3 z-[400]">
          <Button
            size="sm"
            onClick={handleOptimize}
            disabled={calculating || optimizing}
            className="bg-white hover:bg-gray-50 text-purple-700 border border-purple-200 shadow-md gap-1.5 text-xs font-semibold"
          >
            {(calculating || optimizing) ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5 text-yellow-500" />
            )}
            {calculating || optimizing ? 'Calculando...' : 'Otimizar Rota'}
          </Button>
        </div>
      )}

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse rounded-xl text-sm text-muted-foreground">
          Carregando mapa...
        </div>
      )}
    </div>
  );
};

export default RotaDoDiaMap;
