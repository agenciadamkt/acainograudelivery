
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const dPhi = ((lat2 - lat1) * Math.PI) / 180
  const dLam = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLam / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function isValid(lat: any, lng: any): boolean {
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    !isNaN(lat) && !isNaN(lng) &&
    !(lat === 0 && lng === 0) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
  )
}

async function nominatim(q: string): Promise<{ lat: number; lng: number; queryUsed: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: { 'User-Agent': 'AcaiNoGrauApp/1.0 (sac@acainograu.com.br)' } })
    const data = await res.json()
    if (data?.length > 0) {
      const lat = parseFloat(data[0].lat)
      const lng = parseFloat(data[0].lon)
      if (isValid(lat, lng)) return { lat, lng, queryUsed: q }
    }
  } catch { /* ignore */ }
  return null
}

// Returns geocode result + whether it's only city-level (imprecise)
async function geocodeCustomerAddress(street: string, number: string, neighborhood: string, city: string, state: string) {
  if (!city || !state) return null

  // Full address
  if (street) {
    const r = await nominatim(`${street}, ${number}, ${neighborhood}, ${city}, ${state}`)
    if (r) return { ...r, cityLevelOnly: false }

    const r2 = await nominatim(`${street}, ${city}, ${state}`)
    if (r2) return { ...r2, cityLevelOnly: false }
  }

  // City-level fallback — imprecise, mark as such
  const r3 = await nominatim(`${city}, ${state}`)
  if (r3) return { ...r3, cityLevelOnly: true }

  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { addressId, storeId, clientLat, clientLng } = await req.json()

    if (!storeId) throw new Error('storeId é obrigatório')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ─── 1. Loja: taxa base ──────────────────────────────────────────────────
    const { data: store } = await supabase
      .from('stores')
      .select('delivery_fee')
      .eq('id', storeId)
      .single()

    const storeFee = store?.delivery_fee ?? 0

    // ─── 2. Áreas ativas ────────────────────────────────────────────────────
    const { data: areas, error: areasError } = await supabase
      .from('delivery_areas')
      .select('id, name, center_lat, center_lng, radius_meters, fee')
      .eq('store_id', storeId)
      .eq('active', true)
      .order('radius_meters', { ascending: true })

    if (areasError) throw new Error(`Erro ao buscar áreas: ${areasError.message}`)

    // Sem áreas configuradas → liberar entrega com taxa da loja
    if (!areas || areas.length === 0) {
      return new Response(JSON.stringify({
        allowed: true, fee: storeFee, distance: 0, areaName: null, source: 'no_areas',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ─── 3. Coordenadas do cliente ───────────────────────────────────────────
    // Prioridade: GPS do browser (preciso) → geocoding → coords salvas
    let clientGeoSource = ''
    let lat: number | null = null
    let lng: number | null = null
    let cityLevelOnly = false

    if (isValid(clientLat, clientLng)) {
      // GPS enviado direto do browser — mais confiável
      lat = clientLat
      lng = clientLng
      clientGeoSource = 'gps_browser'
    } else if (addressId) {
      const { data: addr } = await supabase
        .from('customer_addresses')
        .select('latitude, longitude, street, number, neighborhood, city, state')
        .eq('id', addressId)
        .single()

      if (addr) {
        // Sempre tenta geocodificar de novo para evitar coords cacheadas erradas
        const geo = await geocodeCustomerAddress(
          addr.street || '', addr.number || '', addr.neighborhood || '',
          addr.city || '', addr.state || ''
        )

        if (geo) {
          lat = geo.lat
          lng = geo.lng
          cityLevelOnly = geo.cityLevelOnly
          clientGeoSource = `nominatim:${geo.queryUsed}`

          if (!geo.cityLevelOnly) {
            // Persistir coords precisas para próximas chamadas
            await supabase
              .from('customer_addresses')
              .update({ latitude: lat, longitude: lng })
              .eq('id', addressId)
          }
        } else if (isValid(addr.latitude, addr.longitude)) {
          lat = addr.latitude
          lng = addr.longitude
          clientGeoSource = 'cached'
        }
      }
    }

    // Sem coords do cliente → não bloquear (não conseguimos verificar)
    if (!isValid(lat, lng)) {
      return new Response(JSON.stringify({
        allowed: true, fee: storeFee, distance: 0, areaName: null,
        source: 'no_client_coords', debug: { clientGeoSource },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Coords apenas no nível de cidade (imprecisas) → não bloquear
    if (cityLevelOnly) {
      return new Response(JSON.stringify({
        allowed: true, fee: storeFee, distance: 0, areaName: null,
        source: 'city_level_only', debug: { clientGeoSource },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ─── 4. Comparar com áreas ───────────────────────────────────────────────
    // Centro: usa SEMPRE o valor salvo na área (admin configurou via Google Maps)
    // Geocoding do endereço da loja NÃO é usado aqui — o admin já configurou manualmente
    let matchedArea: any = null
    let matchedDistance = 0
    const debugAreas: any[] = []

    for (const area of areas) {
      const centerLat = area.center_lat
      const centerLng = area.center_lng

      if (!isValid(centerLat, centerLng)) {
        debugAreas.push({ name: area.name, error: 'centro_nao_configurado' })
        continue
      }

      const dist = haversineMeters(lat!, lng!, centerLat, centerLng)
      const inside = dist <= area.radius_meters

      debugAreas.push({
        name: area.name,
        dist_meters: Math.round(dist),
        radius_meters: area.radius_meters,
        inside,
        fee: area.fee,
        center: [centerLat, centerLng],
      })

      if (inside && !matchedArea) {
        matchedArea = area
        matchedDistance = dist
      }
    }

    if (matchedArea) {
      return new Response(JSON.stringify({
        allowed: true,
        fee: matchedArea.fee,
        distance: Math.round(matchedDistance),
        areaName: matchedArea.name,
        source: 'area',
        debug: { areas: debugAreas, clientGeoSource, clientLat: lat, clientLng: lng },
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fora de todas as áreas
    return new Response(JSON.stringify({
      allowed: false, fee: 0, distance: 0, areaName: null, source: 'outside',
      debug: { areas: debugAreas, clientGeoSource, clientLat: lat, clientLng: lng },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
