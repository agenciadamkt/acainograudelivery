import { useEffect, useState, useRef } from "react";
import { DeliveryArea } from "@/hooks/useDeliveryAreas";
import "leaflet/dist/leaflet.css";

interface DeliveryMapProps {
    areas: DeliveryArea[];
    selectedAreaId: string | null;
    onAreaCenterChange: (areaId: string, lat: number, lng: number) => void;
    onSelectArea: (areaId: string) => void;
}

const DeliveryMap = ({ areas, selectedAreaId, onAreaCenterChange, onSelectArea }: DeliveryMapProps) => {
    const mapRef = useRef<any>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<Map<string, any>>(new Map());
    const circlesRef = useRef<Map<string, any>>(new Map());
    const [L, setL] = useState<any>(null);

    // Dynamically load leaflet
    useEffect(() => {
        import('leaflet').then((leaflet) => {
            // Fix default icon
            delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
            leaflet.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });
            setL(leaflet);
        });
    }, []);

    // Initialize map
    useEffect(() => {
        if (!L || !mapRef.current || mapInstanceRef.current) return;

        const defaultCenter: [number, number] = areas.length > 0
            ? [areas[0].center_lat, areas[0].center_lng]
            : [-5.089210, -42.801600];

        mapInstanceRef.current = L.map(mapRef.current).setView(defaultCenter, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(mapInstanceRef.current);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [L]);

    // Update circles and markers when areas change
    useEffect(() => {
        if (!L || !mapInstanceRef.current) return;

        const activeAreas = areas.filter(a => a.active);

        // Remove old circles
        circlesRef.current.forEach((circle, id) => {
            if (!activeAreas.find(a => a.id === id)) {
                circle.remove();
                circlesRef.current.delete(id);
            }
        });

        // Remove old markers
        markersRef.current.forEach((marker, id) => {
            marker.remove();
            markersRef.current.delete(id);
        });

        // Add/update circles and markers
        activeAreas.forEach(area => {
            const isSelected = area.id === selectedAreaId;
            const center: [number, number] = [area.center_lat, area.center_lng];

            // Circle
            let circle = circlesRef.current.get(area.id);
            if (circle) {
                circle.setLatLng(center);
                circle.setRadius(area.radius_meters);
                circle.setStyle({
                    color: isSelected ? '#673ab7' : '#9ca3af',
                    fillColor: isSelected ? '#673ab7' : '#9ca3af',
                    fillOpacity: 0.2
                });
            } else {
                circle = L.circle(center, {
                    radius: area.radius_meters,
                    color: isSelected ? '#673ab7' : '#9ca3af',
                    fillColor: isSelected ? '#673ab7' : '#9ca3af',
                    fillOpacity: 0.2
                }).addTo(mapInstanceRef.current);

                circle.on('click', () => onSelectArea(area.id));
                circlesRef.current.set(area.id, circle);
            }

            // Marker (only for selected)
            if (isSelected) {
                const marker = L.marker(center, { draggable: true })
                    .addTo(mapInstanceRef.current)
                    .bindPopup(`<b>${area.name}</b><br>Arraste para mover`);

                marker.on('dragend', (e: any) => {
                    const pos = e.target.getLatLng();
                    onAreaCenterChange(area.id, pos.lat, pos.lng);
                });

                markersRef.current.set(area.id, marker);
            }
        });

    }, [L, areas, selectedAreaId, onAreaCenterChange, onSelectArea]);

    // Pan to selected area
    useEffect(() => {
        if (!mapInstanceRef.current || !selectedAreaId) return;

        const area = areas.find(a => a.id === selectedAreaId);
        if (area) {
            mapInstanceRef.current.setView([area.center_lat, area.center_lng], 14);
        }
    }, [selectedAreaId, areas]);

    if (!L) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Carregando mapa...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full w-full relative">
            <div ref={mapRef} className="h-full w-full" />

            {/* Instructions overlay */}
            <div className="absolute top-4 right-4 z-[1000] bg-white p-3 rounded-lg shadow-lg max-w-xs">
                <p className="text-xs font-bold text-gray-600 mb-2">📍 Instruções</p>
                <ul className="text-xs text-gray-500 space-y-1">
                    <li>• Selecione uma área na lista à esquerda</li>
                    <li>• Arraste o marcador para mover o centro</li>
                    <li>• Ajuste raio e taxa nos cards</li>
                </ul>
            </div>
        </div>
    );
};

export default DeliveryMap;
