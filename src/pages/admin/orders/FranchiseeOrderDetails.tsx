'use client';

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    Calendar,
    ShoppingBag,
    Printer,
    ArrowRight,
    CreditCard,
    FileText,
    Zap,
    AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBRL, cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportOrderDetailsPDF } from '@/lib/pdf-export';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductImagePlaceholder } from './components/ProductImagePlaceholder';

interface Order {
    id: string;
    status: string;
    subtotal: number;
    fees_total: number;
    advertising_fee: number;
    total_amount: number;
    payment_method: string;
    notes: string | null;
    created_at: string;
    edited_by_admin: boolean;
    edit_reason: string | null;
    edited_at: string | null;
    profiles?: {
        full_name: string;
    };
}

interface OrderItem {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
    taxa_boleto_unit_applied: number;
    subtotal: number;
    franchisee_products: {
        name: string;
        unit: string;
        image_url: string | null;
        code: string | null;
    };
}

const FranchiseeOrderDetails = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();

    const { data: order, isLoading: loadingOrder } = useQuery({
        queryKey: ['franchisee_order', orderId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('franchisee_orders' as any)
                .select('*, profiles!franchisee_orders_franchisee_user_id_fkey(full_name)')
                .eq('id', orderId)
                .single();
            if (error) throw error;
            return (data as unknown) as Order;
        },
        enabled: !!orderId
    });

    const { data: items, isLoading: loadingItems } = useQuery({
        queryKey: ['franchisee_order_items', orderId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('franchisee_order_items' as any)
                .select('*, franchisee_products(name, unit, image_url, code)')
                .eq('order_id', orderId);
            if (error) throw error;
            return (data as any) as OrderItem[];
        },
        enabled: !!orderId
    });

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { label: 'Pendente', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: <Clock className="h-5 w-5" /> };
            case 'approved': return { label: 'Aprovado', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: <CheckCircle2 className="h-5 w-5" /> };
            case 'rejected': return { label: 'Rejeitado', color: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30', icon: <XCircle className="h-5 w-5" /> };
            case 'shipping': return { label: 'Em Trânsito', color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: <Truck className="h-5 w-5" /> };
            case 'delivered': return { label: 'Entregue', color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', icon: <CheckCircle2 className="h-5 w-5" /> };
            default: return { label: status, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-white/5', icon: <Package className="h-5 w-5" /> };
        }
    };

    if (loadingOrder) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#030303] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Carregando Pedido...</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#030303] flex items-center justify-center p-8">
                <Card className="max-w-md w-full border-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-12 text-center shadow-xl">
                    <div className="w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-6">
                        <XCircle className="h-10 w-10 text-rose-600" />
                    </div>
                    <h2 className="text-2xl font-black mb-2">Pedido não encontrado</h2>
                    <p className="text-sm text-gray-500 mb-8">O código do pedido é inválido ou você não tem permissão para acessá-lo.</p>
                    <Button onClick={() => navigate('/admin/orders/history')} className="w-full h-14 rounded-2xl bg-purple-600 font-black">Voltar ao Histórico</Button>
                </Card>
            </div>
        );
    }

    const status = getStatusInfo(order.status);

    return (
        <div className="min-h-screen bg-white dark:bg-[#030303] text-gray-900 dark:text-gray-100 pb-32">
            {/* Mesh Background */}
            <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20 no-print">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400 blur-[120px] rounded-full" />
            </div>

            <div className="relative z-10 w-full max-w-5xl mx-auto px-4 md:px-8 pt-8 print-area">
                {/* Print Only Logo/Header */}
                <div className="hidden print:flex items-center gap-4 mb-8 border-b-2 border-purple-600 pb-6">
                    <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                        <Package className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-purple-600">Açaí no Grau</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Franchise Management System</p>
                    </div>
                </div>

                {/* Header */}
                {/* Header */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-6">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate('/admin/orders/history')}
                            className="h-14 w-14 rounded-2xl border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 shadow-sm transition-all active:scale-95 no-print"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">
                                <ShoppingBag className="h-3 w-3" />
                                PEDIDO #{order.id.slice(0, 8).toUpperCase()}
                            </div>
                            <h1 className="text-3xl font-black tracking-tight">Detalhes do Pedido</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 no-print">
                        <Button
                            className="h-14 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black flex gap-2 shadow-lg shadow-purple-500/20"
                            onClick={async () => await exportOrderDetailsPDF(order, items || [])}
                        >
                            <FileText className="h-5 w-5" />
                            <span>Exportar PDF</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-14 px-6 rounded-2xl border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 font-black flex gap-2"
                            onClick={async () => await exportOrderDetailsPDF(order, items || [], 'print')}
                        >
                            <Printer className="h-5 w-5" />
                            <span className="hidden sm:inline">Imprimir</span>
                        </Button>
                    </div>
                </header>

                {order.edited_by_admin && (
                    <Card className="border-0 bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] p-6 mb-8 border border-amber-200 dark:border-amber-500/20 flex items-start gap-4 no-print">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="font-black text-amber-800 dark:text-amber-300">Este pedido foi alterado pela franqueadora</p>
                            {order.edit_reason && (
                                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1 font-medium">{order.edit_reason}</p>
                            )}
                            {order.edited_at && (
                                <p className="text-xs text-amber-500 mt-2 font-bold uppercase tracking-wide">
                                    Alterado em {format(new Date(order.edited_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </p>
                            )}
                        </div>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Items Table */}
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="border-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-white/5 shadow-sm">
                            <div className="p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/2">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Insumos Solicitados</h3>
                            </div>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent border-gray-100 dark:border-white/5">
                                            <TableHead className="px-8 h-14 font-black text-[10px] uppercase tracking-widest">Cód.</TableHead>
                                            <TableHead className="h-14 font-black text-[10px] uppercase tracking-widest">Item</TableHead>
                                            <TableHead className="text-center h-14 font-black text-[10px] uppercase tracking-widest">Qtd</TableHead>
                                            <TableHead className="text-right h-14 font-black text-[10px] uppercase tracking-widest">Unit.</TableHead>
                                            <TableHead className="px-8 text-right h-14 font-black text-[10px] uppercase tracking-widest">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingItems ? (
                                            [1, 2, 3].map(i => (
                                                <TableRow key={i}>
                                                    <TableCell colSpan={4} className="h-16 px-8">
                                                        <div className="w-full h-4 bg-gray-100 dark:bg-white/5 animate-pulse rounded" />
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : items?.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-white/2 border-gray-100 dark:border-white/5">
                                                <TableCell className="px-8 py-5">
                                                    <span className="font-mono text-xs text-gray-400 font-bold">
                                                        {item.franchisee_products.code || '—'}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center overflow-hidden">
                                                            {item.franchisee_products.image_url ? (
                                                                <img src={item.franchisee_products.image_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <ProductImagePlaceholder compact />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-sm uppercase tracking-tight">{item.franchisee_products.name}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.franchisee_products.unit}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center font-black">
                                                    {item.quantity}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-gray-500">
                                                    {formatBRL(item.unit_price)}
                                                </TableCell>
                                                <TableCell className="px-8 text-right font-black text-purple-600">
                                                    {formatBRL(item.subtotal)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {order.notes && (
                            <Card className="border-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-sm">
                                <div className="flex items-center gap-3 mb-4">
                                    <FileText className="h-5 w-5 text-purple-600" />
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Observações do Pedido</h3>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{order.notes}</p>
                            </Card>
                        )}
                    </div>

                    {/* Right Column - Order Summary & Info */}
                    <div className="space-y-8">
                        {/* Status Card */}
                        <Card className="border-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
                            <div className={cn("absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20", status.color.replace('text', 'bg'))} />

                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className={cn("w-20 h-20 rounded-[2rem] bg-white dark:bg-black/20 shadow-xl flex items-center justify-center mb-6", status.color)}>
                                    {React.cloneElement(status.icon as React.ReactElement, { className: 'h-10 w-10' })}
                                </div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Status do Pedido</h4>
                                <p className={cn("text-3xl font-black uppercase tracking-tighter mb-4", status.color)}>{status.label}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 font-bold mb-8">
                                    <Calendar className="h-4 w-4" />
                                    Feito em {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                </div>

                                <div className="w-full space-y-3 pt-6 border-t border-gray-100 dark:border-white/5">
                                    <div className="flex items-center justify-between text-xs font-bold px-2">
                                        <span className="text-gray-400 uppercase tracking-widest">Pagamento</span>
                                        <Badge variant="outline" className="rounded-lg font-black uppercase text-[10px] flex gap-1.5 items-center">
                                            <CreditCard className="h-3 w-3" />
                                            {order.payment_method}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Financial Summary */}
                        <Card className="border-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-lg shadow-purple-500/5">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Resumo Financeiro</h3>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-gray-500">Subtotal</span>
                                    <span className="font-black">{formatBRL(order.subtotal)}</span>
                                </div>

                                {order.fees_total > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-gray-500">Taxas Administrativas</span>
                                        <span className="font-black text-amber-600">+{formatBRL(order.fees_total)}</span>
                                    </div>
                                )}

                                {order.advertising_fee > 0 && (
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-gray-500">Taxa de Publicidade</span>
                                        <span className="font-black text-amber-600">+{formatBRL(order.advertising_fee)}</span>
                                    </div>
                                )}

                                <div className="pt-6 mt-2 border-t border-gray-100 dark:border-white/5">
                                    <div className="p-6 rounded-3xl bg-purple-600 text-white shadow-xl shadow-purple-500/20">
                                        <p className="text-[10px] font-black text-purple-100 uppercase tracking-widest mb-1 opacity-70">Total da Carga</p>
                                        <p className="text-4xl font-black tracking-tighter">{formatBRL(order.total_amount)}</p>
                                    </div>
                                </div>

                                <div className="pt-8 flex flex-col gap-4">
                                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 shrink-0">
                                            <Zap className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Entrega Estimada</p>
                                            <p className="text-sm font-bold">Até 48 horas úteis</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FranchiseeOrderDetails;
