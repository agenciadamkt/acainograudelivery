import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Customer } from "@/hooks/useCustomers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, DollarSign, ShoppingBag, Clock } from "lucide-react";

interface CustomerDetailsDialogProps {
    customer: Customer | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CustomerDetailsDialog({
    customer,
    open,
    onOpenChange,
}: CustomerDetailsDialogProps) {
    const { data: orders, isLoading } = useQuery({
        queryKey: ["customer-orders", customer?.id],
        queryFn: async () => {
            if (!customer?.id) return [];
            const { data, error } = await supabase
                .from("orders")
                .select("*")
                .eq("customer_id", customer.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!customer?.id,
    });

    if (!customer) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        Details do Cliente
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-6">
                    {/* Header Info */}
                    <div className="flex flex-col md:flex-row justify-between gap-4 p-4 bg-muted/30 rounded-lg">
                        <div>
                            <h2 className="text-xl font-bold">{customer.name}</h2>
                            <p className="text-muted-foreground">{customer.phone || 'Sem telefone'}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                Cadastrado em {format(new Date(customer.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Card className="w-32 bg-primary/5 border-primary/20">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <div className="p-2 bg-primary/10 rounded-full mb-2">
                                        <ShoppingBag className="w-4 h-4 text-primary" />
                                    </div>
                                    <span className="text-2xl font-bold">{customer.orders_count}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">Pedidos</span>
                                </CardContent>
                            </Card>

                            <Card className="w-32 bg-green-500/5 border-green-500/20">
                                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                                    <div className="p-2 bg-green-500/10 rounded-full mb-2">
                                        <DollarSign className="w-4 h-4 text-green-600" />
                                    </div>
                                    <span className="text-xl font-bold text-green-600">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(customer.total_spent)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold">LTV (Gasto)</span>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Histórico de Pedidos */}
                    <div>
                        <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Histórico de Pedidos
                        </h3>

                        {isLoading ? (
                            <div className="text-center py-8 text-muted-foreground">Carregando histórico...</div>
                        ) : !orders || orders.length === 0 ? (
                            <div className="text-center py-8 border rounded-lg bg-muted/20">
                                Este cliente ainda não fez pedidos.
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 text-left">
                                        <tr>
                                            <th className="p-3 font-medium text-muted-foreground">Data</th>
                                            <th className="p-3 font-medium text-muted-foreground">Status</th>
                                            <th className="p-3 font-medium text-muted-foreground text-right">Valor</th>
                                            <th className="p-3 font-medium text-muted-foreground">Pagamento</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {orders.map((order: any) => (
                                            <tr key={order.id} className="hover:bg-muted/30">
                                                <td className="p-3">
                                                    <div className="font-medium">
                                                        {format(new Date(order.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {format(new Date(order.created_at), "HH:mm")}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <Badge variant={
                                                        order.status === 'completed' ? 'default' :
                                                            order.status === 'canceled' ? 'destructive' :
                                                                order.status === 'pending' ? 'secondary' : 'outline'
                                                    }>
                                                        {order.status === 'completed' ? 'Concluído' :
                                                            order.status === 'canceled' ? 'Cancelado' :
                                                                order.status === 'pending' ? 'Pendente' : order.status}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 text-right font-medium">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total_amount)}
                                                </td>
                                                <td className="p-3">
                                                    <span className="capitalize text-muted-foreground">
                                                        {order.payment_method === 'credit_card' ? 'Cartão Crédito' :
                                                            order.payment_method === 'pix' ? 'PIX' : order.payment_method}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
