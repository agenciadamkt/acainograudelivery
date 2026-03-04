'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Download,
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import {
    format,
    subDays,
    eachDayOfInterval,
    parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DistributionCenterSelect from './components/DistributionCenterSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfBranding } from './utils/pdfBranding';

const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RevenueExpenseReportPage() {
    const today = new Date();
    const [dateStart, setDateStart] = useState(format(subDays(today, 7), 'yyyy-MM-dd'));
    const [dateEnd, setDateEnd] = useState(format(today, 'yyyy-MM-dd'));
    const [filterCD, setFilterCD] = useState('');

    /* ── Fetch Data ── */
    const { data: closings = [] } = useQuery({
        queryKey: ['report_grid_closings', dateStart, dateEnd, filterCD],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            let query = supabase
                .from('cash_closings' as any)
                .select('closing_date, total_cash, distribution_center:distribution_centers!inner(franchisee_user_id)')
                .gte('closing_date', dateStart)
                .lte('closing_date', dateEnd);

            if (filterCD) {
                query = query.eq('distribution_center_id', filterCD);
            } else {
                query = query.eq('distribution_center.franchisee_user_id', user?.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        }
    });

    const { data: expenses = [] } = useQuery({
        queryKey: ['report_grid_expenses', dateStart, dateEnd, filterCD],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            let query = supabase
                .from('expenses' as any)
                .select(`
                    expense_date, 
                    amount, 
                    chart_account:chart_of_accounts!chart_of_accounts_id(name),
                    distribution_center:distribution_centers!inner(franchisee_user_id)
                `)
                .gte('expense_date', dateStart)
                .lte('expense_date', dateEnd);

            if (filterCD) {
                query = query.eq('distribution_center_id', filterCD);
            } else {
                query = query.eq('distribution_center.franchisee_user_id', user?.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        }
    });

    /* ── Process Grid Data ── Reverted to Category-only grouping */
    const { dates, rows, grandTotal } = useMemo(() => {
        const dateInterval = eachDayOfInterval({
            start: parseISO(dateStart),
            end: parseISO(dateEnd)
        });

        const entradasRow: any = { id: 'entradas', label: 'ENTRADAS', isHeader: true, values: {} };
        const dinheiroRow: any = { id: 'dinheiro', label: 'Dinheiro', values: {} };
        const despesasHeader: any = { id: 'despesas_header', label: 'DESPESAS', isHeader: true, values: {} };

        const expenseMap: Record<string, any> = {};
        const dayEntries: Record<string, number> = {};
        const dayExpenses: Record<string, number> = {};

        dateInterval.forEach(d => {
            const dateStr = format(d, 'yyyy-MM-dd');
            dayEntries[dateStr] = 0;
            dayExpenses[dateStr] = 0;
        });

        closings.forEach(c => {
            const dateStr = c.closing_date;
            const val = Number(c.total_cash || 0);
            dinheiroRow.values[dateStr] = (dinheiroRow.values[dateStr] || 0) + val;
            dayEntries[dateStr] = (dayEntries[dateStr] || 0) + val;
        });

        expenses.forEach(e => {
            const dateStr = e.expense_date;
            const cat = e.chart_account?.name || 'Outras Despesas';
            const val = Number(e.amount || 0);

            if (!expenseMap[cat]) {
                expenseMap[cat] = { id: `exp_${cat}`, label: cat, values: {}, isExpense: true };
            }
            expenseMap[cat].values[dateStr] = (expenseMap[cat].values[dateStr] || 0) + val;
            dayExpenses[dateStr] = (dayExpenses[dateStr] || 0) + val;
        });

        const expenseRows = Object.values(expenseMap).sort((a, b) => a.label.localeCompare(b.label));

        const saldoDiaRow: any = { id: 'saldo_dia', label: 'Saldo do Dia', isFooter: true, values: {} };
        const saldoAcumuladoRow: any = { id: 'saldo_acumulado', label: 'SALDO', isGrandTotal: true, values: {} };

        let cumulative = 0;
        dateInterval.forEach(d => {
            const dateStr = format(d, 'yyyy-MM-dd');
            const dayBal = dayEntries[dateStr] - dayExpenses[dateStr];
            saldoDiaRow.values[dateStr] = dayBal;
            cumulative += dayBal;
            saldoAcumuladoRow.values[dateStr] = cumulative;
        });

        const allRows = [
            entradasRow,
            dinheiroRow,
            despesasHeader,
            ...expenseRows,
            saldoDiaRow,
            saldoAcumuladoRow
        ];

        allRows.forEach(row => {
            if (!row.isHeader) {
                row.total = Object.values(row.values).reduce((a: any, b: any) => a + (b || 0), 0) as number;
            }
        });

        return { dates: dateInterval, rows: allRows, grandTotal: cumulative };
    }, [dateStart, dateEnd, closings, expenses]);

    const handleExportPDF = async () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const startY = await addPdfBranding(doc, filterCD ? 'Relatório Filtrado' : 'Consolidado');

        doc.setFontSize(14);
        doc.text('RECEITAS X DESPESAS', 14, startY + 5);
        doc.setFontSize(10);
        doc.text(`Período: ${format(parseISO(dateStart), 'dd/MM/yyyy')} a ${format(parseISO(dateEnd), 'dd/MM/yyyy')}`, 14, startY + 12);

        // Splitting into chunks of 7 days (weekly) to avoid squashed columns
        const CHUNK_SIZE = 7;
        let currentY = startY + 20;

        for (let i = 0; i < dates.length; i += CHUNK_SIZE) {
            const chunk = dates.slice(i, i + CHUNK_SIZE);
            const isLastRange = (i + CHUNK_SIZE) >= dates.length;
            const totalCols = chunk.length + (isLastRange ? 2 : 1);

            const tableHead = [
                ['DISCRIMINAÇÃO', ...chunk.map(d => format(d, 'eee - dd', { locale: ptBR })), ...(isLastRange ? ['TOTAL'] : [])]
            ];

            const tableBody = rows.map(r => {
                if (r.isHeader) {
                    return [{
                        content: r.label,
                        colSpan: totalCols,
                        styles: { fillColor: [240, 240, 240], fontStyle: 'bold', halign: 'left' }
                    }];
                }
                return [
                    r.label,
                    ...chunk.map(d => {
                        const val = r.values[format(d, 'yyyy-MM-dd')];
                        return val ? val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-';
                    }),
                    ...(isLastRange ? [r.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })] : [])
                ];
            });

            // Page break check if the previous table was large
            if (i > 0) {
                const prevY = (doc as any).lastAutoTable?.finalY || currentY;
                if (prevY > 160) {
                    doc.addPage('a4', 'l');
                    currentY = await addPdfBranding(doc, filterCD ? 'Relatório Filtrado' : 'Consolidado');
                    // Repeat report header on new page
                    doc.setFontSize(11);
                    doc.setFont(doc.getFont().fontName, 'bold');
                    doc.text('RECEITAS X DESPESAS (CONTINUAÇÃO)', 14, currentY + 5);
                    currentY += 12;
                } else {
                    currentY = prevY + 12;
                }
            }

            autoTable(doc, {
                head: tableHead,
                body: tableBody as any,
                startY: currentY,
                styles: { fontSize: 7, cellPadding: 2, halign: 'center' },
                headStyles: { fillColor: [60, 60, 60] },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35, halign: 'left' },
                    [totalCols - 1]: { halign: 'right', fontStyle: 'bold' }
                },
                theme: 'grid',
                didParseCell: (data) => {
                    const rowIndex = data.row.index;
                    const rowData = rows[rowIndex];
                    if (rowData?.isFooter || rowData?.isGrandTotal || rowData?.isHeader) {
                        data.cell.styles.fontStyle = 'bold';
                        if (rowData.isGrandTotal) {
                            data.cell.styles.fillColor = [230, 240, 255];
                            data.cell.styles.textColor = [0, 102, 204];
                        }
                    }
                    if (data.column.index > 0 && data.column.index < totalCols - (isLastRange ? 1 : 0)) {
                        // Days columns alignment
                        data.cell.styles.halign = 'center';
                    }
                }
            });
        }

        doc.save(`relatorio_receitas_despesas_${dateStart}.pdf`);
    };

    return (
        <div className="p-4 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Receitas x Despesas</h1>
                    <p className="text-sm text-gray-500 dark:text-white/40">Relatório consolidado por período</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
                        <Download className="h-4 w-4" /> PDF
                    </Button>
                </div>
            </div>

            <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm p-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block uppercase">CD</label>
                        <DistributionCenterSelect value={filterCD} onChange={setFilterCD} placeholder="Todos os CDs" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block uppercase">Início</label>
                        <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block uppercase">Fim</label>
                        <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
                    </div>
                    <div className="flex items-end">
                        <Button variant="ghost" className="text-purple-600 h-10 px-0" onClick={() => {
                            const s = parseISO(dateStart);
                            const e = parseISO(dateEnd);
                            setDateStart(format(subDays(s, 7), 'yyyy-MM-dd'));
                            setDateEnd(format(subDays(e, 7), 'yyyy-MM-dd'));
                        }}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Semana Anterior
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr className="bg-gray-100 dark:bg-white/[0.05] border-b border-gray-200 dark:border-white/10">
                                <th className="px-4 py-3 text-left font-bold text-gray-700 dark:text-white sticky left-0 bg-gray-100 dark:bg-[#1A1A24] z-10 min-w-[180px]">
                                    DISCRIMINAÇÃO
                                </th>
                                {dates.map(d => (
                                    <th key={d.toString()} className="px-3 py-3 text-center font-medium text-gray-500 dark:text-white/40 min-w-[100px] border-l border-gray-200 dark:border-white/5">
                                        <span className="capitalize">{format(d, 'eee', { locale: ptBR })}</span>
                                        <div className="text-[10px]">{format(d, 'dd/MM')}</div>
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-right font-bold text-gray-700 dark:text-white border-l border-gray-200 dark:border-white/10 min-w-[120px]">
                                    TOTAL
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => {
                                if (row.isHeader) {
                                    return (
                                        <tr key={row.id} className="bg-gray-50/50 dark:bg-white/[0.02]">
                                            <td colSpan={dates.length + 2} className="px-4 py-2 font-bold text-purple-600 dark:text-purple-400 border-b border-gray-200 dark:border-white/5 tracking-wider">
                                                {row.label}
                                            </td>
                                        </tr>
                                    );
                                }

                                const isSpecial = row.isFooter || row.isGrandTotal;

                                return (
                                    <tr key={row.id} className={cn(
                                        "hover:bg-gray-50/30 dark:hover:bg-white/[0.01] transition-colors border-b border-gray-100 dark:border-white/5",
                                        row.isGrandTotal && "bg-blue-50/30 dark:bg-blue-900/5",
                                        row.isFooter && "bg-gray-50/80 dark:bg-white/[0.03]"
                                    )}>
                                        <td className={cn(
                                            "px-4 py-2.5 sticky left-0 z-10 bg-inherit border-r border-gray-200 dark:border-white/5",
                                            isSpecial ? "font-bold text-gray-900 dark:text-white" : "text-gray-600 dark:text-white/70",
                                            row.isGrandTotal && "text-blue-600 dark:text-blue-400"
                                        )}>
                                            {row.label}
                                        </td>
                                        {dates.map(date => {
                                            const dateStr = format(date, 'yyyy-MM-dd');
                                            const val = row.values[dateStr];
                                            return (
                                                <td key={dateStr} className={cn(
                                                    "px-3 py-2.5 text-center border-l border-gray-100 dark:border-white/5",
                                                    !val ? "text-gray-300 dark:text-white/10" : "text-gray-900 dark:text-white",
                                                    row.isExpense && val > 0 && "text-red-500 font-medium",
                                                    isSpecial && "font-bold"
                                                )}>
                                                    {val ? val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                            );
                                        })}
                                        <td className={cn(
                                            "px-4 py-2.5 text-right font-bold border-l border-gray-200 dark:border-white/10",
                                            row.isExpense && row.total > 0 && "text-red-600",
                                            row.isGrandTotal && "text-blue-700 dark:text-blue-400"
                                        )}>
                                            {formatBRL(row.total)}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
