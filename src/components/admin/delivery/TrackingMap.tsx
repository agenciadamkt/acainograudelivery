import { useEffect, useRef, useCallback, useState } from "react";
import "leaflet/dist/leaflet.css";
import { Order } from "@/hooks/useOrders";
import { DeliveryDriver } from "@/hooks/useDeliveryDrivers";
import { DeliveryArea } from "@/hooks/useDeliveryAreas";

interface TrackingMapProps {
    orders: Order[];
    drivers: DeliveryDriver[];
    areas?: DeliveryArea[];
}

const TrackingMap = ({ orders, drivers, areas }: TrackingMapProps) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const leafletRef = useRef<any>(null);
    const [isMapReady, setIsMapReady] = useState(false);

    // Store references to map elements for updates
    const driverMarkersRef = useRef<Map<string, any>>(new Map());
    const orderMarkersRef = useRef<Map<string, any>>(new Map());
    const routeLinesRef = useRef<Map<string, any>>(new Map());
    const storeMarkerRef = useRef<any>(null);

    // Initialize Leaflet and Map (only once)
    useEffect(() => {
        if (mapInstanceRef.current) return;

        import('leaflet').then((L) => {
            if (mapContainerRef.current && !mapInstanceRef.current) {
                // Fix default icons
                delete (L.Icon.Default.prototype as any)._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                });

                leafletRef.current = L;

                // Default center (Teresina)
                const defaultCenter: [number, number] = areas && areas.length > 0
                    ? [areas[0].center_lat, areas[0].center_lng]
                    : [-5.089210, -42.801600];

                const map = L.map(mapContainerRef.current).setView(defaultCenter, 13);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap'
                }).addTo(map);

                mapInstanceRef.current = map;
                setIsMapReady(true);
            }
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Create driver icon
    const createDriverIcon = useCallback((L: any, name: string) => {
        return L.divIcon({
            html: `
              <div style="display: flex; flex-direction: column; align-items: center; transform: translateY(-100%); width: 100px;">
                <span style="background: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.3); margin-bottom: 4px; white-space: nowrap; color: #8D42DD; border: 1px solid #8D42DD;">
                    ${name}
                </span>
                <div style="background-color: white; border-radius: 50%; padding: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border: 2px solid #8D42DD;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#8D42DD" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width: 26px; height: 26px;">
                        <circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/><path d="M5 17.5h14"/>
                    </svg>
                </div>
              </div>`,
            className: 'custom-driver-icon',
            iconSize: [100, 70],
            iconAnchor: [50, 70]
        });
    }, []);

    // Create customer icon
    const createOrderIcon = useCallback((L: any, name: string) => {
        return L.divIcon({
            html: `
              <div style="display: flex; flex-direction: column; align-items: center; transform: translateY(-100%); width: 100px;">
                <span style="background: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.3); margin-bottom: 4px; white-space: nowrap; color: #111;">
                  ${name}
                </span>
                <div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
              </div>
            `,
            className: 'custom-order-icon',
            iconSize: [100, 60],
            iconAnchor: [50, 60]
        });
    }, []);

    // Update Store Marker (only when areas change)
    useEffect(() => {
        const L = leafletRef.current;
        const map = mapInstanceRef.current;
        if (!L || !map || !areas || areas.length === 0) return;

        // Remove old store marker
        if (storeMarkerRef.current) {
            storeMarkerRef.current.remove();
        }

        const area = areas[0];
        const storeIcon = L.divIcon({
            html: `
              <div style="
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                transform: translateY(-50%);
              ">
                <div style="
                  width: 56px; 
                  height: 56px; 
                  border-radius: 50%; 
                  background: white; 
                  border: 3px solid #8D42DD; 
                  box-shadow: 0 4px 12px rgba(141, 66, 221, 0.4);
                  display: flex; 
                  align-items: center; 
                  justify-content: center;
                  overflow: hidden;
                ">
                  <img src="/logo-acai.png" style="width: 48px; height: 48px; object-fit: contain;" alt="Açaí no Grau" />
                </div>
                <span style="
                  background: #8D42DD; 
                  color: white; 
                  padding: 2px 8px; 
                  border-radius: 12px; 
                  font-size: 11px; 
                  font-weight: bold; 
                  margin-top: 4px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                  white-space: nowrap;
                ">Açaí no Grau</span>
              </div>
            `,
            className: 'store-icon',
            iconSize: [60, 80],
            iconAnchor: [30, 40]
        });

        storeMarkerRef.current = L.marker([area.center_lat, area.center_lng], { icon: storeIcon, zIndexOffset: 500 })
            .addTo(map)
            .bindPopup('<b>Açaí no Grau</b><br>Base de Entregas');

    }, [areas, isMapReady]);

    // Update Driver Markers (when drivers change position)
    useEffect(() => {
        const L = leafletRef.current;
        const map = mapInstanceRef.current;
        if (!L || !map) return;

        const currentDriverIds = new Set<string>();

        drivers.forEach(driver => {
            const loc = driver.current_location as any;
            if (!loc?.lat || !loc?.lng) return;

            currentDriverIds.add(driver.id);
            const driverName = driver.name.split(' ')[0];
            const latLng: [number, number] = [loc.lat, loc.lng];

            const existingMarker = driverMarkersRef.current.get(driver.id);

            if (existingMarker) {
                // Just update position (smooth!)
                existingMarker.setLatLng(latLng);
            } else {
                // Create new marker
                const icon = createDriverIcon(L, driverName);
                const marker = L.marker(latLng, { icon, zIndexOffset: 1000 })
                    .addTo(map)
                    .bindPopup(`<b>${driver.name}</b><br>Status: ${driver.status}`);
                driverMarkersRef.current.set(driver.id, marker);
            }
        });

        // Remove markers for drivers no longer in the list
        driverMarkersRef.current.forEach((marker, id) => {
            if (!currentDriverIds.has(id)) {
                marker.remove();
                driverMarkersRef.current.delete(id);
            }
        });

    }, [drivers, createDriverIcon, isMapReady]);

    // Update Order Markers and Routes
    useEffect(() => {
        const L = leafletRef.current;
        const map = mapInstanceRef.current;
        if (!L || !map) return;

        const currentOrderIds = new Set<string>();
        const bounds = L.latLngBounds([]);

        // Add store to bounds
        if (areas && areas.length > 0) {
            bounds.extend([areas[0].center_lat, areas[0].center_lng]);
        }

        // Helper to add order marker and route
        const addOrderToMap = (order: any, lat: number, lng: number, isGeocoded: boolean = false) => {
            currentOrderIds.add(order.id);
            const customerName = order.customer?.name?.split(' ')[0] || 'Cliente';
            const latLng: [number, number] = [lat, lng];

            bounds.extend(latLng);

            // Update or create order marker
            const markerId = isGeocoded ? `geo-${order.id}` : order.id;
            const existingMarker = orderMarkersRef.current.get(markerId);
            if (existingMarker) {
                existingMarker.setLatLng(latLng);
            } else {
                const icon = createOrderIcon(L, customerName);
                const marker = L.marker(latLng, { icon })
                    .addTo(map)
                    .bindPopup(`<b>Pedido #${order.order_number}</b><br>Cliente: ${order.customer?.name}${isGeocoded ? ' (Geocodificado)' : ''}`);
                orderMarkersRef.current.set(markerId, marker);
            }

            // Handle route line
            const driver = drivers.find(d => d.id === order.driver_id);
            const driverLoc = driver?.current_location as any;

            let startLat: number, startLng: number;

            if (driverLoc?.lat && driverLoc?.lng) {
                startLat = driverLoc.lat;
                startLng = driverLoc.lng;
                bounds.extend([startLat, startLng]);
            } else if (areas && areas.length > 0) {
                startLat = areas[0].center_lat;
                startLng = areas[0].center_lng;
            } else {
                return;
            }

            // Check if we need to update the route
            const routeKey = `${order.id}`;
            const existingRoute = routeLinesRef.current.get(routeKey);
            const routeData = existingRoute?.routeData;

            // Only fetch new route if positions changed significantly (> 50 meters)
            const needsUpdate = !routeData ||
                Math.abs(routeData.startLat - startLat) > 0.0005 ||
                Math.abs(routeData.startLng - startLng) > 0.0005;

            if (needsUpdate) {
                // Remove old route
                if (existingRoute?.layer) existingRoute.layer.remove();
                if (existingRoute?.glow) existingRoute.glow.remove();

                // Fetch new route from OSRM
                fetch(`https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${lng},${lat}?overview=full&geometries=geojson`)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                        if (data?.routes?.[0]?.geometry && mapInstanceRef.current) {
                            const geojson = data.routes[0].geometry;

                            const glow = L.geoJSON(geojson, {
                                style: { color: '#a78bfa', weight: 7, opacity: 0.3 }
                            }).addTo(mapInstanceRef.current);

                            const layer = L.geoJSON(geojson, {
                                style: { color: '#8D42DD', weight: 4, opacity: 0.8 }
                            }).addTo(mapInstanceRef.current);

                            routeLinesRef.current.set(routeKey, {
                                layer, glow,
                                routeData: { startLat, startLng, endLat: lat, endLng: lng }
                            });
                        }
                    })
                    .catch(() => {
                        // Fallback: straight line
                        if (mapInstanceRef.current) {
                            const line = L.polyline([[startLat, startLng], [lat, lng]], {
                                color: '#8D42DD', weight: 3, dashArray: '10, 10', opacity: 0.6
                            }).addTo(mapInstanceRef.current);
                            routeLinesRef.current.set(routeKey, {
                                layer: line,
                                routeData: { startLat, startLng, endLat: lat, endLng: lng }
                            });
                        }
                    });
            }
        };

        orders.forEach(order => {
            const lat = (order as any).delivery_address?.latitude;
            const lng = (order as any).delivery_address?.longitude;

            if (lat && lng) {
                // Has coordinates
                addOrderToMap(order, lat, lng, false);
            } else if ((order as any).delivery_address) {
                // Needs geocoding
                const addr = (order as any).delivery_address;
                const query = `${addr.street || ''}, ${addr.number || ''}, ${addr.neighborhood || ''}, ${addr.city || ''}`;

                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.length > 0) {
                            addOrderToMap(order, parseFloat(data[0].lat), parseFloat(data[0].lon), true);
                        }
                    })
                    .catch(err => console.error("Geocoding failed for order", order.order_number, err));
            }
        });

        // Cleanup removed orders
        orderMarkersRef.current.forEach((marker, id) => {
            if (!currentOrderIds.has(id)) {
                marker.remove();
                orderMarkersRef.current.delete(id);

                const route = routeLinesRef.current.get(id);
                if (route?.layer) route.layer.remove();
                if (route?.glow) route.glow.remove();
                routeLinesRef.current.delete(id);
            }
        });

        // Fit bounds
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }

    }, [orders, drivers, areas, createOrderIcon, isMapReady]);

    return (
        <div className="h-full w-full relative z-0">
            <div ref={mapContainerRef} className="h-full w-full rounded-lg shadow-inner border" />
            {!isMapReady && (
                <div className="absolute inset-0 bg-muted animate-pulse rounded-lg flex items-center justify-center">
                    Carregando mapa...
                </div>
            )}
        </div>
    );
};

export default TrackingMap;
