'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import {
    ChevronLeft,
    Package,
    Clock,
    CheckCircle2,
    XCircle,
    Truck,
    ChevronRight,
    ShoppingBag,
    Search,
    Calendar,
    ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatBRL } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Order {
    id: string;
    status: string;
    total_amount: number;
    created_at: string;
    payment_method: string;
}

const OrderHistory = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const { data: orders, isLoading } = useQuery({
        queryKey: ['franchisee_orders_history', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('franchisee_orders' as any)
                .select('*')
                .eq('franchisee_user_id', user?.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return (data as any) as Order[];
        },
        enabled: !!user?.id
    });

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: <Clock className="h-4 w-4" /> };
            case 'approved': return { label: 'Aprovado', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: <CheckCircle2 className="h-4 w-4" /> };
            case 'rejected': return { label: 'Rejeitado', color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30', icon: <XCircle className="h-4 w-4" /> };
            case 'shipping': return { label: 'Em Trânsito', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: <Truck className="h-4 w-4" /> };
            case 'delivered': return { label: 'Entregue', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: <CheckCircle2 className="h-4 w-4" /> };
            default: return { label: status, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-white/5', icon: <Package className="h-4 w-4" /> };
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#030303] text-gray-900 dark:text-gray-100">
            {/* Mesh Background */}
            <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 w-full max-w-5xl mx-auto px-4 md:px-8 pt-8 pb-32">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-6">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate('/admin/orders/catalog')}
                            className="h-14 w-14 rounded-2xl border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 shadow-sm transition-all active:scale-95"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight">Histórico de Cargas</h1>
                            <p className="text-gray-500 font-medium">Acompanhe todos os seus pedidos de insumos.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 p-1.5 rounded-2xl shadow-sm">
                        <Button variant="ghost" className="rounded-xl h-10 px-4 text-xs font-black uppercase tracking-widest bg-white dark:bg-white/10 shadow-sm">Todos</Button>
                        <Button variant="ghost" className="rounded-xl h-10 px-4 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-600">Pendentes</Button>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-4">
                    {isLoading ? (
                        [1, 2, 3, 4].map(i => (
                            <div key={i} className="h-32 w-full rounded-[2rem] bg-gray-100 dark:bg-white/5 animate-pulse" />
                        ))
                    ) : orders?.length === 0 ? (
                        <Card className="border-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[3rem] py-24 border border-gray-100 dark:border-white/5 shadow-sm text-center">
                            <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
                                <Package className="h-10 w-10 text-gray-300" />
                            </div>
                            <h2 className="text-2xl font-black mb-2">Nenhum pedido encontrado</h2>
                            <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto">Você ainda não realizou nenhum pedido de carga para sua unidade.</p>
                            <Button
                                onClick={() => navigate('/admin/orders/catalog')}
                                className="rounded-2xl h-14 px-8 bg-purple-600 font-black shadow-xl shadow-purple-500/20"
                            >
                                Iniciar Primeiro Pedido
                            </Button>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
                            {orders?.map((order) => {
                                const status = getStatusInfo(order.status);
                                return (
                                    <motion.div
                                        key={order.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        whileHover={{ y: -4 }}
                                        className="group"
                                    >
                                        <Card
                                            className="border-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-sm group-hover:shadow-2xl group-hover:shadow-purple-500/10 transition-all cursor-pointer"
                                            onClick={() => navigate(`/admin/orders/${order.id}`)}
                                        >
                                            <CardContent className="p-0">
                                                <div className="flex flex-col lg:flex-row lg:items-center">
                                                    {/* Status & Icon */}
                                                    <div className={cn(
                                                        "p-8 lg:w-48 shrink-0 flex flex-col items-center justify-center text-center gap-3",
                                                        status.bg
                                                    )}>
                                                        <div className={cn("w-14 h-14 rounded-2xl bg-white dark:bg-black/20 shadow-sm flex items-center justify-center", status.color)}>
                                                            {React.cloneElement(status.icon as React.ReactElement, { className: 'h-7 w-7' })}
                                                        </div>
                                                        <span className={cn("text-xs font-black uppercase tracking-widest", status.color)}>
                                                            {status.label}
                                                        </span>
                                                    </div>

                                                    {/* Details */}
                                                    <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-center border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-white/5">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-tighter">
                                                                <ShoppingBag className="h-3 w-3" />
                                                                COD: #{order.id.slice(0, 8).toUpperCase()}
                                                            </div>
                                                            <h4 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Pedido de Insumos</h4>
                                                            <div className="flex items-center gap-2 text-xs text-gray-500 font-bold">
                                                                <Calendar className="h-3.5 w-3.5" />
                                                                {format(new Date(order.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1 md:text-center">
                                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Valor da Carga</p>
                                                            <p className="text-2xl font-black text-purple-600">{formatBRL(order.total_amount)}</p>
                                                            <Badge variant="outline" className="text-[9px] border-gray-200 dark:border-white/10 uppercase tracking-tighter font-black">
                                                                Pagamento via {order.payment_method}
                                                            </Badge>
                                                        </div>

                                                        <div className="flex justify-end pr-4">
                                                            <div className="w-12 h-12 rounded-full border border-gray-100 dark:border-white/10 flex items-center justify-center group-hover:bg-purple-600 group-hover:border-purple-600 group-hover:text-white transition-all duration-300">
                                                                <ChevronRight className="h-6 w-6" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderHistory;
