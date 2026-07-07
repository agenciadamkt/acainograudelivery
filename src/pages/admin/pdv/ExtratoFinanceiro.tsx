'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Filter, HelpCircle, Wallet, ArrowUpRight, ArrowDownLeft, Clock, Search, X, FileText, Table as TableIcon } from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';
import { useExtratoFinanceiro } from '@/hooks/pdv/useExtratoFinanceiro';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

function fmt(n: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

export default function ExtratoFinanceiro() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

    const [dateFrom, setDateFrom] = useState(monthStart);
    const [dateTo, setDateTo] = useState(today);
    const [searchTerm, setSearchTerm] = useState('');

    const [appliedFilters, setAppliedFilters] = useState({
        dateFrom: monthStart,
        dateTo: today,
    });

    const { data: extratoData = [], isLoading } = useExtratoFinanceiro(appliedFilters);

    const applyFilters = () => {
        setAppliedFilters({ dateFrom, dateTo });
    };

    const setQuickPeriod = (days: number) => {
        const from = format(subDays(new Date(), days), 'yyyy-MM-dd');
        setDateFrom(from);
        setDateTo(today);
        setAppliedFilters({ dateFrom: from, dateTo: today });
    };

    // Filter by search
    const filtered = useMemo(() => {
        if (!searchTerm.trim()) return extratoData;
        const q = searchTerm.toLowerCase();
        return extratoData.filter(item => 
            item.title.toLowerCase().includes(q) ||
            item.details.toLowerCase().includes(q)
        );
    }, [extratoData, searchTerm]);

    // Calculate totals
    const totals = useMemo(() => {
        let entradas = 0;
        let saidas = 0;
        
        filtered.forEach(item => {
            if (item.value > 0) entradas += item.value;
            if (item.value < 0) saidas += Math.abs(item.value);
        });

        return {
            entradas,
            saidas,
            saldoBruto: entradas, // according to screenshot, saldo bruto = entradas
            saldoLiquido: entradas - saidas
        };
    }, [filtered]);

    // --- Export PDF ---
    const exportPdf = () => {
        if (filtered.length === 0) {
            toast.error('Não há dados para exportar.');
            return;
        }

        const doc = new jsPDF({ orientation: 'portrait' });
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Relatório Financeiro', 14, 15);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Período: ${format(new Date(appliedFilters.dateFrom + 'T12:00'), 'dd/MM/yyyy')} a ${format(new Date(appliedFilters.dateTo + 'T12:00'), 'dd/MM/yyyy')}`, 14, 22);

        function getMethod(item: any) {
            if (item.type === 'fundo_caixa' || item.type === 'retirada') return 'Dinheiro';
            if (!item.payment_method) return 'Outro';
            const p = item.payment_method;
            if (p.includes('credit')) return 'Crédito';
            if (p.includes('debit')) return 'Débito';
            if (p.includes('pix')) return 'PIX';
            if (p === 'money' || p === 'dinheiro') return 'Dinheiro';
            if (p === 'online') return 'Online';
            return 'Outro';
        }

        // Aggregate Data
        const byMethod: Record<string, number> = {};
        const byDay: Record<string, { total: number; methods: Record<string, number> }> = {};

        filtered.forEach(item => {
            if (item.value === 0) return;
            const day = format(new Date(item.date), 'dd/MM/yyyy');
            const method = getMethod(item);

            byMethod[method] = (byMethod[method] || 0) + item.value;

            if (!byDay[day]) byDay[day] = { total: 0, methods: {} };
            byDay[day].total += item.value;
            byDay[day].methods[method] = (byDay[day].methods[method] || 0) + item.value;
        });

        let currentY = 30;

        // 1. Resumo Geral
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumo Geral por Forma de Pagamento', 14, currentY);
        
        const methodData = Object.entries(byMethod).map(([m, v]) => [m, fmt(v)]);
        methodData.push(['TOTAL LÍQUIDO', fmt(totals.saldoLiquido)]);

        autoTable(doc, {
            startY: currentY + 4,
            head: [['Forma de Pagamento', 'Valor Total']],
            body: methodData,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [30, 64, 175] },
            didParseCell: (data) => {
                if (data.row.index === methodData.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [240, 245, 255];
                }
            }
        });
        currentY = (doc as any).lastAutoTable.finalY + 12;

        // 2. Resumo por Dia
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumo por Dia', 14, currentY);

        const dayData: any[] = [];
        Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])).forEach(([day, data]) => {
            dayData.push([day, 'SUB-TOTAL DO DIA', fmt(data.total)]);
            Object.entries(data.methods).forEach(([m, v]) => {
                dayData.push(['', m, fmt(v)]);
            });
        });

        autoTable(doc, {
            startY: currentY + 4,
            head: [['Data', 'Forma / Tipo', 'Valor']],
            body: dayData,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [234, 88, 12] },
            didParseCell: (data) => {
                if (data.row.raw[1] === 'SUB-TOTAL DO DIA') {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [255, 247, 237];
                }
            }
        });
        currentY = (doc as any).lastAutoTable.finalY + 12;

        // 3. Extrato Detalhado
        doc.addPage();
        currentY = 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Extrato Detalhado (Todas as Movimentações)', 14, currentY);

        const tableData = filtered.map(item => [
            format(new Date(item.date), 'dd/MM/yyyy HH:mm'),
            item.title,
            item.details,
            fmt(item.value)
        ]);

        autoTable(doc, {
            startY: currentY + 4,
            head: [['Data', 'Movimentação', 'Detalhes', 'Valor']],
            body: tableData,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [22, 163, 74] },
        });

        doc.save(`relatorio-financeiro-${appliedFilters.dateFrom}-a-${appliedFilters.dateTo}.pdf`);
        toast.success('PDF exportado com sucesso!');
    };

    // --- Export Excel (CSV) ---
    const exportExcel = () => {
        if (filtered.length === 0) {
            toast.error('Não há dados para exportar.');
            return;
        }

        function getMethod(item: any) {
            if (item.type === 'fundo_caixa' || item.type === 'retirada') return 'Dinheiro';
            if (!item.payment_method) return 'Outro';
            const p = item.payment_method;
            if (p.includes('credit')) return 'Crédito';
            if (p.includes('debit')) return 'Débito';
            if (p.includes('pix')) return 'PIX';
            if (p === 'money' || p === 'dinheiro') return 'Dinheiro';
            if (p === 'online') return 'Online';
            return 'Outro';
        }

        const byDay: Record<string, { total: number; methods: Record<string, number> }> = {};
        filtered.forEach(item => {
            if (item.value === 0) return;
            const day = format(new Date(item.date), 'dd/MM/yyyy');
            const method = getMethod(item);
            if (!byDay[day]) byDay[day] = { total: 0, methods: {} };
            byDay[day].total += item.value;
            byDay[day].methods[method] = (byDay[day].methods[method] || 0) + item.value;
        });

        const csvLines = [];
        csvLines.push('RELATORIO FINANCEIRO');
        csvLines.push(`Periodo:;${format(new Date(appliedFilters.dateFrom + 'T12:00'), 'dd/MM/yyyy')} a ${format(new Date(appliedFilters.dateTo + 'T12:00'), 'dd/MM/yyyy')}`);
        csvLines.push('');

        csvLines.push('RESUMO POR DIA E FORMA DE PAGAMENTO');
        csvLines.push('Data;Forma de Pagamento;Valor');
        Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])).forEach(([day, data]) => {
            csvLines.push(`${day};SUB-TOTAL DO DIA;${data.total.toString().replace('.', ',')}`);
            Object.entries(data.methods).forEach(([m, v]) => {
                csvLines.push(`;${m};${v.toString().replace('.', ',')}`);
            });
        });
        csvLines.push('');

        csvLines.push('EXTRATO DETALHADO');
        csvLines.push('Data;Movimentacao;Detalhes;Valor');
        filtered.forEach(item => {
            csvLines.push([
                format(new Date(item.date), 'dd/MM/yyyy HH:mm'),
                `"${item.title.replace(/"/g, '""')}"`,
                `"${item.details.replace(/"/g, '""')}"`,
                item.value.toString().replace('.', ',')
            ].join(';'));
        });

        const csvContent = csvLines.join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio-financeiro-${appliedFilters.dateFrom}-a-${appliedFilters.dateTo}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success('Excel exportado com sucesso!');
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto py-6">
            <div className="flex flex-col gap-4 lg:flex-row justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-primary">
                        Extrato financeiro
                    </h2>
                    <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
                        Aqui você pode obter um controle melhor das saídas e entradas que foram realizadas durante o mês em seu caixa.
                    </p>
                </div>
                <Button variant="outline" className="gap-2 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary">
                    <HelpCircle className="w-4 h-4" /> Tutoriais e ajuda
                </Button>
            </div>

            <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary">
                    <Filter className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-2 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary">
                            <Download className="h-4 w-4" /> EXPORTAR
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem onClick={exportPdf} className="gap-2 cursor-pointer">
                            <FileText className="h-4 w-4" /> PDF (.pdf)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportExcel} className="gap-2 cursor-pointer">
                            <TableIcon className="h-4 w-4" /> Excel (.csv)
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Quick Filters / Period Selection */}
            <Card className="shadow-sm border">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-end gap-4">
                        <div className="space-y-1.5 flex-1 min-w-[200px]">
                            <label className="text-xs font-semibold text-muted-foreground">Movimentação</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Procurar movimentação" 
                                    className="pl-9 h-9" 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => setSearchTerm('')}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground">Data Inicial</label>
                                <Input type="date" className="h-9" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground">Data Final</label>
                                <Input type="date" className="h-9" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                            </div>
                            <Button variant="default" className="h-9 mt-auto">
                                APLICAR
                            </Button>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                        <Button variant="secondary" size="sm" className="h-7 text-xs rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:text-primary" onClick={() => setQuickPeriod(0)}>Hoje</Button>
                        <Button variant="secondary" size="sm" className="h-7 text-xs rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:text-primary" onClick={() => setQuickPeriod(1)}>Ontem</Button>
                        <Button variant="secondary" size="sm" className="h-7 text-xs rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:text-primary" onClick={() => setQuickPeriod(7)}>Últimos 7 dias</Button>
                        <Button variant="secondary" size="sm" className="h-7 text-xs rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:text-primary" onClick={() => setQuickPeriod(15)}>Últimos 15 dias</Button>
                        <Button variant="secondary" size="sm" className="h-7 text-xs rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 hover:text-primary" onClick={() => setQuickPeriod(30)}>Últimos 30 dias</Button>
                    </div>
                </CardContent>
            </Card>

            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-sm font-semibold mb-1">Entradas</p>
                        <p className="text-lg font-bold text-primary">{fmt(totals.entradas)}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-sm font-semibold mb-1">Saídas</p>
                        <p className="text-lg font-bold text-destructive">- {fmt(totals.saidas)}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-sm font-semibold mb-1">Saldo bruto</p>
                        <p className="text-lg font-bold text-primary">{fmt(totals.saldoBruto)}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 text-center">
                        <p className="text-sm font-semibold mb-1">Saldo líquido</p>
                        <p className="text-lg font-bold text-primary">{fmt(totals.saldoLiquido)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Transaction List */}
            <Card className="shadow-sm">
                <div className="px-4 py-3 border-b flex justify-between items-center text-xs font-semibold text-muted-foreground bg-muted/20">
                    <div className="w-[60%]">Detalhes</div>
                    <div className="w-[20%] text-right">Valor</div>
                    <div className="w-[20%] text-right">Data</div>
                </div>
                
                <div className="divide-y max-h-[600px] overflow-auto">
                    {isLoading ? (
                        <div className="p-8 text-center text-muted-foreground">Carregando extrato...</div>
                    ) : filtered.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">Nenhuma movimentação encontrada neste período.</div>
                    ) : (
                        filtered.map((item) => (
                            <div key={item.id} className="p-4 flex justify-between items-center hover:bg-primary/5 transition-colors">
                                <div className="w-[60%] flex gap-3 items-start">
                                    <div className="mt-0.5">
                                        {item.type === 'pedido' && <Wallet className="h-5 w-5 text-primary" />}
                                        {item.type === 'fundo_caixa' && <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 p-0 h-6 w-8 flex items-center justify-center rounded"><Wallet className="h-3 w-3" /></Badge>}
                                        {item.type === 'retirada' && <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 p-0 h-6 w-8 flex items-center justify-center rounded"><Wallet className="h-3 w-3" /></Badge>}
                                        {(item.type === 'abertura' || item.type === 'fechamento') && <Clock className="h-5 w-5 text-muted-foreground" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">{item.title}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                            {item.details}
                                        </p>
                                    </div>
                                </div>
                                <div className={`w-[20%] text-right text-sm font-bold ${
                                    item.color === 'green' ? 'text-primary' : item.color === 'red' ? 'text-destructive' : 'text-muted-foreground'
                                }`}>
                                    {item.value !== 0 ? (
                                        item.value > 0 ? fmt(item.value) : `- ${fmt(Math.abs(item.value))}`
                                    ) : '-'}
                                </div>
                                <div className="w-[20%] text-right text-xs text-muted-foreground">
                                    {format(new Date(item.date), 'HH:mm dd/MM/yy')}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
}
