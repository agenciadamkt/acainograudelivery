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

        // 2. Plot Active Orders
        orders.forEach(order => {
            // Check if order has delivery address with lat/lng
            // We assume delivery_address is populated similar to types
            const lat = (order as any).delivery_address?.latitude;
            const lng = (order as any).delivery_address?.longitude;

            if (lat && lng) {
                const orderIcon = L.divIcon({
                    html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${order.order_number.slice(-2)}</div>`,
                    className: 'custom-order-icon',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
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

                // Connect Store to Order with Line (if First Area exists as Store)
                if (areas && areas.length > 0) {
                    const start = [areas[0].center_lat, areas[0].center_lng];
                    const end = [lat, lng];
                    L.polyline([start, end], { color: 'red', weight: 2, dashArray: '5, 10', opacity: 0.5 }).addTo(map);
                }
            }
        });

        // 3. Plot Drivers
        drivers.forEach(driver => {
            const loc = driver.current_location as any; // { lat, lng } or similar
            if (loc && loc.lat && loc.lng) {
                const driverIcon = L.divIcon({
                    html: '🚚',
                    className: 'text-2xl',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
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
