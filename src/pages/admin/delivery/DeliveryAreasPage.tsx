import { useNavigate } from "react-router-dom";
import { useEffect, useState, lazy, Suspense } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDeliveryAreas, DeliveryArea } from "@/hooks/useDeliveryAreas";
import { MapPin, Plus, Trash2, Navigation, Map } from "lucide-react";
import DeliveryMap from "./DeliveryMap";

const DeliveryAreasPage = () => {
    const navigate = useNavigate();
    const { currentStore, isLoading: storeLoading } = useStore();
    const { deliveryAreas, isLoading, createArea, updateArea, deleteArea } = useDeliveryAreas(currentStore?.id);

    const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
    const [showMap, setShowMap] = useState(true);

    // Select first area when areas load
    useEffect(() => {
        if (deliveryAreas && deliveryAreas.length > 0 && !selectedAreaId) {
            setSelectedAreaId(deliveryAreas[0].id);
        }
    }, [deliveryAreas]);

    // Get user's current location for new areas
    const getCurrentLocation = (): Promise<[number, number]> => {
        return new Promise((resolve) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => resolve([position.coords.latitude, position.coords.longitude]),
                    () => resolve([-5.089210, -42.801600])
                );
            } else {
                resolve([-5.089210, -42.801600]);
            }
        });
    };

    const handleCreateArea = async () => {
        if (!currentStore) return;

        const [lat, lng] = await getCurrentLocation();

        createArea.mutate({
            store_id: currentStore.id,
            name: `Nova Área ${(deliveryAreas?.length || 0) + 1}`,
            radius_meters: 1000,
            fee: 5.00,
            active: true,
            center_lat: lat,
            center_lng: lng
        });
    };

    const handleUpdateArea = (id: string, field: keyof DeliveryArea, value: any) => {
        updateArea.mutate({ id, [field]: value });
    };

    const handleDeleteArea = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta área?')) {
            deleteArea.mutate(id);
            if (selectedAreaId === id) {
                setSelectedAreaId(deliveryAreas && deliveryAreas.length > 1 ? deliveryAreas[0].id : null);
            }
        }
    };

    const handleAreaCenterChange = (areaId: string, lat: number, lng: number) => {
        updateArea.mutate({ id: areaId, center_lat: lat, center_lng: lng });
    };

    const useMyLocation = async (areaId: string) => {
        const [lat, lng] = await getCurrentLocation();
        handleUpdateArea(areaId, 'center_lat', lat);
        handleUpdateArea(areaId, 'center_lng', lng);
    };

    if (storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Carregando...</p>
                </div>
            </div>
        );
    }

    if (!currentStore) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center p-8">
                    <p className="mb-4 text-gray-600">Selecione uma loja primeiro.</p>
                    <Button onClick={() => navigate('/admin/dashboard')}>Ir para o Dashboard</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="border-b bg-white p-4 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Áreas de Entrega</h1>
                    <p className="text-gray-500">Configure taxas de entrega por região.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMap(!showMap)}
                    >
                        <Map className="w-4 h-4 mr-2" />
                        {showMap ? 'Ocultar Mapa' : 'Mostrar Mapa'}
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/admin/settings')}>Voltar</Button>
                    <Button onClick={handleCreateArea} disabled={createArea.isPending}>
                        <Plus className="w-4 h-4 mr-2" />
                        {createArea.isPending ? 'Criando...' : 'Nova Área'}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Areas List */}
                <div className={`${showMap ? 'w-[400px]' : 'flex-1'} border-r bg-white flex flex-col overflow-y-auto`}>
                    {(!deliveryAreas || deliveryAreas.length === 0) ? (
                        <div className="text-center py-16 px-4">
                            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma área configurada</h3>
                            <p className="text-gray-500 mb-6 text-sm">Configure áreas de entrega para definir taxas por distância.</p>
                            <Button onClick={handleCreateArea} size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Criar Primeira Área
                            </Button>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            {deliveryAreas.map(area => (
                                <Card
                                    key={area.id}
                                    className={`transition-all cursor-pointer ${selectedAreaId === area.id
                                            ? 'ring-2 ring-primary border-primary'
                                            : 'hover:border-gray-300'
                                        } ${!area.active ? 'opacity-60' : ''}`}
                                    onClick={() => setSelectedAreaId(area.id)}
                                >
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-1">
                                                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                                                <Input
                                                    value={area.name}
                                                    onChange={(e) => handleUpdateArea(area.id, 'name', e.target.value)}
                                                    className="border-none px-0 h-auto text-base font-semibold focus-visible:ring-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <Switch
                                                checked={area.active}
                                                onCheckedChange={(checked) => handleUpdateArea(area.id, 'active', checked)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <Label className="text-xs text-gray-500">Raio</Label>
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        value={area.radius_meters}
                                                        onChange={(e) => handleUpdateArea(area.id, 'radius_meters', Number(e.target.value))}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-sm"
                                                    />
                                                    <span className="text-xs text-gray-400">m</span>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-500">Taxa</Label>
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={area.fee}
                                                        onChange={(e) => handleUpdateArea(area.id, 'fee', Number(e.target.value))}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="pl-8 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-xs text-gray-400">
                                                {(area.radius_meters / 1000).toFixed(1)} km
                                            </span>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); useMyLocation(area.id); }}
                                                    className="h-7 text-xs px-2"
                                                >
                                                    <Navigation className="w-3 h-3 mr-1" />
                                                    GPS
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 px-2"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteArea(area.id); }}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs">
                                <p className="font-medium text-blue-900 mb-1">💡 Dica</p>
                                <p className="text-blue-700">Áreas menores têm prioridade sobre maiores quando o cliente está em múltiplas zonas.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Map */}
                {showMap && (
                    <div className="flex-1 relative bg-gray-100">
                        <DeliveryMap
                            areas={deliveryAreas || []}
                            selectedAreaId={selectedAreaId}
                            onAreaCenterChange={handleAreaCenterChange}
                            onSelectArea={setSelectedAreaId}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeliveryAreasPage;
