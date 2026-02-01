import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Circle, MapPin, Bike, User, Star, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import "leaflet/dist/leaflet.css";

// Dynamic import for Leaflet to work with SSR/Vite correctly
import * as L from "leaflet";

interface OrderTrackingData {
    id: string;
    order_number: string;
    status: string;
    created_at: string;
    updated_at: string;
    delivered_at?: string;
    total_amount: number;
    customer: { name: string; phone: string } | null;
    delivery_address: {
        street: string;
        number: string;
        neighborhood: string;
        city: string;
        latitude?: number;
        longitude?: number;
    } | null;
    driver: {
        id: string;
        name: string;
        phone: string;
        current_location: { lat: number; lng: number; timestamp: number } | null;
        status: string;
    } | null;
}

export default function OrderTracking() {
    const { orderId } = useParams(); // Using orderId as order_number or UUID
    const [order, setOrder] = useState<OrderTrackingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [map, setMap] = useState<L.Map | null>(null);
    const [driverMarker, setDriverMarker] = useState<L.Marker | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);

    // Initial Fetch
    useEffect(() => {
        if (!orderId) return;

        // Simple regex to check if UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

        const fetchOrder = async () => {
            // Try to find by UUID first, then order_number
            let query = supabase.from('orders').select(`
                *,
                customer:customers(name, phone),
                delivery_address:customer_addresses(*),
                driver:delivery_drivers(*)
            `);

            if (isUUID) {
                query = query.eq('id', orderId);
            } else {
                query = query.eq('order_number', orderId);
            }

            const { data, error } = await query.single();

            if (error) {
                console.error("Error fetching order:", error);
                setLoading(false);
            } else if (data) {
                setOrder(data as any);
                setLoading(false);
            }
        };

        fetchOrder();

        // Subscribe to Order Changes
        const orderSub = supabase
            .channel('tracking-order')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: isUUID ? `id=eq.${orderId}` : `order_number=eq.${orderId}` },
                (payload) => {
                    setOrder(prev => prev ? { ...prev, ...payload.new } : null);
                })
            .subscribe();

        return () => { supabase.removeChannel(orderSub); };
    }, [orderId]);

    // Driver Location Subscription
    useEffect(() => {
        if (!order?.driver?.id) return;

        const driverSub = supabase
            .channel('tracking-driver')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'delivery_drivers', filter: `id=eq.${order.driver.id}` },
                (payload) => {
                    if (order && payload.new.current_location) {
                        setOrder(prev => prev ? {
                            ...prev,
                            driver: { ...prev.driver!, current_location: payload.new.current_location }
                        } : null);
                    }
                })
            .subscribe();

        return () => { supabase.removeChannel(driverSub); };
    }, [order?.driver?.id]);


    // Map Initialization and Updates
    useEffect(() => {
        if (loading || !order || !mapRef.current) return;

        if (!map) {
            const initialLat = order.delivery_address?.latitude || order.driver?.current_location?.lat || -5.08921;
            const initialLng = order.delivery_address?.longitude || order.driver?.current_location?.lng || -42.8016;

            const newMap = L.map(mapRef.current).setView([initialLat, initialLng], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(newMap);

            // Customer Marker
            if (order.delivery_address?.latitude && order.delivery_address?.longitude) {
                const customerIcon = L.divIcon({
                    html: `
                      <div class="flex flex-col items-center -translate-y-full w-[100px]">
                        <span class="bg-white px-2 py-1 rounded shadow text-xs font-bold mb-1 text-nowrap text-black">
                          ${order.customer?.name?.split(' ')[0] || 'Cliente'}
                        </span>
                        <div class="bg-black text-white p-2 rounded-full border-2 border-white shadow-lg">
                           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        </div>
                      </div>
                    `,
                    className: 'custom-customer-icon',
                    iconSize: [100, 60],
                    iconAnchor: [50, 60]
                });

                L.marker([order.delivery_address.latitude, order.delivery_address.longitude], { icon: customerIcon })
                    .addTo(newMap)
                    .bindPopup("Destino da Entrega");
            }

            setMap(newMap);
        } else {
            // Update Driver Marker
            if (order.driver?.current_location) {
                const { lat, lng } = order.driver.current_location;

                if (driverMarker) {
                    driverMarker.setLatLng([lat, lng]);
                } else {
                    const driverIcon = L.divIcon({
                        html: `
                          <div class="flex flex-col items-center -translate-y-full w-[100px]">
                            <span class="bg-white px-2 py-1 rounded shadow text-xs font-bold mb-1 text-nowrap text-purple-600 border border-purple-600">
                                ${order.driver.name.split(' ')[0]}
                            </span>
                            <div class="bg-white p-1 rounded-full border-2 border-purple-600 shadow-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9333ea" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm-3 11.5V14l-3-3 4-3 2 3h2"/><path d="M5 17.5h14"/></svg>
                            </div>
                          </div>`,
                        className: 'custom-driver-icon',
                        iconSize: [100, 70],
                        iconAnchor: [50, 70]
                    });

                    const marker = L.marker([lat, lng], { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);
                    setDriverMarker(marker);
                }
            }
        }

    }, [loading, map, order, order?.driver?.current_location]);


    if (loading) {
        return <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="text-gray-500">Carregando rastreamento...</p>
        </div>;
    }

    if (!order) {
        return <div className="h-screen w-full flex items-center justify-center bg-gray-50">
            <Card className="max-w-md text-center p-8">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Pedido não encontrado</h2>
                <p className="text-gray-500">Verifique o link ou entre em contato com a loja.</p>
            </Card>
        </div>;
    }

    // Timeline Steps Logic
    const steps = [
        {
            label: "Rota Iniciada",
            date: order.created_at,
            completed: true,
            icon: <MapPin className="w-4 h-4" />
        },
        {
            label: "Serviço a Caminho",
            date: order.status === 'out_for_delivery' || order.status === 'delivered' ? order.updated_at : null,
            completed: order.status === 'out_for_delivery' || order.status === 'delivered',
            active: order.status === 'out_for_delivery',
            icon: <Bike className="w-4 h-4" />
        },
        {
            label: "Entregue no Local",
            date: order.delivered_at,
            completed: order.status === 'delivered',
            icon: <CheckCircle2 className="w-4 h-4" />
        }
    ];

    return (
        <div className="relative h-screen w-screen overflow-hidden flex flex-col md:flex-row">

            {/* Sidebar / Floating Card */}
            <div className="absolute top-4 left-4 z-[9999] w-[90%] md:w-[380px] max-h-[90vh] overflow-y-auto">
                <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden bg-white/95 backdrop-blur-sm">
                    <CardHeader className="bg-gray-50/50 pb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">RASTREAMENTO DA ORDEM</p>
                                <CardTitle className="text-3xl font-black text-gray-800">#{order.order_number}</CardTitle>
                                <p className="text-sm text-gray-500 mt-1">{order.customer?.name}</p>
                            </div>
                            <div className="bg-gray-200 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
                                {order.status === 'delivered' ? 'FINALIZADO' : 'EM ROTA'}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6">
                        {order.driver && (
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center border-2 border-purple-200">
                                    <Bike className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 font-bold uppercase">Entregador Parceiro</p>
                                    <p className="font-bold text-gray-800 text-lg">{order.driver.name}</p>
                                    <div className="flex items-center gap-1 text-yellow-500">
                                        <Star className="w-3 h-3 fill-current" />
                                        <span className="text-xs font-bold text-gray-600">5.0</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="relative pl-4 border-l-2 border-gray-100 space-y-8">
                            {steps.map((step, index) => (
                                <div key={index} className={`relative ${step.completed ? 'text-green-600' : 'text-gray-400'}`}>
                                    <div className={`absolute -left-[21px] top-0 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center
                                        ${step.completed ? 'border-green-500' : (step.active ? 'border-blue-500 animate-pulse' : 'border-gray-200')}
                                    `}>
                                        <div className={`w-2 h-2 rounded-full ${step.completed ? 'bg-green-500' : (step.active ? 'bg-blue-500' : 'bg-gray-200')}`} />
                                    </div>

                                    <div className="flex flex-col">
                                        <span className={`font-bold text-sm uppercase ${step.active ? 'text-blue-600' : ''}`}>{step.label}</span>
                                        {step.date && (
                                            <span className="text-xs text-gray-500">
                                                {format(new Date(step.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {order.status !== 'delivered' && (
                            <div className="mt-8 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <h4 className="font-bold text-blue-800 text-sm mb-1">Previsão: Chegada em breve</h4>
                                <p className="text-xs text-blue-600">Seu pedido está a caminho. Acompanhe a moto no mapa.</p>
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                            <a
                                href={`https://wa.me/55${order.customer?.phone?.replace(/\D/g, '') || ''}?text=Olá, estou acompanhando meu pedido #${order.order_number}`}
                                target="_blank"
                                className="text-xs text-green-600 font-bold hover:underline flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-3 h-3" />
                                Falar com Suporte (WhatsApp)
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Map Container */}
            <div ref={mapRef} className="h-full w-full bg-gray-200 z-0" />

            {/* Version Footer */}
            <div className="absolute bottom-1 right-1 bg-white/50 px-2 rounded text-[10px] text-gray-500 pointer-events-none z-[1000]">
                Rastreamento v2.0
            </div>
        </div>
    );
}
