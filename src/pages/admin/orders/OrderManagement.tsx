'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
    Package,
    Search,
    Filter,
    MoreVertical,
    CheckCircle2,
    XCircle,
    Package as PackageIcon,
    Clock,
    Eye,
    FileText,
    Volume2,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { formatBRL } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { exportOrderDetailsPDF, exportOrdersReportPDF } from '@/lib/pdf-export';

interface Order {
    id: string;
    franchisee_user_id: string;
    status: string;
    subtotal: number;
    fees_total: number;
    advertising_fee: number;
    total_amount: number;
    payment_method: string;
    notes: string | null;
    created_at: string;
    profiles: {
        full_name: string;
    };
}

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';

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
        code: string | null;
    };
}

const OrderDetailsDialog = ({ order }: { order: Order }) => {
    const { data: items, isLoading } = useQuery({
        queryKey: ['admin_order_items', order.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('franchisee_order_items' as any)
                .select('*, franchisee_products(name, unit, code)')
                .eq('order_id', order.id);
            if (error) throw error;
            return (data as any) as OrderItem[];
        }
    });

    const handlePrint = async () => {
        // Gera o PDF e abre a caixa de diálogo de impressão do navegador com o PDF
        await exportOrderDetailsPDF(order, items || [], 'print');
    };

    return (
        <DialogContent className="max-w-3xl rounded-[2rem] p-0 overflow-hidden border-0 bg-white/80 dark:bg-black/80 backdrop-blur-2xl shadow-[0_32px_64px_rgba(0,0,0,0.2)]">
            <div className="print-area">
                <DialogHeader className="p-8 bg-purple-600 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                                <Package className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-bold">Detalhes do Pedido</DialogTitle>
                                <p className="text-purple-100 text-sm mt-1 font-mono tracking-tighter">#{order.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-black tracking-widest text-purple-200">Status Atual</p>
                            <p className="font-bold text-lg">{order.status.toUpperCase()}</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-8 max-h-[70vh] md:max-h-none overflow-y-auto md:overflow-visible">
                    <div className="grid md:grid-cols-2 gap-8 mb-8">
                        <div className="p-6 rounded-3xl bg-gray-50/50 dark:bg-white/5 border border-gray-100/50 dark:border-white/5">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Dados do Franqueado</h4>
                            <p className="font-bold text-xl text-purple-700 dark:text-purple-400">{order.profiles?.full_name}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="rounded-lg border-purple-200 text-purple-600">{order.payment_method}</Badge>
                            </div>
                        </div>
                        <div className="p-6 rounded-3xl bg-gray-50/50 dark:bg-white/5 border border-gray-100/50 dark:border-white/5">
                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Data e Hora</h4>
                            <p className="font-bold text-xl">{format(new Date(order.created_at), "dd/MM/yyyy")}</p>
                            <p className="text-sm text-gray-500">{format(new Date(order.created_at), "HH:mm'h'")}</p>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-gray-100 dark:border-white/10 overflow-hidden mb-8 shadow-sm">
                        <Table>
                            <TableHeader className="bg-gray-50/50 dark:bg-white/5">
                                <TableRow className="border-b border-gray-100 dark:border-white/10">
                                    <TableHead className="font-black text-xs uppercase tracking-wider h-12">Cód.</TableHead>
                                    <TableHead className="font-black text-xs uppercase tracking-wider h-12">Item / Unidade</TableHead>
                                    <TableHead className="text-center font-black text-xs uppercase tracking-wider h-12">Qtd</TableHead>
                                    <TableHead className="text-right font-black text-xs uppercase tracking-wider h-12">Unit.</TableHead>
                                    {order.payment_method === 'Boleto' && <TableHead className="text-right font-black text-xs uppercase tracking-wider h-12 text-purple-600">Taxas</TableHead>}
                                    <TableHead className="text-right font-black text-xs uppercase tracking-wider h-12">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-12">
                                        <div className="flex flex-col items-center gap-2">
                                            <Package className="h-8 w-8 text-gray-200 animate-bounce" />
                                            <span className="text-sm text-gray-400">Carregando itens...</span>
                                        </div>
                                    </TableCell></TableRow>
                                ) : items?.map((item) => (
                                    <TableRow key={item.id} className="border-b border-gray-50 dark:border-white/5 hover:bg-gray-50/30 dark:hover:bg-white/5 transition-colors">
                                        <TableCell className="py-4">
                                            <span className="font-mono text-[10px] text-gray-400 font-bold">
                                                {item.franchisee_products?.code || '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-bold py-4">
                                            {item.franchisee_products?.name}
                                            <p className="text-[10px] text-gray-400 font-medium tracking-tight uppercase">{item.franchisee_products?.unit}</p>
                                        </TableCell>
                                        <TableCell className="text-center font-black text-gray-700 dark:text-gray-300">{item.quantity}</TableCell>
                                        <TableCell className="text-right text-sm">{formatBRL(item.unit_price)}</TableCell>
                                        {order.payment_method === 'Boleto' && (
                                            <TableCell className="text-right text-purple-600 font-bold text-xs">
                                                +{formatBRL((item.taxa_boleto_unit_applied || 0) * item.quantity)}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right font-black text-gray-900 dark:text-white">{formatBRL(item.subtotal)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="space-y-4 bg-purple-50/50 dark:bg-purple-900/10 p-8 rounded-[2rem] border border-purple-100/50 dark:border-purple-500/10 shadow-inner">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-500">Subtotal Bruto</span>
                            <span className="font-bold">{formatBRL(order.subtotal)}</span>
                        </div>
                        {order.fees_total > 0 && (
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 text-sm">Taxa Boleto Bancário</span>
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-[10px] rounded-md font-bold">EMBUTIDO</Badge>
                                </div>
                                <span className="font-bold text-purple-600">{formatBRL(order.fees_total)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-500">Taxa de Publicidade</span>
                            <span className="font-bold text-blue-600">{formatBRL(order.advertising_fee)}</span>
                        </div>
                        <div className="pt-4 border-t border-purple-200/50 dark:border-purple-500/20 flex justify-between items-center">
                            <span className="font-black text-xl uppercase tracking-tighter text-gray-900 dark:text-white">Total Líquido</span>
                            <span className="font-black text-3xl text-purple-600 drop-shadow-sm">{formatBRL(order.total_amount)}</span>
                        </div>
                    </div>

                    {order.notes && (
                        <div className="mt-8 p-6 rounded-3xl bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-500/10">
                            <h4 className="text-xs font-black text-yellow-700/50 dark:text-yellow-400/50 uppercase tracking-widest mb-3">Observações Adicionais</h4>
                            <p className="text-yellow-900 dark:text-yellow-200 text-sm italic leading-relaxed">
                                "{order.notes}"
                            </p>
                        </div>
                    )}

                    <div className="mt-8 flex gap-3 no-print">
                        <Button
                            onClick={handlePrint}
                            className="flex-1 h-14 rounded-2xl bg-white hover:bg-gray-100 border border-gray-200 text-gray-900 font-bold gap-2 shadow-sm"
                        >
                            <FileText className="h-5 w-5" /> Imprimir Pedido
                        </Button>
                        <Button
                            onClick={async () => await exportOrderDetailsPDF(order, items || [])}
                            className="flex-1 h-14 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2 shadow-lg shadow-purple-500/20"
                        >
                            <FileText className="h-5 w-5" /> Exportar PDF
                        </Button>
                    </div>
                </div>
            </div>
        </DialogContent>
    );
};

const OrderManagement = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);

    /* ─── Real-time Sound Notification ─── */
    useEffect(() => {
        const channel = supabase
            .channel('public:franchisee_orders')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'franchisee_orders' },
                (payload) => {
                    playNotificationSound();
                    toast.success('Novo pedido recebido!', {
                        description: `Um novo pedido acaba de chegar.`,
                        action: {
                            label: 'Ver Pedido',
                            onClick: () => console.log('Ver pedido', payload.new.id)
                        }
                    });
                    queryClient.invalidateQueries({ queryKey: ['admin_orders'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const playNotificationSound = () => {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.error("Erro ao tocar som:", e));
    };

    /* ─── Queries ─── */
    const { data: orders, isLoading, error } = useQuery({
        queryKey: ['admin_orders', statusFilter],
        queryFn: async () => {
            console.log('Fetching orders with filter:', statusFilter);
            let query = supabase
                .from('franchisee_orders')
                .select('*, profiles!franchisee_orders_franchisee_user_id_fkey(full_name)')
                .order('created_at', { ascending: false });

            if (statusFilter) {
                query = query.eq('status', statusFilter);
            }

            const { data, error } = await query;
            if (error) {
                console.error('Erro na consulta de pedidos:', error);
                throw error;
            }
            console.log('Pedidos encontrados:', data?.length);
            return (data as any) as Order[];
        }
    });

    /* ─── Mutations ─── */
    const updateStatusMutation = useMutation({
        mutationFn: async ({ orderId, status }: { orderId: string, status: string }) => {
            const { error } = await supabase
                .from('franchisee_orders')
                .update({ status })
                .eq('id', orderId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin_orders'] });
            toast.success('Status atualizado com sucesso!');
        }
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-0">Pendente</Badge>;
            case 'approved': return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0">Aprovado</Badge>;
            case 'rejected': return <Badge variant="destructive" className="border-0">Rejeitado</Badge>;
            case 'shipping': return <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0">A Caminho</Badge>;
            case 'delivered': return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Entregue</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    const filteredOrders = orders?.filter(o => {
        const name = o.profiles?.full_name || 'Franqueado não identificado';
        return name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.id.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-purple-900 dark:text-purple-100">Gestão de Pedidos (Franquia)</h1>
                    <p className="text-muted-foreground mt-1 font-medium">Controle de abastecimento das unidades da rede.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={playNotificationSound} className="gap-2">
                        <Volume2 className="h-4 w-4" />
                        Testar Som
                    </Button>
                    <Button 
                        onClick={async () => await exportOrdersReportPDF(filteredOrders || [])}
                        className="bg-purple-600 hover:bg-purple-700 gap-2"
                    >
                        <FileText className="h-4 w-4" />
                        Relatório PDF
                    </Button>
                </div>
            </header>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por franqueado ou ID do pedido..."
                        className="pl-10 h-12 rounded-2xl border-gray-200"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant={statusFilter === null ? 'default' : 'outline'}
                        onClick={() => setStatusFilter(null)}
                        className="rounded-xl h-12 px-6"
                    >
                        Todos
                    </Button>
                    <Button
                        variant={statusFilter === 'pending' ? 'default' : 'outline'}
                        onClick={() => setStatusFilter('pending')}
                        className="rounded-xl h-12 px-6"
                    >
                        Pendentes
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="grid gap-4">
                    {[1, 2, 3].map(i => <Card key={i} className="h-24 rounded-2xl animate-pulse bg-gray-100/50" />)}
                </div>
            ) : error ? (
                <div className="p-12 text-center bg-red-50 rounded-[2rem] border border-red-100">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-red-900">Erro ao carregar pedidos</h3>
                    <p className="text-red-600">{(error as any).message}</p>
                </div>
            ) : filteredOrders?.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-[2rem]">
                    <Package className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Nenhum pedido encontrado.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredOrders?.map((order) => (
                        <Card key={order.id} className="border-0 shadow-sm bg-white dark:bg-white/5 rounded-2xl overflow-hidden hover:shadow-md transition-shadow group">
                            <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                        <Package className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-lg">{order.profiles?.full_name || 'Unidade não identificada'}</h3>
                                            <span className="text-xs text-gray-400 font-medium">#{order.id.slice(0, 8).toUpperCase()}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="text-gray-500">{format(new Date(order.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</span>
                                            <span className="h-1 w-1 rounded-full bg-gray-300" />
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{order.payment_method}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Valor Total</p>
                                        <p className="text-xl font-black text-purple-600">{formatBRL(order.total_amount)}</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(order.status)}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="rounded-full">
                                                    <MoreVertical className="h-5 w-5" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl p-2 w-48">
                                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'approved' })} className="rounded-lg gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Aprovar Pedido
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'shipping' })} className="rounded-lg gap-2">
                                                    <PackageIcon className="h-4 w-4 text-purple-500" /> Despachar Carga
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'delivered' })} className="rounded-lg gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Marcar como Entregue
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ orderId: order.id, status: 'rejected' })} className="rounded-lg gap-2 text-destructive">
                                                    <XCircle className="h-4 w-4" /> Rejeitar Pedido
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="icon" className="rounded-full">
                                                    <Eye className="h-5 w-5" />
                                                </Button>
                                            </DialogTrigger>
                                            <OrderDetailsDialog order={order} />
                                        </Dialog>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default OrderManagement;
