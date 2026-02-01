import { useEffect, useState, useRef } from "react";
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
    const mapRef = useRef<any>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<Map<string, any>>(new Map());
    const [L, setL] = useState<any>(null);

    // Load Leaflet
    useEffect(() => {
        import('leaflet').then((leaflet) => {
            // Fix default icons
            delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
            leaflet.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
            setL(leaflet);
        });
    }, []);

    // Initialize Map
    useEffect(() => {
        if (!L || !mapRef.current || mapInstanceRef.current) return;

        // Default center (Teresina or First Area)
        const defaultCenter: [number, number] = areas && areas.length > 0
            ? [areas[0].center_lat, areas[0].center_lng]
            : [-5.089210, -42.801600];

        const map = L.map(mapRef.current).setView(defaultCenter, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [L]);

    // Update Markers
    useEffect(() => {
        if (!L || !mapInstanceRef.current) return;

        const map = mapInstanceRef.current;

        // Clear old markers
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current.clear();

        const bounds = L.latLngBounds([]);

        // 1. Plot Store/Areas Centers (Base)
        if (areas) {
            areas.forEach(area => {
                if (areas.length > 0) {
                    // Maybe draw a store icon at center?
                    const storeIcon = L.divIcon({
                        html: '<div style="background-color: blue; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                        className: 'custom-div-icon',
                        iconSize: [12, 12]
                    });
                    L.marker([area.center_lat, area.center_lng], { icon: storeIcon })
                        .addTo(map)
                        .bindPopup('Loja / Base');
                    bounds.extend([area.center_lat, area.center_lng]);
                }
            });
        }

        // Helper to draw line
        const drawLine = (order: any, endLat: number, endLng: number) => {
            let startLat, startLng;

            // 1. Try Driver Location
            const driver = drivers.find(d => d.id === order.driver_id);
            if (driver && driver.current_location) {
                startLat = (driver.current_location as any).lat;
                startLng = (driver.current_location as any).lng;
            }
            // 2. Fallback to Store/Area
            else if (areas && areas.length > 0) {
                startLat = areas[0].center_lat;
                startLng = areas[0].center_lng;
            }

            if (startLat && startLng) {
                const line = L.polyline([[startLat, startLng], [endLat, endLng]], {
                    color: '#8D42DD', // Brand Purple for better visibility
                    weight: 3,
                    dashArray: '10, 10',
                    opacity: 0.7
                }).addTo(map);
                markersRef.current.set(`line-${order.id}`, line);
            }
        }

        // 2. Plot Active Orders
        orders.forEach(order => {
            // Check if order has delivery address with lat/lng
            // We assume delivery_address is populated similar to types
            const lat = (order as any).delivery_address?.latitude;
            const lng = (order as any).delivery_address?.longitude;

            if (lat && lng) {
                const customerName = order.customer?.name?.split(' ')[0] || 'Cliente';
                const orderIcon = L.divIcon({
                    html: `
                      <div style="display: flex; flex-direction: column; align-items: center; transform: translateY(-100%); width: 100px;">
                        <span style="background: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.3); margin-bottom: 4px; white-space: nowrap; color: #111;">
                          ${customerName}
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

                const marker = L.marker([lat, lng], { icon: orderIcon })
                    .addTo(map)
                    .bindPopup(`
            <b>Pedido #${order.order_number}</b><br>
            Cliente: ${order.customer?.name}<br>
            Status: ${order.status}
          `);

                markersRef.current.set(`order-${order.id}`, marker);
                bounds.extend([lat, lng]);

                // Draw line
                drawLine(order, lat, lng);

            } else if ((order as any).delivery_address) {
                // Fallback Geocoding
                const addr = (order as any).delivery_address;
                const query = `${addr.street}, ${addr.number}, ${addr.city}`;

                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data && data.length > 0 && mapInstanceRef.current) {
                            const lat = data[0].lat;
                            const lon = data[0].lon;
                            const customerName = order.customer?.name?.split(' ')[0] || 'Cliente';

                            const orderIcon = L.divIcon({
                                html: `
                                  <div style="display: flex; flex-direction: column; align-items: center; transform: translateY(-100%); width: 100px;">
                                    <span style="background: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.3); margin-bottom: 4px; white-space: nowrap; color: #111;">
                                      ${customerName}
                                    </span>
                                    <div style="background-color: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                      </svg>
                                    </div>
                                  </div>
                                `,
                                className: 'custom-order-icon-fallback',
                                iconSize: [100, 60],
                                iconAnchor: [50, 60]
                            });

                            const marker = L.marker([lat, lon], { icon: orderIcon })
                                .addTo(map)
                                .bindPopup(`
                                   <b>Pedido #${order.order_number}</b><br>
                                   Cliente: ${order.customer?.name} (Geocodificado)<br>
                                   Status: ${order.status}
                                 `);
                            markersRef.current.set(`order-fallback-${order.id}`, marker);
                            bounds.extend([lat, lon]);
                            map.fitBounds(bounds, { padding: [50, 50] });

                            // Draw Line using helper
                            drawLine(order, lat, lon);
                        }
                    })
                    .catch(err => console.error("Geocoding failed", err));
            }
        });

        // 3. Plot Drivers
        drivers.forEach(driver => {
            const loc = driver.current_location as any; // { lat, lng } or similar
            if (loc && loc.lat && loc.lng) {
                const driverName = driver.name.split(' ')[0];
                const driverIcon = L.divIcon({
                    html: `
                      <div style="display: flex; flex-direction: column; align-items: center; transform: translateY(-100%); width: 100px;">
                        <span style="background: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.3); margin-bottom: 4px; white-space: nowrap; color: #8D42DD; border: 1px solid #8D42DD;">
                            ${driverName}
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

                const marker = L.marker([loc.lat, loc.lng], { icon: driverIcon, zIndexOffset: 1000 })
                    .addTo(map)
                    .bindPopup(`<b>${driver.name}</b><br>Status: ${driver.status}`);

                markersRef.current.set(`driver-${driver.id}`, marker);
                bounds.extend([loc.lat, loc.lng]);
            }
        });

        // Fit bounds if we have points
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }

    }, [L, orders, drivers, areas]);

    // Debug Effect
    useEffect(() => {
        console.log('TrackingMap Data Update:', {
            ordersCount: orders.length,
            driversCount: drivers.length,
            ordersWithCoords: orders.filter(o => (o as any).delivery_address?.latitude).length
        });

        orders.forEach(o => {
            const addr = (o as any).delivery_address;
            if (!addr?.latitude || !addr?.longitude) {
                console.warn(`Order #${o.order_number} missing coordinates:`, addr);
            }
        });
    }, [orders, drivers]);

    if (!L) return <div className="h-full bg-muted animate-pulse rounded-lg flex items-center justify-center">Carregando mapa...</div>;

    return <div ref={mapRef} className="h-full w-full rounded-lg shadow-inner border" />;
};

export default TrackingMap;
