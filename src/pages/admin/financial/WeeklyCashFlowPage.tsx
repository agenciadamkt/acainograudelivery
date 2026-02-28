import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, addDays, getDay, isWithinInterval, parseISO, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CashFlowFilters from './components/cash-flow/CashFlowFilters';
import CashFlowStats from './components/cash-flow/CashFlowStats';
import CashFlowTable from './components/cash-flow/CashFlowTable';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfBranding } from './utils/pdfBranding';

export default function WeeklyCashFlowPage() {
    const today = new Date();
    const [dateStart, setDateStart] = useState<string>(format(subDays(today, 7), 'yyyy-MM-dd'));
    const [dateEnd, setDateEnd] = useState<string>(format(today, 'yyyy-MM-dd'));
    const [filterCD, setFilterCD] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'inflow' | 'outflow'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'realized' | 'projected'>('all');

    const days = useMemo(() => {
        try {
            return eachDayOfInterval({
                start: parseISO(dateStart),
                end: parseISO(dateEnd)
            });
        } catch (e) {
            return [];
        }
    }, [dateStart, dateEnd]);

    /* ── 1. Fetch Previous Balance (Day before start of week) ── */
    const { data: previousBalance = 0, refetch: refetchBalance } = useQuery({
        queryKey: ['cash_flow_previous_balance', dateStart, filterCD],
        queryFn: async () => {
            // Find the last closing BEFORE the start date
            let query = supabase
                .from('cash_closings' as any)
                .select('balance, closing_date')
                .lt('closing_date', dateStart)
                .order('closing_date', { ascending: false })
                .limit(1);

            if (filterCD) query = query.eq('distribution_center_id', filterCD);

            const { data, error } = await query;
            if (error) throw error;
            const rows = data as any[];
            return rows?.[0]?.balance ? Number(rows[0].balance) : 0;
        }
    });

    /* ── 2. Fetch Cash Closings (Inflows) ── */
    const { data: closings = [], isLoading: loadingClosings, refetch: refetchClosings } = useQuery({
        queryKey: ['cash_flow_closings', dateStart, dateEnd, filterCD],
        queryFn: async () => {
            let query = supabase
                .from('cash_closings' as any)
                .select('*')
                .gte('closing_date', dateStart)
                .lte('closing_date', dateEnd);

            if (filterCD) query = query.eq('distribution_center_id', filterCD);

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        }
    });

    /* ── 3. Fetch Expenses (Outflows) ── */
    const { data: expenses = [], isLoading: loadingExpenses, refetch: refetchExpenses } = useQuery({
        queryKey: ['cash_flow_expenses', dateStart, dateEnd, filterCD, filterStatus],
        queryFn: async () => {
            let query = supabase
                .from('expenses' as any)
                .select(`
                    *,
                    cost_center:cost_centers!cost_center_id(name)
                `)
                .gte('expense_date', dateStart)
                .lte('expense_date', dateEnd);

            if (filterCD) query = query.eq('distribution_center_id', filterCD);

            // Filter Status
            if (filterStatus === 'realized') query = query.eq('paid', true);
            if (filterStatus === 'projected') query = query.eq('paid', false);

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        }
    });

    const handleGenerate = () => {
        refetchBalance();
        refetchClosings();
        refetchExpenses();
    };

    /* ── 4. Process Data ── */
    const reportData = useMemo(() => {
        const inflows: Record<string, number> = {}; // date -> total
        const outflows: Record<string, Record<string, number>> = {}; // category -> date -> value
        const dailyOutflows: Record<string, number> = {}; // date -> total
        const dailyResult: Record<string, number> = {}; // date -> result
        const accumulated: Record<string, number> = {}; // date -> balance

        // Initialize daily maps
        days.forEach(d => {
            const k = format(d, 'yyyy-MM-dd');
            inflows[k] = 0;
            dailyOutflows[k] = 0;
        });

        // --- Inflows (Cash Closings) ---
        // Assumption: 'total_cash' is the realized inflow.
        if (filterType !== 'outflow') {
            closings.forEach((c: any) => {
                const k = c.closing_date;
                if (inflows[k] !== undefined) {
                    inflows[k] += Number(c.total_cash || 0);
                }
            });
        }

        // --- Outflows (Expenses) ---
        if (filterType !== 'inflow') {
            expenses.forEach((e: any) => {
                const k = e.expense_date;
                if (!days.some(d => format(d, 'yyyy-MM-dd') === k)) return;

                const cat = e.cost_center?.name || 'Outros';
                const val = Number(e.amount || 0);

                if (!outflows[cat]) {
                    outflows[cat] = { total: 0 };
                    days.forEach(d => outflows[cat][format(d, 'yyyy-MM-dd')] = 0);
                }

                outflows[cat][k] += val;
                outflows[cat].total += val;
                dailyOutflows[k] += val;
            });
        }

        // --- Calculate Totals & Accumulators ---
        let currentBalance = previousBalance;
        let totalInflows = 0;
        let totalOutflows = 0;
        let totalResult = 0;

        days.forEach(d => {
            const k = format(d, 'yyyy-MM-dd');
            const inc = inflows[k];
            const out = dailyOutflows[k];
            const res = inc - out;

            dailyResult[k] = res;
            currentBalance += res;
            accumulated[k] = currentBalance;

            totalInflows += inc;
            totalOutflows += out;
            totalResult += res;
        });

        return {
            inflows,
            outflows,
            dailyResult,
            accumulated,
            totals: {
                inflows: totalInflows,
                outflows: totalOutflows,
                dailyOutflows,
                result: totalResult
            },
            finalBalance: currentBalance
        };

    }, [closings, expenses, days, previousBalance, filterType]);

    /* ── Export Functions ── */
    const handleExportPDF = async () => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for many columns
        const startY = await addPdfBranding(doc, filterCD ? 'CD Específico' : 'Consolidado');

        doc.setFontSize(14);
        doc.text('Relatório de Fluxo de Caixa', 14, startY + 5);
        doc.setFontSize(10);
        doc.text(`Período: ${format(parseISO(dateStart), 'dd/MM/yyyy')} a ${format(parseISO(dateEnd), 'dd/MM/yyyy')}`, 14, startY + 12);

        const head = [
            ['Categoria', ...days.map(d => format(d, 'dd/MM/yy')), 'Total']
        ];

        const body: any[] = [];

        // Entradas
        const rowInflows = ['Saldo em Dinheiro', ...days.map(d => reportData.inflows[format(d, 'yyyy-MM-dd')].toLocaleString('pt-BR', { minimumFractionDigits: 2 })), reportData.totals.inflows.toLocaleString('pt-BR', { minimumFractionDigits: 2 })];
        body.push(rowInflows);

        // Spacer
        body.push([{ content: 'SAÍDAS', colSpan: days.length + 2, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);

        // Outflows
        Object.entries(reportData.outflows).forEach(([cat, vals]: any) => {
            const row = [cat, ...days.map(d => vals[format(d, 'yyyy-MM-dd')].toLocaleString('pt-BR', { minimumFractionDigits: 2 })), vals.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })];
            body.push(row);
        });

        // Results
        body.push([{ content: 'RESULTADO', colSpan: days.length + 2, styles: { fillColor: [240, 240, 240], fontStyle: 'bold' } }]);

        const rowResult = ['Resultado Diário', ...days.map(d => reportData.dailyResult[format(d, 'yyyy-MM-dd')].toLocaleString('pt-BR', { minimumFractionDigits: 2 })), reportData.totals.result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })];
        body.push(rowResult);

        const rowAccumulated = ['Saldo Acumulado', ...days.map(d => reportData.accumulated[format(d, 'yyyy-MM-dd')].toLocaleString('pt-BR', { minimumFractionDigits: 2 })), '-'];
        body.push(rowAccumulated);

        autoTable(doc, {
            head: head,
            body: body,
            startY: startY + 18,
            styles: { fontSize: 7, cellPadding: 2, halign: 'right' },
            headStyles: { fillColor: [100, 100, 100], halign: 'center' },
            columnStyles: {
                0: { cellWidth: 35, halign: 'left', fontStyle: 'bold' }
            }
        });

        doc.save(`fluxo_caixa_${dateStart}_a_${dateEnd}.pdf`);
    };

    const handleExportExcel = () => {
        // Headers
        let csv = 'Categoria;';
        days.forEach(d => csv += `${format(d, 'dd/MM/yyyy')};`);
        csv += 'Total\n';

        // Entradas
        csv += 'Saldo em Dinheiro;';
        days.forEach(d => csv += `${reportData.inflows[format(d, 'yyyy-MM-dd')].toFixed(2).replace('.', ',')};`);
        csv += `${reportData.totals.inflows.toFixed(2).replace('.', ',')}\n`;

        // Saídas
        Object.entries(reportData.outflows).forEach(([cat, vals]: any) => {
            csv += `${cat};`;
            days.forEach(d => csv += `${vals[format(d, 'yyyy-MM-dd')].toFixed(2).replace('.', ',')};`);
            csv += `${vals.total.toFixed(2).replace('.', ',')}\n`;
        });

        // Resultado
        csv += 'Resultado Diário;';
        days.forEach(d => csv += `${reportData.dailyResult[format(d, 'yyyy-MM-dd')].toFixed(2).replace('.', ',')};`);
        csv += `${reportData.totals.result.toFixed(2).replace('.', ',')}\n`;

        csv += 'Saldo Acumulado;';
        days.forEach(d => csv += `${reportData.accumulated[format(d, 'yyyy-MM-dd')].toFixed(2).replace('.', ',')};`);
        csv += '-\n';

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `fluxo_caixa_${dateStart}_a_${dateEnd}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };


    return (
        <div className="p-4 lg:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Fluxo de Caixa Semanal</h2>
                    <p className="text-sm text-gray-500 dark:text-white/40">
                        Visão detalhada de entradas e saídas por dia
                    </p>
                </div>
            </div>

            <CashFlowFilters
                dateStart={dateStart}
                setDateStart={setDateStart}
                dateEnd={dateEnd}
                setDateEnd={setDateEnd}
                filterCD={filterCD}
                setFilterCD={setFilterCD}
                filterType={filterType}
                setFilterType={setFilterType}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                onGenerate={handleGenerate}
                isGenerating={loadingClosings || loadingExpenses}
            />

            <CashFlowStats
                inflows={reportData.totals.inflows}
                outflows={reportData.totals.outflows}
                result={reportData.totals.result}
                projectedBalance={reportData.finalBalance}
            />

            <CashFlowTable
                days={days}
                data={reportData}
                loading={loadingClosings || loadingExpenses}
                onExportPDF={handleExportPDF}
                onExportExcel={handleExportExcel}
            />
        </div>
    );
}
