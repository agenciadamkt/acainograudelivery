import { MapContainer, TileLayer, Circle, Marker } from "react-leaflet";
import { LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { DeliveryArea } from "@/hooks/useDeliveryAreas";
import React from "react";

// Fix Leaflet marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

interface MapSectionProps {
    mapCenter: [number, number];
    deliveryAreas: DeliveryArea[];
    selectedAreaId: string | null;
    onUpdateArea: (id: string, field: keyof DeliveryArea, value: any) => void;
}

const MapSection = ({ mapCenter, deliveryAreas, selectedAreaId, onUpdateArea }: MapSectionProps) => {
    const activeAreas = deliveryAreas.filter(a => a.active);

    return (
        <div className="h-full w-full relative">
            <MapContainer
                center={mapCenter as LatLngTuple}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                key={`map-${mapCenter[0]}-${mapCenter[1]}`}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Delivery Areas Circles */}
                {activeAreas.map(area => {
                    const isSelected = selectedAreaId === area.id;
                    return (
                        <React.Fragment key={area.id}>
                            {/* Center Marker for Selected Area */}
                            {isSelected && (
                                <Marker
                                    position={[area.center_lat, area.center_lng] as LatLngTuple}
                                    draggable={true}
                                    eventHandlers={{
                                        dragend: (e) => {
                                            const marker = e.target;
                                            const position = marker.getLatLng();
                                            onUpdateArea(area.id, 'center_lat', position.lat);
                                            onUpdateArea(area.id, 'center_lng', position.lng);
                                        }
                                    }}
                                />
                            )}

                            <Circle
                                center={[area.center_lat, area.center_lng] as LatLngTuple}
                                radius={area.radius_meters}
                                pathOptions={{
                                    color: isSelected ? '#673ab7' : '#9ca3af',
                                    fillColor: isSelected ? '#673ab7' : '#9ca3af',
                                    fillOpacity: 0.2
                                }}
                            />
                        </React.Fragment>
                    );
                })}
            </MapContainer>

            {/* Map Controls Overlay */}
            <div className="absolute top-4 right-4 z-[400] bg-white p-3 rounded-lg shadow-lg">
                <p className="text-xs font-bold text-gray-500 mb-2">Instruções</p>
                <ul className="text-xs text-gray-600 space-y-1">
                    <li>1. Selecione uma área na lista</li>
                    <li>2. Arraste o marcador no mapa</li>
                    <li>3. Ajuste raio e taxa na lateral</li>
                </ul>
            </div>
        </div>
    );
};

export default MapSection;
