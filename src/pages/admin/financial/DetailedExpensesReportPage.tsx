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
    ChevronLeft,
    Filter,
    Calendar as CalendarIcon,
    ArrowUpDown,
    Building2,
} from 'lucide-react';
import {
    format,
    subDays,
    eachDayOfInterval,
    parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DistributionCenterSelect from './components/DistributionCenterSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfBranding } from './utils/pdfBranding';
import { useFranchiseeId } from '@/hooks/useFranchiseeId';

const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function DetailedExpensesReportPage() {
    const today = new Date();
    const [dateStart, setDateStart] = useState(format(subDays(today, 7), 'yyyy-MM-dd'));
    const [dateEnd, setDateEnd] = useState(format(today, 'yyyy-MM-dd'));
    const [filterCD, setFilterCD] = useState('');

    const { data: franchiseeId } = useFranchiseeId();

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ['detailed_expenses_report', dateStart, dateEnd, filterCD, franchiseeId],
        queryFn: async () => {
            if (!franchiseeId) return [];

            let query = supabase
                .from('expenses' as any)
                .select(`
                    expense_date, 
                    amount, 
                    purpose,
                    chart_account:chart_of_accounts!chart_of_accounts_id(name),
                    cost_center:cost_centers!cost_center_id(name),
                    distribution_center:distribution_centers!inner(name, franchisee_user_id)
                `)
                .gte('expense_date', dateStart)
                .lte('expense_date', dateEnd)
                .order('expense_date', { ascending: true });

            if (filterCD) {
                query = query.eq('distribution_center_id', filterCD);
            } else {
                query = query.eq('distribution_center.franchisee_user_id', franchiseeId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        }
    });

    const reportData = useMemo(() => {
        const dates = eachDayOfInterval({ start: parseISO(dateStart), end: parseISO(dateEnd) });

        // Group by Chart Category -> then Purpose
        const grouped: Record<string, Record<string, Record<string, number>>> = {};
        const costCenterMap: Record<string, number> = {};

        expenses.forEach(exp => {
            const cat = exp.chart_account?.name || 'Sem Categoria';
            const purp = exp.purpose || 'Sem Finalidade';
            const cc = exp.cost_center?.name || 'Sem Centro de Custo';
            const dStr = exp.expense_date;
            const amt = Number(exp.amount);

            if (!grouped[cat]) grouped[cat] = {};
            if (!grouped[cat][purp]) grouped[cat][purp] = {};

            grouped[cat][purp][dStr] = (grouped[cat][purp][dStr] || 0) + amt;
            costCenterMap[cc] = (costCenterMap[cc] || 0) + amt;
        });

        const costCenterTotals = Object.entries(costCenterMap)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total);

        return { dates, grouped, costCenterTotals };
    }, [expenses, dateStart, dateEnd]);

    const handleExportPDF = async () => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const startY = await addPdfBranding(doc, filterCD ? 'Relatório Filtrado' : 'Consolidado');

        doc.setFontSize(14);
        doc.text('DETALHAMENTO DE DESPESAS POR FINALIDADE', 14, startY + 5);

        const { dates, grouped, costCenterTotals } = reportData;

        // ── Summary by Cost Center (Before Detail) ──
        doc.setFontSize(11);
        doc.setFont(doc.getFont().fontName, 'bold');
        doc.text('RESUMO POR CENTRO DE CUSTO', 14, startY + 15);

        autoTable(doc, {
            head: [['CENTRO DE CUSTO', 'VALOR TOTAL']],
            body: costCenterTotals.map(cc => [cc.name, cc.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })]),
            startY: startY + 18,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [126, 34, 206] },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
            margin: { right: 150 }, // Smaller width for summary
        });

        let currentY = (doc as any).lastAutoTable?.finalY + 15;
        let grandTotal = 0;

        Object.entries(grouped).forEach(([cat, purposes], idx) => {
            if (idx > 0) {
                const lastY = (doc as any).lastAutoTable?.finalY || currentY;
                if (lastY > 170) {
                    doc.addPage('a4', 'l');
                    currentY = 20;
                } else {
                    currentY = lastY + 12;
                }
            }

            doc.setFontSize(11);
            doc.setFont(doc.getFont().fontName, 'bold');
            doc.setTextColor(126, 34, 206); // Purple
            doc.text(`${cat}`, 14, currentY);

            const head = [['FINALIDADE', ...dates.map(d => format(d, 'dd/MM')), 'TOTAL']];

            let categoryTotal = 0;
            const body = Object.entries(purposes).map(([purp, dayVals]) => {
                const total = Object.values(dayVals).reduce((a, b) => a + b, 0);
                categoryTotal += total;
                return [
                    purp,
                    ...dates.map(d => {
                        const v = dayVals[format(d, 'yyyy-MM-dd')];
                        return v ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-';
                    }),
                    total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                ];
            });

            grandTotal += categoryTotal;

            // Add Subtotal row to the individual category table
            body.push([
                { content: `SUB TOTAL (${cat})`, styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } },
                ...dates.map(() => ({ content: '', styles: { fillColor: [245, 245, 245] } })),
                { content: categoryTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), styles: { fontStyle: 'bold', fillColor: [245, 245, 245], textColor: [126, 34, 206] } }
            ] as any);

            autoTable(doc, {
                head,
                body,
                startY: currentY + 3,
                styles: { fontSize: 7, cellPadding: 2 },
                headStyles: { fillColor: [80, 80, 80] },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
                margin: { top: 20 },
            });
        });

        // Final Grand Total
        const finalY = (doc as any).lastAutoTable?.finalY + 10;
        if (finalY > 185) doc.addPage('a4', 'l');

        const rectY = finalY > 185 ? 20 : finalY;
        doc.setFillColor(126, 34, 206);
        doc.rect(14, rectY, 269, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont(doc.getFont().fontName, 'bold');
        doc.text(`TOTAL GERAL DAS DESPESAS NO PERÍODO:`, 20, rectY + 6.5);
        doc.text(grandTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 280, rectY + 6.5, { align: 'right' });

        doc.save(`detalhamento_despesas_${dateStart}.pdf`);
    };

    return (
        <div className="p-4 lg:p-8 space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Detalhamento de Despesas</h1>
                    <p className="text-sm text-gray-400">Visão analítica por Plano de Contas e Finalidade</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
                    <Download className="h-4 w-4" /> Exportar Tudo (PDF)
                </Button>
            </header>

            <Card className="p-4 bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06]">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                        <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block tracking-wider">CD</label>
                        <DistributionCenterSelect value={filterCD} onChange={setFilterCD} placeholder="Todos os CDs" />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block tracking-wider">Início</label>
                        <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block tracking-wider">Fim</label>
                        <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
                    </div>
                    <div className="flex items-end">
                        <div className="bg-purple-50 dark:bg-purple-900/10 p-2 rounded-lg border border-purple-100 dark:border-purple-900/20 w-full flex items-center justify-between">
                            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">Total Despesas</span>
                            <span className="text-sm font-bold text-purple-700 dark:text-purple-300">
                                {formatBRL(reportData.costCenterTotals.reduce((a, b) => a + b.total, 0))}
                            </span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Summary by Cost Center UI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="md:col-span-1 bg-white dark:bg-[#1A1A24] border-gray-200 dark:border-white/[0.06]">
                    <div className="p-4 border-b border-gray-100 dark:border-white/5">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Building2 className="h-3 w-3" /> Resumo por Centro de Custo
                        </h3>
                    </div>
                    <div className="p-0">
                        <table className="w-full text-xs">
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {reportData.costCenterTotals.map(cc => (
                                    <tr key={cc.name} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{cc.name}</td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">
                                            {formatBRL(cc.total)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <div className="md:col-span-3 space-y-8">
                    {Object.entries(reportData.grouped).length === 0 && !isLoading && (
                        <div className="text-center py-20 bg-white dark:bg-white/[0.02] rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/5">
                            <p className="text-gray-400">Nenhuma despesa encontrada.</p>
                        </div>
                    )}

                    {Object.entries(reportData.grouped).map(([category, purposes]) => (
                        <Card key={category} className="overflow-hidden bg-white dark:bg-[#1A1A24] border-gray-200 dark:border-white/[0.06] shadow-sm">
                            <CardHeader className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-100 dark:border-white/5 py-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                                        {category}
                                    </CardTitle>
                                    <div className="text-sm font-medium text-gray-500">
                                        Total da Categoria: <span className="text-gray-900 dark:text-white ml-1">
                                            {formatBRL(Object.values(purposes).reduce((acc, p) => acc + Object.values(p).reduce((a, b) => a + b, 0), 0))}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100 dark:bg-white/[0.03] border-b border-gray-200 dark:border-white/5">
                                                <th className="px-5 py-3 font-bold text-gray-700 dark:text-white sticky left-0 bg-gray-100 dark:bg-[#1A1A24] z-10 w-[240px]">FINALIDADE</th>
                                                {reportData.dates.map(d => (
                                                    <th key={d.toString()} className="px-3 py-3 text-center border-l border-gray-200 dark:border-white/5 min-w-[90px]">
                                                        <div className="text-[10px] text-gray-400 uppercase">{format(d, 'eee', { locale: ptBR })}</div>
                                                        <div>{format(d, 'dd/MM')}</div>
                                                    </th>
                                                ))}
                                                <th className="px-5 py-3 text-right border-l border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] font-bold min-w-[120px]">TOTAL</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {Object.entries(purposes).map(([purpose, dayVals]) => {
                                                const rowTotal = Object.values(dayVals).reduce((a, b) => a + b, 0);
                                                return (
                                                    <tr key={purpose} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                                        <td className="px-5 py-3 sticky left-0 bg-white dark:bg-[#1A1A24] border-r border-gray-200 dark:border-white/5 z-10 text-gray-600 dark:text-gray-300">
                                                            {purpose}
                                                        </td>
                                                        {reportData.dates.map(date => {
                                                            const dStr = format(date, 'yyyy-MM-dd');
                                                            const val = dayVals[dStr];
                                                            return (
                                                                <td key={dStr} className={cn(
                                                                    "px-3 py-3 text-center border-l border-gray-100 dark:border-white/5",
                                                                    !val ? "text-gray-200 dark:text-white/5" : "text-gray-900 dark:text-white font-medium"
                                                                )}>
                                                                    {val ? val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}
                                                                </td>
                                                            );
                                                        })}
                                                        <td className="px-5 py-3 text-right bg-gray-50/30 dark:bg-white/[0.01] font-bold text-red-600 dark:text-red-400 border-l border-gray-100 dark:border-white/5">
                                                            {formatBRL(rowTotal)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
