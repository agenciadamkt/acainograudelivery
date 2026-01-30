import { useState, useMemo } from 'react';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useDeliveryDrivers } from '@/hooks/useDeliveryDrivers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Truck, CheckCircle2, User, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import TrackingMap from './TrackingMap'; // We can reuse or create a specialized map

export default function RoutePlanner() {
    const { data: drivers } = useDeliveryDrivers();
    const { data: orders = [] } = useOrders();
    const updateOrderStatus = useUpdateOrderStatus();

    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

    // Filter Data
    const readyOrders = useMemo(() =>
        orders.filter(o => o.status === 'ready' && o.order_type === 'delivery'),
        [orders]);

    const availableDrivers = useMemo(() =>
        drivers?.filter(d => d.status === 'disponivel' && d.active) || [],
        [drivers]);

    // Actions
    const toggleOrderSelection = (orderId: string) => {
        const newSet = new Set(selectedOrderIds);
        if (newSet.has(orderId)) {
            newSet.delete(orderId);
        } else {
            newSet.add(orderId);
        }
        setSelectedOrderIds(newSet);
    };

    const handleDispatch = async () => {
        if (!selectedDriverId) {
            toast.error('Selecione um entregador!');
            return;
        }
        if (selectedOrderIds.size === 0) {
            toast.error('Selecione pelo menos um pedido!');
            return;
        }

        try {
            const promises = Array.from(selectedOrderIds).map(orderId =>
                updateOrderStatus.mutateAsync({
                    orderId,
                    status: 'out_for_delivery',
                    driverId: selectedDriverId
                })
            );

            await Promise.all(promises);

            toast.success(`${selectedOrderIds.size} pedidos despachados com sucesso!`);
            setSelectedOrderIds(new Set());
            setSelectedDriverId('');
        } catch (error) {
            console.error('Dispatch error:', error);
            toast.error('Erro ao despachar pedidos');
        }
    };

    // Prepare map data (Visualizing selected orders differently)
    const mapOrders = readyOrders.map(o => ({
        ...o,
        selected: selectedOrderIds.has(o.id) // We might need to extend TrackingMap to support 'selected' prop if we want visual feedback there, or just rely on Sidebar
    }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[700px]">
            {/* Sidebar Controls */}
            <Card className="lg:col-span-1 h-full flex flex-col">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Navigation className="w-5 h-5" />
                        Planejador de Rotas
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Selecione pedidos e atribua para um entregador otimizar a rota.
                    </p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">

                    {/* Step 1: Drivers */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">1. Selecione o Entregador</label>
                        <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Escolha um entregador disponível" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableDrivers.map(driver => (
                                    <SelectItem key={driver.id} value={driver.id}>
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-4 h-4" />
                                            <span>{driver.name}</span>
                                            <Badge variant="outline" className="ml-auto text-xs">
                                                {driver.vehicle_type || 'Moto'}
                                            </Badge>
                                        </div>
                                    </SelectItem>
                                ))}
                                {availableDrivers.length === 0 && (
                                    <div className="p-2 text-sm text-muted-foreground text-center">
                                        Nenhum entregador disponível
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Step 2: Orders List */}
                    <div className="flex-1 flex flex-col gap-2 min-h-0">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">2. Pedidos Prontos ({readyOrders.length})</label>
                            {selectedOrderIds.size > 0 && (
                                <Badge variant="secondary">{selectedOrderIds.size} selecionados</Badge>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                            {readyOrders.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/20">
                                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">Tudo entregue! Sem pedidos pendentes.</p>
                                </div>
                            ) : (
                                readyOrders.map(order => {
                                    const isSelected = selectedOrderIds.has(order.id);
                                    return (
                                        <div
                                            key={order.id}
                                            onClick={() => toggleOrderSelection(order.id)}
                                            className={`
                        cursor-pointer border rounded-lg p-3 transition-all hover:shadow-md
                        ${isSelected
                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                                    : 'border-border bg-card'
                                                }
                      `}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-sm">#{order.order_number}</span>
                                                <Badge variant={isSelected ? "default" : "outline"} className="text-xs">
                                                    {isSelected ? 'Selecionado' : 'Aguardando'}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <MapPin className="w-3 h-3" />
                                                <span className="truncate">
                                                    {order.delivery_address
                                                        ? `${order.delivery_address.neighborhood}, ${order.delivery_address.city}`
                                                        : 'Retirada na Loja'
                                                    }
                                                </span>
                                            </div>
                                            <div className="text-xs font-medium text-right mt-2 text-gray-600">
                                                {/* {(order as any).distance_km ? `${(order as any).distance_km} km` : ''} */}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4 border-t mt-auto">
                        <Button
                            className="w-full"
                            size="lg"
                            disabled={!selectedDriverId || selectedOrderIds.size === 0 || updateOrderStatus.isPending}
                            onClick={handleDispatch}
                        >
                            {updateOrderStatus.isPending ? 'Despachando...' : `Despachar Rota (${selectedOrderIds.size})`}
                        </Button>
                    </div>

                </CardContent>
            </Card>

            {/* Map Visualization */}
            <Card className="lg:col-span-2 overflow-hidden h-full">
                <TrackingMap
                    orders={readyOrders} // Show only Ready orders to plan
                    drivers={availableDrivers} // Show available drivers
                // We pass selectedIds implicitly? No, TrackingMap doesn't support selection highlight yet. 
                // For now, visualize markers. 
                />
                {/* Instruction Overlay */}
                <div className="absolute top-4 right-4 bg-white/90 p-2 rounded shadow text-xs z-[500] backdrop-blur">
                    <p><strong>Mapa de Planejamento</strong></p>
                    <p>🔴 Pedidos Prontos</p>
                    <p>🚚 Entregadores Disponíveis</p>
                </div>
            </Card>
        </div>
    );
}
