
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, Search, Eye, Printer, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePdvHistory } from '@/hooks/pdv/usePdvHistory';
import { usePdvSettings } from '@/hooks/pdv/usePdvSettings';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { qzPrinter } from '@/lib/qz-printer';
import { generateReceiptHtml } from '@/lib/receipt-generator';

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function translateStatus(status: string) {
    switch (status) {
        case 'paid': return 'Pago';
        case 'open': return 'Aberto';
        case 'cancelled': return 'Cancelado';
        default: return status;
    }
}

function translatePayment(method: string) {
    switch (method) {
        case 'money': return 'Dinheiro';
        case 'credit': return 'Crédito';
        case 'debit': return 'Débito';
        case 'pix': return 'PIX';
        default: return method;
    }
}

export default function Historico() {
    const { historyData, isLoading } = usePdvHistory();
    const { settings } = usePdvSettings();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);

    const filteredData = historyData?.filter(order =>
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.includes(searchTerm) ||
        translatePayment(order.payment_method).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePrint = async (order: any) => {
        if (!settings?.qz_printer_name) {
            toast.error("Nenhuma impressora configurada.");
            return;
        }

        try {
            // For history, order.items is available
            const html = generateReceiptHtml(order);
            await qzPrinter.printHtml(settings.qz_printer_name, html);
            toast.success("Enviado para impressão!");
        } catch (err) {
            console.error(err);
            toast.error("Falha ao imprimir.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Histórico de Vendas</h2>
                    <p className="text-muted-foreground">Últimas 50 vendas registradas no PDV.</p>
                </div>
                <div className="flex gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar pedido, cliente..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">ID</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Pagamento</TableHead>
                                <TableHead>Data/Hora</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24">Carregando histórico...</TableCell>
                                </TableRow>
                            ) : filteredData?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Nenhuma venda encontrada.</TableCell>
                                </TableRow>
                            ) : (
                                filteredData?.map((sale: any) => (
                                    <TableRow key={sale.id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">#{sale.id.slice(0, 8)}</TableCell>
                                        <TableCell className="font-medium">{sale.customer_name || 'Cliente Balcão'}</TableCell>
                                        <TableCell>{translatePayment(sale.payment_method)}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {new Date(sale.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={sale.status === 'paid' ? 'default' : sale.status === 'cancelled' ? 'destructive' : 'secondary'}>
                                                {translateStatus(sale.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-base">{formatCurrency(sale.total)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(sale)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Order Details Dialog */}
            <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Pedido</DialogTitle>
                        <DialogDescription>ID: <span className="font-mono">{selectedOrder?.id}</span></DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="bg-muted p-3 rounded-lg flex justify-between items-center text-sm">
                                <span>Data: {new Date(selectedOrder.created_at).toLocaleString()}</span>
                                <Badge variant="outline">{translateStatus(selectedOrder.status)}</Badge>
                            </div>

                            <div className="border rounded-md divide-y max-h-60 overflow-auto">
                                {selectedOrder.items?.map((item: any) => (
                                    <div key={item.id} className="flex justify-between p-3 text-sm">
                                        <div>
                                            <span className="font-semibold">{item.quantity}x </span>
                                            <span>{item.product_name}</span>
                                        </div>
                                        <span>{formatCurrency(item.total_price)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-1 text-right pt-2 border-t">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(selectedOrder.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total</span>
                                    <span>{formatCurrency(selectedOrder.total)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-green-600 font-medium pt-1">
                                    <span>Pago via {translatePayment(selectedOrder.payment_method)}</span>
                                    <span>{formatCurrency(selectedOrder.amount_paid)}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button className="flex-1 gap-2" onClick={() => handlePrint(selectedOrder)}>
                                    <Printer className="h-4 w-4" /> Imprimir Comprovante
                                </Button>
                                {selectedOrder.status !== 'cancelled' && (
                                    <Button variant="destructive" size="icon">
                                        <XCircle className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
