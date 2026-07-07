import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDeliveryAreas, DeliveryArea } from "@/hooks/useDeliveryAreas";
import { MapPin, Plus, Trash2, Navigation, Map, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import DeliveryMap from "./DeliveryMap";

async function nominatimSearch(q: string): Promise<[number, number] | null> {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=br`,
            { headers: { 'User-Agent': 'AcaiNoGrauAdminApp/1.0' } }
        );
        const data = await res.json();
        if (data?.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    } catch { /* ignore */ }
    return null;
}

// Geocode the store address with multiple fallbacks
async function geocodeStoreAddress(store: any): Promise<{ coords: [number, number]; source: string } | null> {
    const address = store?.address || store?.logradouro || '';
    const number  = store?.address_number || store?.numero || '';
    const neighborhood = store?.neighborhood || store?.bairro || '';
    const city    = store?.city || store?.cidade || '';
    const state   = store?.state || store?.uf || '';

    if (!city || !state) return null;

    // Try full address
    if (address) {
        const full = `${address}${number ? ', ' + number : ''}${neighborhood ? ', ' + neighborhood : ''}, ${city}, ${state}`;
        const r = await nominatimSearch(full);
        if (r) return { coords: r, source: full };

        // Try without number
        const partial = `${address}${neighborhood ? ', ' + neighborhood : ''}, ${city}, ${state}`;
        const r2 = await nominatimSearch(partial);
        if (r2) return { coords: r2, source: partial };
    }

    // Fallback: city + state only
    const r3 = await nominatimSearch(`${city}, ${state}`);
    if (r3) return { coords: r3, source: `${city}, ${state} (aproximado)` };

    return null;
}

const DeliveryAreasPage = () => {
    const navigate = useNavigate();
    const { currentStore, isLoading: storeLoading } = useStore();
    const { deliveryAreas, isLoading, createArea, updateArea, deleteArea } = useDeliveryAreas(currentStore?.id);

    const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
    const [showMap, setShowMap] = useState(true);

    // Local draft values for inputs — prevents saving on every keystroke
    const [draftValues, setDraftValues] = useState<Record<string, { radius: string; fee: string }>>({});

    // Sync drafts when areas load
    useEffect(() => {
        if (deliveryAreas) {
            const initial: Record<string, { radius: string; fee: string }> = {};
            deliveryAreas.forEach(a => {
                if (!draftValues[a.id]) {
                    initial[a.id] = {
                        radius: String(a.radius_meters),
                        fee: String(a.fee),
                    };
                }
            });
            if (Object.keys(initial).length > 0) {
                setDraftValues(prev => ({ ...prev, ...initial }));
            }
        }
    }, [deliveryAreas]);

    useEffect(() => {
        if (deliveryAreas && deliveryAreas.length > 0 && !selectedAreaId) {
            setSelectedAreaId(deliveryAreas[0].id);
        }
    }, [deliveryAreas]);

    const [isSyncing, setIsSyncing] = useState(false);

    const handleSyncCentersFromStore = async () => {
        if (!currentStore || !deliveryAreas || deliveryAreas.length === 0) return;
        setIsSyncing(true);
        try {
            const result = await geocodeStoreAddress(currentStore);

            let lat: number;
            let lng: number;
            let sourceMsg: string;

            if (result) {
                [lat, lng] = result.coords;
                sourceMsg = result.source;
            } else {
                // Campos faltando — tentar GPS do navegador como último recurso
                const missing = [];
                if (!currentStore.city) missing.push('Cidade');
                if (!currentStore.state) missing.push('Estado');
                if (!currentStore.address) missing.push('Endereço');

                if (missing.length > 0) {
                    toast.error(`Campos obrigatórios não preenchidos em admin/settings: ${missing.join(', ')}. Preenchendo pelo GPS do seu dispositivo como alternativa.`);
                }

                const gpsCoords = await new Promise<GeolocationCoordinates | null>((resolve) => {
                    if (!navigator.geolocation) { resolve(null); return; }
                    navigator.geolocation.getCurrentPosition(
                        (pos) => resolve(pos.coords),
                        () => resolve(null),
                        { timeout: 8000 }
                    );
                });

                if (!gpsCoords) {
                    toast.error('Não foi possível geocodificar o endereço nem obter GPS. Preencha Cidade e Estado em admin/settings.');
                    return;
                }

                lat = gpsCoords.latitude;
                lng = gpsCoords.longitude;
                sourceMsg = 'GPS do dispositivo';
                toast.info(`Usando coordenadas do GPS (${lat.toFixed(5)}, ${lng.toFixed(5)}) como centro.`);
            }

            await Promise.all(
                deliveryAreas.map(area =>
                    updateArea.mutateAsync({ id: area.id, center_lat: lat, center_lng: lng })
                )
            );
            toast.success(`${deliveryAreas.length} área(s) sincronizada(s)! Fonte: ${sourceMsg}`);
        } catch {
            toast.error('Erro ao sincronizar áreas.');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleCreateArea = async () => {
        if (!currentStore) return;

        // Try store address first, then fall back to browser GPS
        let lat = -5.089210;
        let lng = -42.801600;

        const storeResult = await geocodeStoreAddress(currentStore);
        if (storeResult) {
            [lat, lng] = storeResult.coords;
        } else if (navigator.geolocation) {
            await new Promise<void>((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => { lat = pos.coords.latitude; lng = pos.coords.longitude; resolve(); },
                    () => resolve()
                );
            });
        }

        createArea.mutate({
            store_id: currentStore.id,
            name: `Nova Área ${(deliveryAreas?.length || 0) + 1}`,
            radius_meters: 1000,
            fee: 5.00,
            active: true,
            center_lat: lat,
            center_lng: lng,
        });
    };

    // Commit to DB only on blur — avoids race conditions from per-keystroke saves
    const handleRadiusBlur = (id: string) => {
        const val = Number(draftValues[id]?.radius);
        if (!isNaN(val) && val > 0) {
            updateArea.mutate({ id, radius_meters: val });
        }
    };

    const handleFeeBlur = (id: string) => {
        const val = Number(draftValues[id]?.fee);
        if (!isNaN(val) && val >= 0) {
            updateArea.mutate({ id, fee: val });
        }
    };

    const handleUpdateArea = (id: string, field: keyof DeliveryArea, value: any) => {
        updateArea.mutate({ id, [field]: value });
    };

    const handleDeleteArea = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta área?')) {
            deleteArea.mutate(id);
            setDraftValues(prev => { const next = { ...prev }; delete next[id]; return next; });
            if (selectedAreaId === id) {
                setSelectedAreaId(deliveryAreas && deliveryAreas.length > 1 ? deliveryAreas[0].id : null);
            }
        }
    };

    const handleAreaCenterChange = (areaId: string, lat: number, lng: number) => {
        updateArea.mutate({ id: areaId, center_lat: lat, center_lng: lng });
    };

    const useMyLocation = async (areaId: string) => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
            (pos) => updateArea.mutate({ id: areaId, center_lat: pos.coords.latitude, center_lng: pos.coords.longitude }),
            () => {}
        );
    };

    if (storeLoading || isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
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
                    <p className="text-gray-500">Configure taxas de entrega por região. O centro de cada área deve ser a localização da loja.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowMap(!showMap)}>
                        <Map className="w-4 h-4 mr-2" />
                        {showMap ? 'Ocultar Mapa' : 'Mostrar Mapa'}
                    </Button>
                    {deliveryAreas && deliveryAreas.length > 0 && (
                        <Button variant="outline" size="sm" onClick={handleSyncCentersFromStore} disabled={isSyncing} title="Atualiza o centro de todas as áreas com o endereço cadastrado em admin/settings">
                            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? 'Sincronizando...' : 'Sincronizar Endereço da Loja'}
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => navigate('/admin/settings')}>Voltar</Button>
                    <Button onClick={handleCreateArea} disabled={createArea.isPending}>
                        <Plus className="w-4 h-4 mr-2" />
                        {createArea.isPending ? 'Criando...' : 'Nova Área'}
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Areas List */}
                <div className={`${showMap ? 'w-[420px]' : 'flex-1'} border-r bg-white flex flex-col overflow-y-auto`}>
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
                                    className={`transition-all cursor-pointer ${
                                        selectedAreaId === area.id ? 'ring-2 ring-primary border-primary' : 'hover:border-gray-300'
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
                                                <Label className="text-xs text-gray-500">Raio (metros)</Label>
                                                <div className="flex items-center gap-1">
                                                    <Input
                                                        type="number"
                                                        value={draftValues[area.id]?.radius ?? area.radius_meters}
                                                        onChange={(e) => setDraftValues(prev => ({
                                                            ...prev,
                                                            [area.id]: { ...prev[area.id], radius: e.target.value }
                                                        }))}
                                                        onBlur={() => handleRadiusBlur(area.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-sm"
                                                    />
                                                    <span className="text-xs text-gray-400 flex-shrink-0">m</span>
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-500">Taxa de entrega</Label>
                                                <div className="relative">
                                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">R$</span>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={draftValues[area.id]?.fee ?? area.fee}
                                                        onChange={(e) => setDraftValues(prev => ({
                                                            ...prev,
                                                            [area.id]: { ...prev[area.id], fee: e.target.value }
                                                        }))}
                                                        onBlur={() => handleFeeBlur(area.id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="pl-8 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-xs text-gray-400">
                                                {(area.radius_meters / 1000).toFixed(1)} km de raio
                                            </span>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => { e.stopPropagation(); useMyLocation(area.id); }}
                                                    className="h-7 text-xs px-2"
                                                    title="Usar minha localização atual como centro desta área"
                                                >
                                                    <Navigation className="w-3 h-3 mr-1" />
                                                    Meu GPS
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

                                        {/* Center coordinates — editable, paste from Google Maps */}
                                        <div className="border-t pt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                                            <Label className="text-xs text-gray-500 flex items-center gap-1">
                                                Centro da área (cole do Google Maps)
                                                {(!area.center_lat || !area.center_lng || area.center_lat === 0 || area.center_lng === 0) && (
                                                    <span className="text-red-500 font-bold">⚠ inválido</span>
                                                )}
                                            </Label>
                                            <div className="grid grid-cols-2 gap-1">
                                                <Input
                                                    type="number"
                                                    step="0.000001"
                                                    placeholder="Latitude ex: -5.08921"
                                                    defaultValue={area.center_lat || ''}
                                                    onBlur={(e) => {
                                                        const v = parseFloat(e.target.value);
                                                        if (!isNaN(v)) handleUpdateArea(area.id, 'center_lat', v);
                                                    }}
                                                    className="text-xs h-7"
                                                />
                                                <Input
                                                    type="number"
                                                    step="0.000001"
                                                    placeholder="Longitude ex: -42.80160"
                                                    defaultValue={area.center_lng || ''}
                                                    onBlur={(e) => {
                                                        const v = parseFloat(e.target.value);
                                                        if (!isNaN(v)) handleUpdateArea(area.id, 'center_lng', v);
                                                    }}
                                                    className="text-xs h-7"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-xs">
                                <p className="font-medium text-amber-900 mb-1">⚠️ Importante</p>
                                <p className="text-amber-700">
                                    O <strong>centro de cada área</strong> deve ser a localização da loja. Use o botão <strong>Meu GPS</strong> estando na loja, ou arraste o marcador no mapa. Áreas com centro incorreto não calculam o frete corretamente.
                                </p>
                            </div>

                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs">
                                <p className="font-medium text-blue-900 mb-1">💡 Como funciona</p>
                                <p className="text-blue-700">Áreas menores têm prioridade. Ex: raio 1km (R$3) dentro de raio 3km (R$8) — clientes até 1km pagam R$3.</p>
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
