import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MapPin, Navigation, Package, Power, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Order {
    id: string;
    order_number: string;
    customer: { name: string; phone: string };
    delivery_address: {
        street: string;
        number: string;
        neighborhood: string;
        city: string;
        zipcode: string;
        latitude?: number;
        longitude?: number;
    };
    total_amount: number;
    status: string;
    created_at: string;
}

export default function DriverDashboard() {
    const navigate = useNavigate();
    const [driverId, setDriverId] = useState<string | null>(null);
    const [driverName, setDriverName] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [locationError, setLocationError] = useState<string | null>(null);
    const audioRef = useState(new Audio('https://github.com/rafaelreis-hotmart/audio-assets/raw/main/notification_simple_02.mp3'))[0];
    const [previousOrderCount, setPreviousOrderCount] = useState(0);

    // Load Driver Info
    useEffect(() => {
        const id = localStorage.getItem('driver_id');
        const name = localStorage.getItem('driver_name');

        if (!id) {
            navigate('/driver/login');
            return;
        }

        setDriverId(id);
        setDriverName(name);

        // Initial fetch of driver status
        supabase
            .from('delivery_drivers' as any)
            .select('status')
            .eq('id', id)
            .single()
            .then(({ data }) => {
                if (data && data.status !== 'offline') {
                    setIsOnline(true);
                }
            });

    }, [navigate]);

    // GPS Tracking Logic
    useEffect(() => {
        let watchId: number;

        if (isOnline && driverId) {
            if (!navigator.geolocation) {
                setLocationError('Geolocalização não suportada');
                return;
            }

            watchId = navigator.geolocation.watchPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    // Update DB
                    await supabase
                        .from('delivery_drivers' as any)
                        .update({
                            current_location: { lat: latitude, lng: longitude, timestamp: Date.now() },
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', driverId);
                },
                (error) => {
                    console.error('GPS Error:', error);
                    setLocationError('Erro ao obter localização');
                },
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
            );
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [isOnline, driverId]);

    // Fetch Assigned Orders
    const fetchOrders = async () => {
        if (!driverId) return;

        // We assume orders table has driver_id or we check delivery_tracking?
        // Based on previous steps, useOrders hook had driver_id update logic.
        // Let's assume 'orders' table has 'driver_id'.

        const { data, error } = await supabase
            .from('orders')
            .select(`
        id, order_number, total_amount, status, created_at,
        customer:customers(name, phone),
        delivery_address:customer_addresses(*)
      `)
            .eq('driver_id', driverId)
            .in('status', ['ready', 'out_for_delivery'])
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching orders:', error);
        } else {
            const fetchedOrders = data as any || [];
            if (fetchedOrders.length > previousOrderCount) {
                const hasReadyOrders = fetchedOrders.some((o: Order) => o.status === 'ready');
                if (hasReadyOrders) {
                    audioRef.play().catch(e => console.log('Audio play failed (interaction required):', e));
                    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
                    toast.info('Nova entrega disponível!');
                }
            }
            setOrders(fetchedOrders);
            setPreviousOrderCount(fetchedOrders.length);
        }
    };

    useEffect(() => {
        fetchOrders();

        // Subscribe to new orders
        const channel = supabase
            .channel('driver-orders-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders', filter: `driver_id=eq.${driverId}` },
                () => fetchOrders()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [driverId]);

    // Actions
    const toggleStatus = async () => {
        if (!driverId) return;

        const newStatus = !isOnline;
        const statusText = newStatus ? 'disponivel' : 'offline';

        const { error } = await supabase
            .from('delivery_drivers' as any)
            .update({ status: statusText })
            .eq('id', driverId);

        if (!error) {
            setIsOnline(newStatus);
            toast.success(newStatus ? 'Você está Online!' : 'Você está Offline');
        }
    };

    const updateOrderStatus = async (orderId: string, newStatus: string) => {
        const { error } = await supabase
            .from('orders')
            .update({
                status: newStatus,
                ...(newStatus === 'delivered' ? { delivered_at: new Date().toISOString(), payment_status: 'paid' } : {})
            })
            .eq('id', orderId);

        if (error) {
            toast.error('Erro ao atualizar status');
        } else {
            toast.success('Status atualizado!');
            fetchOrders();
        }
    };

    const openMap = (address: any) => {
        if (!address) return;

        let query = '';
        if (address.latitude && address.longitude) {
            query = `${address.latitude},${address.longitude}`;
        } else {
            const parts = [
                address.street,
                address.number,
                address.neighborhood,
                address.city,
                address.state
            ].filter(Boolean);

            if (parts.length > 0) {
                query = parts.join(', ');
            } else if (address.address) {
                // Fallback if there is a single address string field
                query = address.address;
            }
        }

        if (query) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
        } else {
            toast.error('Endereço inválido para abrir o mapa');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 pb-20">
            {/* Header */}
            <div className="bg-primary p-4 text-white shadow-lg sticky top-0 z-10">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="font-bold text-lg">Olá, {driverName}</h1>
                        <p className="text-xs opacity-90">{isOnline ? '🟢 Online e Rastreado' : '🔴 Offline'}</p>
                    </div>
                    <Button
                        variant={isOnline ? "destructive" : "secondary"}
                        size="sm"
                        onClick={toggleStatus}
                    >
                        <Power className="w-4 h-4 mr-2" />
                        {isOnline ? 'Sair' : 'Entrar'}
                    </Button>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {locationError && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                        <strong className="font-bold">Erro GPS:</strong>
                        <span className="block sm:inline"> {locationError}</span>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-700">Minhas Entregas ({orders.length})</h2>
                    <Button variant="ghost" size="sm" onClick={fetchOrders}><RefreshCw className="w-4 h-4" /></Button>
                </div>

                {orders.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-muted-foreground">
                            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>Nenhuma entrega pendente.</p>
                            {isOnline && <p className="text-xs mt-2 animate-pulse text-primary">Aguardando pedidos...</p>}
                        </CardContent>
                    </Card>
                ) : (
                    orders.map(order => (
                        <Card key={order.id} className="shadow-md border-l-4 border-l-primary overflow-hidden">
                            <CardHeader className="bg-white pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">#{order.order_number}</CardTitle>
                                        <p className="text-sm text-gray-500">{format(new Date(order.created_at), "HH:mm", { locale: ptBR })}</p>
                                    </div>
                                    <Badge className={order.status === 'out_for_delivery' ? 'bg-blue-500' : 'bg-green-500'}>
                                        {order.status === 'out_for_delivery' ? 'Em Rota' : 'Pronto'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-2">
                                <div className="space-y-3">
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-semibold">{order.customer?.name}</p>
                                            {order.delivery_address ? (
                                                <>
                                                    <p>
                                                        {order.delivery_address.street ? (
                                                            `${order.delivery_address.street}, ${order.delivery_address.number || 'S/N'}`
                                                        ) : (
                                                            <span className="italic text-gray-400">Rua não informada</span>
                                                        )}
                                                    </p>
                                                    <p className="text-gray-500">
                                                        {order.delivery_address.neighborhood || ''}
                                                        {order.delivery_address.city ? ` - ${order.delivery_address.city}` : ''}
                                                    </p>
                                                </>
                                            ) : (
                                                <p className="text-red-500">Endereço de entrega não encontrado</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => openMap(order.delivery_address)}
                                        >
                                            <Navigation className="w-4 h-4 mr-2" />
                                            Mapa
                                        </Button>

                                        {order.status === 'ready' && (
                                            <Button
                                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                                onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                                            >
                                                Iniciar Rota
                                            </Button>
                                        )}

                                        {order.status === 'out_for_delivery' && (
                                            <Button
                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                                            >
                                                Entregue
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
