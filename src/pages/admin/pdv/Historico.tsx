
import { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
    Search, Eye, Printer, ShoppingBag, Bike, TrendingUp, Users, Filter, RefreshCw, FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { FiscalDocumentPanel } from '@/components/fiscal/FiscalDocumentPanel';
import { format } from 'date-fns';
import { usePdvHistory, labelPayment, type HistoryFilters, type UnifiedSaleRecord } from '@/hooks/pdv/usePdvHistory';
import { usePdvSettings } from '@/hooks/pdv/usePdvSettings';
import { qzPrinter } from '@/lib/qz-printer';
import { generateReceiptHtml } from '@/lib/receipt-generator';

// ── helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function statusLabel(status: string) {
    switch (status) {
        case 'paid':             return { label: 'Pago',       variant: 'default' as const };
        case 'delivered':        return { label: 'Entregue',   variant: 'default' as const };
        case 'cancelled':        return { label: 'Cancelado',  variant: 'destructive' as const };
        case 'open':             return { label: 'Aberto',     variant: 'secondary' as const };
        case 'pending':          return { label: 'Pendente',   variant: 'secondary' as const };
        case 'out_for_delivery': return { label: 'Em rota',    variant: 'secondary' as const };
        default:                 return { label: status,       variant: 'outline' as const };
    }
}

function orderTypeLabel(type?: string) {
    switch (type) {
        case 'pickup':  return 'Retirada';
        case 'dine_in': return 'Mesa';
        default:        return 'Delivery';
    }
}

// ── component ──────────────────────────────────────────────────────────────────
export default function Historico() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const thirtyDaysAgo = format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

    // Padrão: o dia atual (não os últimos 30 dias) — o histórico abre mostrando
    // apenas as vendas de hoje. Para ver períodos anteriores, o usuário ajusta
    // as datas e clica em Buscar.
    const [dateFrom, setDateFrom]           = useState(today);
    const [dateTo, setDateTo]               = useState(today);
    const [canal, setCanal]                 = useState<HistoryFilters['canal']>('all');
    const [paymentMethod, setPaymentMethod] = useState('all');
    const [search, setSearch]               = useState('');
    const [selectedOrder, setSelectedOrder] = useState<UnifiedSaleRecord | null>(null);

    // Applied filters — only update when user clicks Buscar
    const [appliedFilters, setAppliedFilters] = useState<HistoryFilters>({
        dateFrom: today,
        dateTo: today,
        canal: 'all',
        paymentMethod: 'all',
    });

    const { historyData, isLoading, refetch } = usePdvHistory(appliedFilters);
    const { settings } = usePdvSettings();

    const applyFilters = () => {
        setAppliedFilters({ dateFrom, dateTo, canal, paymentMethod });
    };

    // ── client-side search ────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        if (!search.trim()) return historyData;
        const q = search.toLowerCase();
        return historyData.filter(r =>
            r.customer_name.toLowerCase().includes(q) ||
            r.order_number.toLowerCase().includes(q) ||
            labelPayment(r.payment_method, r.canal).toLowerCase().includes(q)
        );
    }, [historyData, search]);

    // ── summary stats ─────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const pdv = filtered.filter(r => r.canal === 'PDV');
        const delivery = filtered.filter(r => r.canal === 'Delivery');
        const totalPdv = pdv.reduce((s, r) => s + r.total, 0);
        const totalDelivery = delivery.reduce((s, r) => s + r.total, 0);
        const grand = totalPdv + totalDelivery;
        const count = filtered.length;
        return { totalPdv, totalDelivery, grand, count, pdvCount: pdv.length, deliveryCount: delivery.length };
    }, [filtered]);

    // ── PDF export ────────────────────────────────────────────────────────────
    const exportPdf = () => {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const W = doc.internal.pageSize.getWidth();
        const fmtDate = (d?: string) => d?.split('-').reverse().join('/') ?? '';
        const now = new Date().toLocaleString('pt-BR');

        const BLUE: [number, number, number]   = [30, 64, 175];
        const LBLUE: [number, number, number]  = [59, 130, 246];
        const ORANGE: [number, number, number] = [234, 88, 12];
        const GREEN: [number, number, number]  = [22, 163, 74];
        const GRAY: [number, number, number]   = [100, 116, 139];
        const LGRAY: [number, number, number]  = [248, 250, 252];
        const WHITE: [number, number, number]  = [255, 255, 255];

        // ── Faixa de cabeçalho ──────────────────────────────────────────────
        doc.setFillColor(...BLUE);
        doc.rect(0, 0, W, 28, 'F');

        // Título
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...WHITE);
        doc.text('Extrato Consolidado', 14, 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(180, 210, 255);
        doc.text('PDV + Delivery — visão financeira unificada', 14, 19);

        // Período e data no lado direito
        doc.setFontSize(8);
        doc.setTextColor(...WHITE);
        doc.text(`Período: ${fmtDate(appliedFilters.dateFrom)} a ${fmtDate(appliedFilters.dateTo)}`, W - 14, 12, { align: 'right' });
        doc.text(`Gerado em: ${now}`, W - 14, 19, { align: 'right' });

        // Linha decorativa sob cabeçalho
        doc.setDrawColor(...LBLUE);
        doc.setLineWidth(0.4);
        doc.line(0, 28, W, 28);

        // ── Cartões de resumo (3 caixas lado a lado) ────────────────────────
        const cardY = 33;
        const cardH = 24;
        const cardW = (W - 28 - 8) / 3; // 3 cards com gap de 4mm
        const cards = [
            { label: 'VENDAS PDV', value: fmt(stats.totalPdv), sub: `${stats.pdvCount} vendas`, color: LBLUE },
            { label: 'VENDAS DELIVERY', value: fmt(stats.totalDelivery), sub: `${stats.deliveryCount} pedidos`, color: ORANGE },
            { label: 'FATURAMENTO TOTAL', value: fmt(stats.grand), sub: `${stats.count} transações`, color: GREEN },
        ];

        cards.forEach((card, i) => {
            const x = 14 + i * (cardW + 4);
            // Borda colorida à esquerda
            doc.setFillColor(...card.color);
            doc.rect(x, cardY, 2.5, cardH, 'F');
            // Fundo do card
            doc.setFillColor(...LGRAY);
            doc.rect(x + 2.5, cardY, cardW - 2.5, cardH, 'F');
            // Label
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(...GRAY);
            doc.text(card.label, x + 5, cardY + 6);
            // Valor
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(...card.color);
            doc.text(card.value, x + 5, cardY + 15);
            // Sub
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(...GRAY);
            doc.text(card.sub, x + 5, cardY + 21);
        });

        // ── Tabela de transações ────────────────────────────────────────────
        const tableStartY = cardY + cardH + 5;

        autoTable(doc, {
            startY: tableStartY,
            margin: { left: 14, right: 14 },
            head: [['Pedido', 'Canal', 'Cliente', 'Pagamento', 'Data/Hora', 'Status', 'Total (R$)']],
            body: filtered.map(sale => [
                `#${sale.order_number}`,
                sale.canal,
                sale.customer_name,
                labelPayment(sale.payment_method, sale.canal),
                new Date(sale.created_at).toLocaleString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                }),
                statusLabel(sale.status).label,
                fmt(sale.total),
            ]),
            foot: [['', '', '', '', '', 'TOTAL GERAL', fmt(stats.grand)]],
            styles: {
                fontSize: 8,
                cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
                textColor: [30, 41, 59],
                lineColor: [226, 232, 240],
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: BLUE,
                textColor: WHITE,
                fontStyle: 'bold',
                fontSize: 8,
                cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
            },
            alternateRowStyles: { fillColor: LGRAY },
            footStyles: {
                fillColor: [15, 23, 42],
                textColor: WHITE,
                fontStyle: 'bold',
                fontSize: 9,
            },
            columnStyles: {
                0: { cellWidth: 24 },
                1: { cellWidth: 22 },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 36 },
                4: { cellWidth: 30 },
                5: { cellWidth: 24 },
                6: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
            },
            // Pintar badge de canal
            didParseCell(data) {
                if (data.section === 'body' && data.column.index === 1) {
                    const v = data.cell.raw as string;
                    data.cell.styles.textColor = v === 'PDV' ? LBLUE : ORANGE;
                    data.cell.styles.fontStyle = 'bold';
                }
                if (data.section === 'foot' && data.column.index === 5) {
                    data.cell.styles.halign = 'right';
                }
                if (data.section === 'foot' && data.column.index === 6) {
                    data.cell.styles.halign = 'right';
                }
            },
            // Número de páginas no rodapé
            didDrawPage(data) {
                const pageCount = (doc as any).internal.getNumberOfPages();
                const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber;
                doc.setFontSize(7);
                doc.setTextColor(...GRAY);
                doc.text(
                    `Página ${pageNum} de ${pageCount}`,
                    W / 2,
                    doc.internal.pageSize.getHeight() - 5,
                    { align: 'center' }
                );
                doc.text('Açaí no Grau — Relatório gerado automaticamente', 14, doc.internal.pageSize.getHeight() - 5);
            },
        });

        const fileName = `extrato-${appliedFilters.dateFrom ?? 'inicio'}-a-${appliedFilters.dateTo ?? 'fim'}.pdf`;
        doc.save(fileName);
        toast.success('PDF exportado com sucesso!');
    };

    // ── print handler (PDV only) ──────────────────────────────────────────────
    const handlePrint = async (order: UnifiedSaleRecord) => {
        if (order.canal === 'Delivery') { toast.info('Reimpressão disponível apenas para vendas PDV.'); return; }
        if (!settings?.qz_printer_name) { toast.error('Nenhuma impressora configurada.'); return; }
        try {
            const html = generateReceiptHtml(order as any);
            await qzPrinter.printHtml(settings.qz_printer_name, html);
            toast.success('Enviado para impressão!');
        } catch { toast.error('Falha ao imprimir.'); }
    };

    // ── render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Extrato Consolidado</h2>
                    <p className="text-muted-foreground">PDV + Delivery em uma única visão financeira.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={exportPdf} disabled={isLoading || filtered.length === 0}>
                        <FileDown className="h-4 w-4" />
                        Exportar PDF
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* ── Filters ── */}
            <Card>
                <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Filter className="h-4 w-4" /> Filtros
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                        <div className="space-y-1">
                            <Label className="text-xs">Data inicial</Label>
                            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Data final</Label>
                            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Canal</Label>
                            <Select value={canal} onValueChange={v => setCanal(v as any)}>
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="pdv">PDV</SelectItem>
                                    <SelectItem value="delivery">Delivery</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Pagamento</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos</SelectItem>
                                    <SelectItem value="money">Dinheiro (PDV)</SelectItem>
                                    <SelectItem value="dinheiro">Dinheiro (Delivery)</SelectItem>
                                    <SelectItem value="credit">Crédito (PDV)</SelectItem>
                                    <SelectItem value="credit_card">Crédito (Delivery)</SelectItem>
                                    <SelectItem value="debit">Débito (PDV)</SelectItem>
                                    <SelectItem value="pix">PIX</SelectItem>
                                    <SelectItem value="online">Online</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="h-8 gap-2" onClick={applyFilters} disabled={isLoading}>
                            <Search className="h-3.5 w-3.5" />
                            Buscar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ── Summary cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-primary">
                    <CardContent className="pt-4 pb-4 px-4">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" />Faturamento Total</p>
                        <p className="text-2xl font-bold text-primary mt-1">{fmt(stats.grand)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stats.count} vendas</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4 pb-4 px-4">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><ShoppingBag className="h-3 w-3" />Total PDV</p>
                        <p className="text-2xl font-bold text-blue-600 mt-1">{fmt(stats.totalPdv)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stats.pdvCount} vendas
                            {stats.pdvCount > 0 && ` · TM ${fmt(stats.totalPdv / stats.pdvCount)}`}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="pt-4 pb-4 px-4">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Bike className="h-3 w-3" />Total Delivery</p>
                        <p className="text-2xl font-bold text-orange-500 mt-1">{fmt(stats.totalDelivery)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stats.deliveryCount} pedidos
                            {stats.deliveryCount > 0 && ` · TM ${fmt(stats.totalDelivery / stats.deliveryCount)}`}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-4 px-4">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Ticket Médio Geral</p>
                        <p className="text-2xl font-bold mt-1">{stats.count > 0 ? fmt(stats.grand / stats.count) : '—'}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Delivery: {stats.grand > 0 ? ((stats.totalDelivery / stats.grand) * 100).toFixed(0) : 0}% do total
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ── Table ── */}
            <Card>
                <CardHeader className="pb-3 pt-4">
                    <div className="flex items-center justify-between gap-4">
                        <CardTitle className="text-base">Vendas ({filtered.length})</CardTitle>
                        <div className="relative w-60">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Buscar cliente, pedido..." className="pl-8 h-8 text-sm"
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-28">Pedido</TableHead>
                                <TableHead className="w-24">Canal</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Pagamento</TableHead>
                                <TableHead>Data/Hora</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="w-16" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                        Carregando...
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                                        Nenhuma venda encontrada para os filtros selecionados.
                                    </TableCell>
                                </TableRow>
                            ) : filtered.map(sale => {
                                const st = statusLabel(sale.status);
                                return (
                                    <TableRow key={`${sale.canal}-${sale.id}`} className="hover:bg-muted/30">
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            #{sale.order_number}
                                        </TableCell>
                                        <TableCell>
                                            {sale.canal === 'PDV' ? (
                                                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 gap-1 text-xs">
                                                    <ShoppingBag className="h-3 w-3" /> PDV
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50 gap-1 text-xs">
                                                    <Bike className="h-3 w-3" /> {orderTypeLabel(sale.order_type)}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-medium max-w-[140px] truncate">
                                            {sale.customer_name}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {labelPayment(sale.payment_method, sale.canal)}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                            {new Date(sale.created_at).toLocaleString('pt-BR', {
                                                day: '2-digit', month: '2-digit',
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {fmt(sale.total)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedOrder(sale)}>
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                {sale.canal === 'PDV' && (
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePrint(sale)}>
                                                        <Printer className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ── Detail dialog ── */}
            <Dialog open={!!selectedOrder} onOpenChange={open => !open && setSelectedOrder(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedOrder?.canal === 'PDV'
                                ? <><ShoppingBag className="h-4 w-4 text-blue-500" /> Venda PDV</>
                                : <><Bike className="h-4 w-4 text-orange-500" /> Pedido Delivery</>}
                        </DialogTitle>
                        <DialogDescription>
                            #{selectedOrder?.order_number} · {selectedOrder && new Date(selectedOrder.created_at).toLocaleString('pt-BR')}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Cliente</span>
                                    <span className="font-medium">{selectedOrder.customer_name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Pagamento</span>
                                    <span>{labelPayment(selectedOrder.payment_method, selectedOrder.canal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Canal</span>
                                    <span>{selectedOrder.canal}</span>
                                </div>
                                {selectedOrder.order_type && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tipo</span>
                                        <span>{orderTypeLabel(selectedOrder.order_type)}</span>
                                    </div>
                                )}
                            </div>

                            {selectedOrder.items && selectedOrder.items.length > 0 && (
                                <div className="border rounded-md divide-y max-h-48 overflow-auto">
                                    {selectedOrder.items.map((item: any, i: number) => (
                                        <div key={item.id || i} className="flex justify-between p-3 text-sm">
                                            <span><span className="font-semibold">{item.quantity}×</span> {item.product_name}</span>
                                            <span>{fmt(item.total_price || 0)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Separator />
                            <div className="flex justify-between text-lg font-bold">
                                <span>Total</span>
                                <span>{fmt(selectedOrder.total)}</span>
                            </div>

                            <Separator />
                            <FiscalDocumentPanel
                                orderId={selectedOrder.canal === 'PDV' ? undefined : String(selectedOrder.id)}
                                pdvOrderId={selectedOrder.canal === 'PDV' ? String(selectedOrder.id) : undefined}
                                defaultTipo="NFCE"
                            />

                            {selectedOrder.canal === 'PDV' && (
                                <Button className="w-full gap-2" onClick={() => handlePrint(selectedOrder)}>
                                    <Printer className="h-4 w-4" /> Reimprimir
                                </Button>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
