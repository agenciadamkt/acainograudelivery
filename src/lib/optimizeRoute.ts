// Av. Higino Cunha, 561 - Ilhotas, Teresina - PI, 64014-220
export const STORE_CENTER: [number, number] = [-5.095521133314183, -42.79699459585668];

export interface RouteStop {
  id: string;
  lat: number;
  lng: number;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Heurística do vizinho mais próximo (distância em linha reta) — não depende
// de rede/serviço externo, então nunca falha. Usada como base garantida e
// como fallback caso o OSRM esteja indisponível/bloqueado no navegador.
function nearestNeighborOrder(stops: RouteStop[], storeCenter: [number, number]): string[] {
  const remaining = [...stops];
  const ordered: string[] = [];
  let [currentLat, currentLng] = storeCenter;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineKm(currentLat, currentLng, remaining[i].lat, remaining[i].lng);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }
    const next = remaining.splice(nearestIdx, 1)[0];
    ordered.push(next.id);
    currentLat = next.lat;
    currentLng = next.lng;
  }
  return ordered;
}

export interface OsrmLeg {
  distanceMeters: number;
  durationSeconds: number;
}

export interface OsrmTripResult {
  orderedIds: string[];
  legs: OsrmLeg[]; // um por trecho, na ordem otimizada: loja→parada1, parada1→parada2, ...
}

async function tryOsrmTrip(stops: RouteStop[], storeCenter: [number, number]): Promise<OsrmTripResult | null> {
  const waypoints: [number, number][] = [storeCenter, ...stops.map(s => [s.lat, s.lng] as [number, number])];
  const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');

  try {
    const res = await fetch(
      // overview=false já era usado; legs vêm na resposta padrão do /trip/,
      // sem custo extra de requisição — só não eram lidos até agora.
      `https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&roundtrip=false&overview=false`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const wps: any[] = data?.waypoints;
    if (!Array.isArray(wps) || wps.length !== stops.length + 1) return null;

    // wps está na ordem de ENTRADA (índice 0 = loja, índice i = stops[i-1]).
    // wp.waypoint_index é a posição de visita na rota otimizada.
    const orderedIds = wps
      .map((wp, inputIndex) => ({ inputIndex, waypointIndex: wp.waypoint_index }))
      .filter(w => w.inputIndex > 0)
      .sort((a, b) => a.waypointIndex - b.waypointIndex)
      .map(w => stops[w.inputIndex - 1].id);

    const trip = data?.trips?.[0];
    const legs: OsrmLeg[] = Array.isArray(trip?.legs)
      ? trip.legs.map((l: any) => ({ distanceMeters: l.distance, durationSeconds: l.duration }))
      : [];

    return { orderedIds, legs };
  } catch {
    return null;
  }
}

/**
 * Calcula a ordem de visita mais econômica a partir da loja.
 * Tenta o OSRM (considera ruas reais) primeiro; se a API externa falhar,
 * usar timeout, ou estiver indisponível/bloqueada no navegador, cai para
 * vizinho-mais-próximo local (linha reta) — que nunca falha. Por isso, com
 * 2+ paradas com coordenadas, esta função SEMPRE retorna uma ordem otimizada,
 * nunca a ordem original sem otimizar.
 * Retorna null apenas se houver menos de 2 paradas.
 */
export async function optimizeStopsOrder(
  stops: RouteStop[],
  storeCenter: [number, number] = STORE_CENTER
): Promise<string[] | null> {
  if (stops.length < 2) return null;

  const osrmResult = await tryOsrmTrip(stops, storeCenter);
  if (osrmResult) return osrmResult.orderedIds;

  console.warn('[optimizeRoute] OSRM indisponível — usando otimização local (vizinho mais próximo).');
  return nearestNeighborOrder(stops, storeCenter);
}

/**
 * Mesma otimização de `optimizeStopsOrder`, mas também retorna o
 * tempo/distância de cada trecho (na ordem otimizada) — usado pra persistir
 * ETA por parada sem chamada extra ao OSRM. Se o OSRM falhar, cai pro
 * vizinho-mais-próximo só pra ORDEM, sem `legs` (ETA fica indisponível pra
 * essa rota — mostrado como "—" na tela, nunca inventado).
 */
export async function optimizeStopsOrderWithEta(
  stops: RouteStop[],
  storeCenter: [number, number] = STORE_CENTER
): Promise<OsrmTripResult | null> {
  if (stops.length < 2) return null;

  const osrmResult = await tryOsrmTrip(stops, storeCenter);
  if (osrmResult) return osrmResult;

  console.warn('[optimizeRoute] OSRM indisponível — usando otimização local (vizinho mais próximo), sem ETA.');
  return { orderedIds: nearestNeighborOrder(stops, storeCenter), legs: [] };
}
