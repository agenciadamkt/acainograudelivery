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
    AlertCircle,
    Pencil,
    AlertTriangle
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
import { useRotaDoDia } from '@/hooks/useRotaDoDia';
import { DespacharCargaDialog } from './components/DespacharCargaDialog';
import { EditOrderDialog } from './components/EditOrderDialog';

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
    edited_by_admin: boolean;
    edit_reason: string | null;
    edited_at: string | null;
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
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col rounded-[2rem] p-0 overflow-hidden border-0 bg-background shadow-2xl">
            <div className="print-area flex flex-col flex-1 min-h-0">
                {/* Cabeçalho fixo */}
                <DialogHeader className="shrink-0 p-8 bg-purple-600 text-white">
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

                {/* Conteúdo rolável */}
                <div className="flex-1 overflow-y-auto p-8 min-h-0">
                    {order.edited_by_admin && (
                        <div className="mb-6 p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                            <AlertTriangle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-blue-800">Este pedido foi alterado pela franqueadora</p>
                                {order.edit_reason && <p className="text-sm text-blue-700 mt-0.5">{order.edit_reason}</p>}
                                {order.edited_at && (
                                    <p className="text-xs text-blue-500 mt-1">
                                        {format(new Date(order.edited_at), "dd/MM/yyyy 'às' HH:mm")}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-8 mb-8">
                        <div className="p-6 rounded-3xl bg-muted/50 border border-border/50">
                            <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Dados do Franqueado</h4>
                            <p className="font-bold text-xl text-purple-700 dark:text-purple-400">{order.profiles?.full_name}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="rounded-lg border-purple-200 text-purple-600">{order.payment_method}</Badge>
                            </div>
                        </div>
                        <div className="p-6 rounded-3xl bg-muted/50 border border-border/50">
                            <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Data e Hora</h4>
                            <p className="font-bold text-xl">{format(new Date(order.created_at), "dd/MM/yyyy")}</p>
                            <p className="text-sm text-muted-foreground">{format(new Date(order.created_at), "HH:mm'h'")}</p>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-border overflow-hidden mb-8 shadow-sm">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="border-b border-border">
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
                                            <Package className="h-8 w-8 text-muted-foreground/40 animate-bounce" />
                                            <span className="text-sm text-muted-foreground">Carregando itens...</span>
                                        </div>
                                    </TableCell></TableRow>
                                ) : items?.map((item) => (
                                    <TableRow key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                        <TableCell className="py-4">
                                            <span className="font-mono text-[10px] text-muted-foreground font-bold">
                                                {item.franchisee_products?.code || '—'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-bold py-4">
                                            {item.franchisee_products?.name}
                                            <p className="text-[10px] text-muted-foreground font-medium tracking-tight uppercase">{item.franchisee_products?.unit}</p>
                                        </TableCell>
                                        <TableCell className="text-center font-black text-foreground">{item.quantity}</TableCell>
                                        <TableCell className="text-right text-sm">{formatBRL(item.unit_price)}</TableCell>
                                        {order.payment_method === 'Boleto' && (
                                            <TableCell className="text-right text-purple-600 font-bold text-xs">
                                                +{formatBRL((item.taxa_boleto_unit_applied || 0) * item.quantity)}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right font-black text-foreground">{formatBRL(item.subtotal)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="space-y-4 bg-purple-50/50 dark:bg-purple-900/10 p-8 rounded-[2rem] border border-purple-100/50 dark:border-purple-500/10 shadow-inner">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-muted-foreground">Subtotal Bruto</span>
                            <span className="font-bold">{formatBRL(order.subtotal)}</span>
                        </div>
                        {order.fees_total > 0 && (
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-sm">Taxa Boleto Bancário</span>
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 text-[10px] rounded-md font-bold">EMBUTIDO</Badge>
                                </div>
                                <span className="font-bold text-purple-600">{formatBRL(order.fees_total)}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-muted-foreground">Taxa de Publicidade</span>
                            <span className="font-bold text-blue-600">{formatBRL(order.advertising_fee)}</span>
                        </div>
                        <div className="pt-4 border-t border-purple-200/50 dark:border-purple-500/20 flex justify-between items-center">
                            <span className="font-black text-xl uppercase tracking-tighter text-foreground">Total Líquido</span>
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
                </div>

                {/* Área de ação fixa */}
                <div className="shrink-0 flex gap-3 p-8 pt-4 border-t border-border no-print">
                    <Button
                        onClick={handlePrint}
                        className="flex-1 h-14 rounded-2xl bg-background hover:bg-muted border border-border text-foreground font-bold gap-2 shadow-sm"
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
        </DialogContent>
    );
};

const OrderManagement = () => {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [despachando, setDespachando] = useState<{ id: string; name: string } | null>(null);
    const [editando, setEditando] = useState<Order | null>(null);

    // Rotas do dia (de todos os motoristas) — usadas no diálogo de Despachar
    // Carga pra agrupar o pedido numa rota existente, em vez de criar uma
    // nova rota a cada despacho.
    const today = format(new Date(), 'yyyy-MM-dd');
    const { data: rotasDoDia = [] } = useRotaDoDia(today);

    // Alerta sonoro + visual de novo pedido agora é global (independente da
    // tela), montado em AdminLayout via useRealtimeFranchiseeOrders — ver
    // src/hooks/useRealtimeFranchiseeOrders.ts e NewFranchiseeOrderAlert.tsx.

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

            const result = (data as any) as Order[];

            // Exibe o nome da LOJA/FRANQUIA, não da pessoa logada — resolve via
            // stores.franchisee_user_id (vínculo direto) e, pra quem só opera a
            // unidade via user_unidades (ex: conta promovida de cliente comum a
            // operadora), cai nesse fallback. profiles.full_name só é mantido
            // como último recurso se nenhuma loja for encontrada.
            const franchiseeUserIds = [...new Set(result.map(o => o.franchisee_user_id).filter(Boolean))];

            if (franchiseeUserIds.length > 0) {
                const nomeLojaPorUsuario: Record<string, string> = {};

                const { data: lojasDirectas } = await supabase
                    .from('stores')
                    .select('franchisee_user_id, name')
                    .in('franchisee_user_id', franchiseeUserIds);
                (lojasDirectas || []).forEach((s: any) => {
                    if (s.franchisee_user_id) nomeLojaPorUsuario[s.franchisee_user_id] = s.name;
                });

                const semVinculoDireto = franchiseeUserIds.filter(id => !nomeLojaPorUsuario[id]);
                if (semVinculoDireto.length > 0) {
                    const { data: unidades } = await (supabase as any)
                        .from('user_unidades')
                        .select('usuario_id, store:stores(name)')
                        .in('usuario_id', semVinculoDireto);
                    (unidades || []).forEach((u: any) => {
                        if (u.store?.name && !nomeLojaPorUsuario[u.usuario_id]) {
                            nomeLojaPorUsuario[u.usuario_id] = u.store.name;
                        }
                    });
                }

                result.forEach(o => {
                    const nomeLoja = nomeLojaPorUsuario[o.franchisee_user_id];
                    if (nomeLoja) {
                        o.profiles = { ...o.profiles, full_name: nomeLoja };
                    }
                });
            }

            return result;
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
                    <Button
                        variant="outline"
                        onClick={() => new Audio('/sounds/chegou.mp3').play().catch(() => {})}
                        className="gap-2"
                    >
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
                                            {order.edited_by_admin && (
                                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 gap-1 text-[10px]">
                                                    <Pencil className="h-3 w-3" /> Alterado
                                                </Badge>
                                            )}
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
                                                <DropdownMenuItem onClick={() => setEditando(order)} className="rounded-lg gap-2">
                                                    <Pencil className="h-4 w-4 text-blue-500" /> Editar Pedido
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => setDespachando({
                                                        id: order.id,
                                                        name: order.profiles?.full_name ?? 'Franqueado',
                                                    })}
                                                    disabled={order.status === 'shipping' || order.status === 'delivered'}
                                                    className="rounded-lg gap-2"
                                                >
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

            {despachando && (
                <DespacharCargaDialog
                    open={!!despachando}
                    onOpenChange={(v) => !v && setDespachando(null)}
                    franchiseeOrderId={despachando.id}
                    franchiseeName={despachando.name}
                    rotas={rotasDoDia}
                />
            )}

            {editando && (
                <EditOrderDialog
                    open={!!editando}
                    onOpenChange={(v) => !v && setEditando(null)}
                    orderId={editando.id}
                    originalSubtotal={editando.subtotal}
                    originalAdvertisingFee={editando.advertising_fee}
                    paymentMethod={editando.payment_method}
                />
            )}
        </div>
    );
};

export default OrderManagement;
