import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    MapPin, Navigation, Package, Power, RefreshCw, Phone,
    MessageCircle, Store, User, Clock, DollarSign, CheckCircle,
    FileText, Calendar, Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Order {
    id: string;
    order_number: string;
    customer: { name: string; phone: string };
    delivery_address: {
        street: string;
        number: string;
        complement?: string;
        neighborhood: string;
        city: string;
        zipcode: string;
        latitude?: number;
        longitude?: number;
    };
    total_amount: number;
    delivery_fee: number;
    status: string;
    payment_status: string;
    payment_method: string;
    created_at: string;
    delivered_at?: string;
    estimated_delivery_time?: number;
    store: {
        id: string;
        name: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        zipcode: string;
    };
}

export default function DriverDashboard() {
    const navigate = useNavigate();
    const [driverId, setDriverId] = useState<string | null>(null);
    const [driverName, setDriverName] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [orders, setOrders] = useState<Order[]>([]);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('deliveries');

    // Report filters
    const [reportStartDate, setReportStartDate] = useState('');
    const [reportEndDate, setReportEndDate] = useState('');
    const [reportStatus, setReportStatus] = useState('all');
    const [reportOrders, setReportOrders] = useState<Order[]>([]);
    const [isLoadingReport, setIsLoadingReport] = useState(false);

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

        // Set default report dates
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        setReportStartDate(format(firstDayOfMonth, 'yyyy-MM-dd'));
        setReportEndDate(format(today, 'yyyy-MM-dd'));
    }, [navigate]);

    // GPS Tracking Logic
    useEffect(() => {
        let watchId: number;
        let lastUpdateTime = 0;

        if (isOnline && driverId) {
            if (!navigator.geolocation) {
                setLocationError('Geolocalização não suportada neste dispositivo');
                return;
            }

            navigator.geolocation.getCurrentPosition(
                () => setLocationError(null),
                (err) => {
                    if (err.code === 1) {
                        setLocationError('Permissão de localização negada. Ative nas configurações.');
                    }
                }
            );

            watchId = navigator.geolocation.watchPosition(
                async (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    const now = Date.now();

                    if (now - lastUpdateTime < 2000) return;
                    lastUpdateTime = now;

                    setLocationError(null);

                    try {
                        await supabase
                            .from('delivery_drivers' as any)
                            .update({
                                current_location: {
                                    lat: latitude,
                                    lng: longitude,
                                    accuracy: accuracy,
                                    timestamp: now
                                },
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', driverId);
                    } catch (e) {
                        console.error('GPS Network Error:', e);
                    }
                },
                (error) => {
                    switch (error.code) {
                        case 1:
                            setLocationError('Permissão de localização negada');
                            break;
                        case 2:
                            setLocationError('Localização indisponível');
                            break;
                        case 3:
                            setLocationError('Tempo esgotado ao obter localização');
                            break;
                        default:
                            setLocationError('Erro ao obter localização');
                    }
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        }

        return () => {
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [isOnline, driverId]);

    // Fetch Assigned Orders
    const fetchOrders = async () => {
        if (!driverId) return;

        const { data, error } = await supabase
            .from('orders')
            .select(`
                id, order_number, total_amount, delivery_fee, status, payment_status, payment_method,
                created_at, delivered_at, estimated_delivery_time,
                customer:customers(name, phone),
                delivery_address:customer_addresses(*),
                store:stores(id, name, phone, address, city, state, zipcode)
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
                    audioRef.play().catch(e => console.log('Audio play failed:', e));
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

    // Fetch Report Orders
    const fetchReportOrders = async () => {
        if (!driverId) return;
        setIsLoadingReport(true);

        let query = supabase
            .from('orders')
            .select(`
                id, order_number, total_amount, delivery_fee, status, payment_status, payment_method,
                created_at, delivered_at,
                customer:customers(name, phone),
                store:stores(id, name)
            `)
            .eq('driver_id', driverId);

        if (reportStartDate) {
            query = query.gte('created_at', `${reportStartDate}T00:00:00`);
        }
        if (reportEndDate) {
            query = query.lte('created_at', `${reportEndDate}T23:59:59`);
        }
        if (reportStatus !== 'all') {
            query = query.eq('status', reportStatus);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
            toast.error('Erro ao buscar relatório');
        } else {
            setReportOrders(data as any || []);
        }
        setIsLoadingReport(false);
    };

    // Actions
    const toggleStatus = async () => {
        if (!driverId) {
            toast.error("Erro: Driver ID não encontrado. Faça login novamente.");
            return;
        }

        const newStatus = !isOnline;
        const statusText = newStatus ? 'disponivel' : 'offline';

        try {
            const { error } = await supabase
                .from('delivery_drivers' as any)
                .update({ status: statusText })
                .eq('id', driverId);

            if (error) {
                toast.error(`Erro ao atualizar: ${error.message}`);
                return;
            }

            setIsOnline(newStatus);
            toast.success(newStatus ? 'Você está Online!' : 'Você está Offline');

            if (newStatus) {
                audioRef.play().then(() => {
                    audioRef.pause();
                    audioRef.currentTime = 0;
                }).catch(e => console.log('Audio unlock failed:', e));
            }
        } catch (err: any) {
            toast.error(`Erro inesperado: ${err.message}`);
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
            toast.success(newStatus === 'delivered' ? '✅ Entrega concluída!' : 'Status atualizado!');
            fetchOrders();
        }
    };

    const openMap = (address: any) => {
        if (!address) return;

        if (address.latitude && address.longitude) {
            window.open(`https://waze.com/ul?ll=${address.latitude},${address.longitude}&navigate=yes`, '_blank');
            return;
        }

        const parts = [address.street, address.number, address.neighborhood, address.city, address.state].filter(Boolean);
        if (parts.length > 0) {
            window.open(`https://waze.com/ul?q=${encodeURIComponent(parts.join(', '))}&navigate=yes`, '_blank');
        } else {
            toast.error('Endereço inválido para abrir o mapa');
        }
    };

    const openWhatsApp = (phone: string, orderNumber: string, type: 'store' | 'customer') => {
        const cleanPhone = phone?.replace(/\D/g, '') || '';
        const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const message = encodeURIComponent(`Olá, sou o entregador do pedido #${orderNumber}`);
        window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
    };

    const formatAddress = (addr: any) => {
        if (!addr) return 'Endereço não informado';
        const parts = [
            addr.street,
            addr.number ? `nº ${addr.number}` : null,
            addr.complement,
            addr.neighborhood,
            addr.city,
            addr.zipcode ? `CEP: ${addr.zipcode}` : null
        ].filter(Boolean);
        return parts.join(', ');
    };

    const getPaymentStatusBadge = (order: Order) => {
        if (order.payment_status === 'paid') {
            return <Badge className="bg-green-500">✅ Já pago</Badge>;
        }
        return <Badge className="bg-yellow-500">💰 A receber</Badge>;
    };

    // Report calculations
    const reportTotalDeliveries = reportOrders.length;
    const reportTotalFees = reportOrders.reduce((sum, o) => sum + (o.delivery_fee || 0), 0);
    const reportDeliveredCount = reportOrders.filter(o => o.status === 'delivered').length;

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

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-center bg-white border-b sticky top-16 z-10">
                    <TabsTrigger value="deliveries" className="flex-1">
                        <Package className="w-4 h-4 mr-2" />
                        Entregas
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="flex-1">
                        <FileText className="w-4 h-4 mr-2" />
                        Relatórios
                    </TabsTrigger>
                </TabsList>

                {/* Deliveries Tab */}
                <TabsContent value="deliveries" className="p-4 space-y-4">
                    {locationError && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            <strong>Erro GPS:</strong> {locationError}
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-gray-700">Minhas Entregas ({orders.length})</h2>
                        <Button variant="ghost" size="sm" onClick={fetchOrders}>
                            <RefreshCw className="w-4 h-4" />
                        </Button>
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
                                            <CardTitle className="text-xl font-bold text-primary">#{order.order_number}</CardTitle>
                                            <p className="text-sm text-gray-500">
                                                {format(new Date(order.created_at), "dd/MM • HH:mm", { locale: ptBR })}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <Badge className={order.status === 'out_for_delivery' ? 'bg-blue-500' : 'bg-green-500'}>
                                                {order.status === 'out_for_delivery' ? '🚗 Em Rota' : '📦 Pronto'}
                                            </Badge>
                                            {getPaymentStatusBadge(order)}
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-2 space-y-4">
                                    {/* Coletar em (Store) */}
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Store className="w-5 h-5 text-blue-600" />
                                            <span className="font-semibold text-blue-800">COLETAR EM:</span>
                                        </div>
                                        <p className="font-medium">{order.store?.name || 'Loja'}</p>
                                        <p className="text-sm text-gray-600">
                                            {order.store?.address ? `${order.store.address}, ${order.store.city} - ${order.store.state}` : 'Endereço não informado'}
                                            {order.store?.zipcode && ` • CEP: ${order.store.zipcode}`}
                                        </p>
                                        {order.store?.phone && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-2 text-blue-600 border-blue-300"
                                                onClick={() => openWhatsApp(order.store.phone, order.order_number, 'store')}
                                            >
                                                <MessageCircle className="w-4 h-4 mr-2" />
                                                WhatsApp da Loja
                                            </Button>
                                        )}
                                    </div>

                                    {/* Entregar em (Customer) */}
                                    <div className="bg-green-50 p-3 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <MapPin className="w-5 h-5 text-green-600" />
                                            <span className="font-semibold text-green-800">ENTREGAR EM:</span>
                                        </div>
                                        <p className="font-medium flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            {order.customer?.name || 'Cliente'}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {formatAddress(order.delivery_address)}
                                        </p>
                                        {order.customer?.phone && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-2 text-green-600 border-green-300"
                                                onClick={() => openWhatsApp(order.customer.phone, order.order_number, 'customer')}
                                            >
                                                <MessageCircle className="w-4 h-4 mr-2" />
                                                WhatsApp do Cliente
                                            </Button>
                                        )}
                                    </div>

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gray-50 p-2 rounded flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-gray-500" />
                                            <div>
                                                <p className="text-xs text-gray-500">Tempo estimado</p>
                                                <p className="font-medium">{order.estimated_delivery_time || 30} min</p>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-2 rounded flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-gray-500" />
                                            <div>
                                                <p className="text-xs text-gray-500">Taxa entrega</p>
                                                <p className="font-medium text-green-600">
                                                    R$ {(order.delivery_fee || 0).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1"
                                            onClick={() => openMap(order.delivery_address)}
                                        >
                                            <Navigation className="w-4 h-4 mr-2" />
                                            Abrir Mapa
                                        </Button>

                                        {order.status === 'ready' && (
                                            <Button
                                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                                onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                                            >
                                                🚗 Iniciar Rota
                                            </Button>
                                        )}

                                        {order.status === 'out_for_delivery' && (
                                            <Button
                                                className="flex-1 bg-green-600 hover:bg-green-700"
                                                onClick={() => updateOrderStatus(order.id, 'delivered')}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Entregue
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </TabsContent>

                {/* Reports Tab */}
                <TabsContent value="reports" className="p-4 space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Filter className="w-5 h-5" />
                                Filtros
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="startDate">Data Início</Label>
                                    <Input
                                        id="startDate"
                                        type="date"
                                        value={reportStartDate}
                                        onChange={(e) => setReportStartDate(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="endDate">Data Fim</Label>
                                    <Input
                                        id="endDate"
                                        type="date"
                                        value={reportEndDate}
                                        onChange={(e) => setReportEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Situação</Label>
                                <Select value={reportStatus} onValueChange={setReportStatus}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas</SelectItem>
                                        <SelectItem value="delivered">Entregues</SelectItem>
                                        <SelectItem value="ready">Prontos</SelectItem>
                                        <SelectItem value="out_for_delivery">Em Rota</SelectItem>
                                        <SelectItem value="cancelled">Cancelados</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="w-full" onClick={fetchReportOrders} disabled={isLoadingReport}>
                                {isLoadingReport ? 'Buscando...' : 'Buscar Relatório'}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Report Summary */}
                    {reportOrders.length > 0 && (
                        <div className="grid grid-cols-3 gap-2">
                            <Card className="bg-blue-50">
                                <CardContent className="p-3 text-center">
                                    <p className="text-2xl font-bold text-blue-600">{reportTotalDeliveries}</p>
                                    <p className="text-xs text-gray-600">Total Entregas</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-green-50">
                                <CardContent className="p-3 text-center">
                                    <p className="text-2xl font-bold text-green-600">{reportDeliveredCount}</p>
                                    <p className="text-xs text-gray-600">Entregues</p>
                                </CardContent>
                            </Card>
                            <Card className="bg-yellow-50">
                                <CardContent className="p-3 text-center">
                                    <p className="text-lg font-bold text-yellow-600">R$ {reportTotalFees.toFixed(2)}</p>
                                    <p className="text-xs text-gray-600">Total Taxas</p>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Report List */}
                    {reportOrders.length > 0 ? (
                        <div className="space-y-2">
                            <h3 className="font-semibold text-gray-700">Entregas ({reportOrders.length})</h3>
                            {reportOrders.map(order => (
                                <Card key={order.id}>
                                    <CardContent className="p-3">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">#{order.order_number}</p>
                                                <p className="text-sm text-gray-500">
                                                    {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                </p>
                                                <p className="text-sm">{order.store?.name}</p>
                                            </div>
                                            <div className="text-right">
                                                <Badge className={
                                                    order.status === 'delivered' ? 'bg-green-500' :
                                                        order.status === 'cancelled' ? 'bg-red-500' :
                                                            'bg-blue-500'
                                                }>
                                                    {order.status === 'delivered' ? 'Entregue' :
                                                        order.status === 'cancelled' ? 'Cancelado' :
                                                            order.status === 'out_for_delivery' ? 'Em Rota' : 'Pronto'}
                                                </Badge>
                                                <p className="text-sm font-medium text-green-600 mt-1">
                                                    R$ {(order.delivery_fee || 0).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="py-8 text-center text-muted-foreground">
                                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>Clique em "Buscar Relatório" para ver suas entregas</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            <div className="fixed bottom-0 w-full text-center text-xs text-gray-400 p-1 pointer-events-none bg-gray-100">
                v2.0 - App Entregador
            </div>
        </div>
    );
}
