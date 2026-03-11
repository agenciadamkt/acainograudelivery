import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, addDays, getDay, isWithinInterval, parseISO, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CashFlowFilters from './components/cash-flow/CashFlowFilters';
import CashFlowStats from './components/cash-flow/CashFlowStats';
import CashFlowTable from './components/cash-flow/CashFlowTable';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfBranding } from './utils/pdfBranding';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    ComposedChart,
    Legend,
    ReferenceDot,
    Label as RechartsLabel
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, AlertTriangle, TrendingUp } from 'lucide-react';

export default function WeeklyCashFlowPage() {
    const today = new Date();
    const [dateStart, setDateStart] = useState<string>(format(subDays(today, 7), 'yyyy-MM-dd'));
    const [dateEnd, setDateEnd] = useState<string>(format(today, 'yyyy-MM-dd'));
    const [filterCD, setFilterCD] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'inflow' | 'outflow'>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'realized' | 'projected'>('all');

    const days = useMemo(() => {
        try {
            const start = parseISO(dateStart);
            const end = parseISO(dateEnd);

            if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
                return [];
            }

            return eachDayOfInterval({ start, end });
        } catch (e) {
            return [];
        }
    }, [dateStart, dateEnd]);

    /* ── 1. Fetch Previous Balance (Day before start of week) ── */
    const { data: previousBalance = 0, refetch: refetchBalance } = useQuery({
        queryKey: ['cash_flow_previous_balance', dateStart, filterCD],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();

            // Enforce franchisee isolation via inner join
            const selectStr = 'balance, closing_date, distribution_center:distribution_centers!inner(franchisee_user_id)';

            // Find the last closing BEFORE the start date
            let query = supabase
                .from('cash_closings' as any)
                .select(selectStr)
                .lt('closing_date', dateStart)
                .order('closing_date', { ascending: false })
                .limit(1);

            if (filterCD) {
                query = query.eq('distribution_center_id', filterCD);
            } else {
                query = query.in('distribution_center.franchisee_user_id', [user?.id, '97cc4f78-31e6-4113-a8a6-6d14d4166c38']);
            }

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
            const { data: { user } } = await supabase.auth.getUser();

            // Enforce franchisee isolation via inner join
            const selectStr = '*, distribution_center:distribution_centers!inner(franchisee_user_id)';

            let query = supabase
                .from('cash_closings' as any)
                .select(selectStr)
                .gte('closing_date', dateStart)
                .lte('closing_date', dateEnd);

            if (filterCD) {
                query = query.eq('distribution_center_id', filterCD);
            } else {
                query = query.in('distribution_center.franchisee_user_id', [user?.id, '97cc4f78-31e6-4113-a8a6-6d14d4166c38']);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        }
    });

    /* ── 3. Fetch Expenses (Outflows) ── */
    const { data: expenses = [], isLoading: loadingExpenses, refetch: refetchExpenses } = useQuery({
        queryKey: ['cash_flow_expenses', dateStart, dateEnd, filterCD, filterStatus],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const selectStr = '*, cost_center:cost_centers!cost_center_id(name), distribution_center:distribution_centers!inner(franchisee_user_id)';

            let query = supabase
                .from('expenses' as any)
                .select(selectStr)
                .gte('expense_date', dateStart)
                .lte('expense_date', dateEnd);

            if (filterCD) {
                query = query.eq('distribution_center_id', filterCD);
            } else {
                query = query.in('distribution_center.franchisee_user_id', [user?.id, '97cc4f78-31e6-4113-a8a6-6d14d4166c38']);
            }


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
        const daysKeys = new Set(days.map(d => format(d, 'yyyy-MM-dd')));

        if (filterType !== 'inflow') {
            expenses.forEach((e: any) => {
                const k = e.expense_date;
                if (!daysKeys.has(k)) return;

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

        // --- Break-even Calculation ---
        let totalFixed = 0;
        expenses.forEach((e: any) => {
            if (e.expense_type === 'fixed') totalFixed += Number(e.amount || 0);
        });

        let cumVariable = 0;
        let cumInflowLine = 0;
        const breakEvenPoints = days.map(d => {
            const k = format(d, 'yyyy-MM-dd');
            const dayVariable = (expenses || [])
                .filter((e: any) => e.expense_date === k && e.expense_type !== 'fixed')
                .reduce((s, e) => s + Number(e.amount || 0), 0);

            cumVariable += dayVariable;
            cumInflowLine += (inflows[k] || 0);

            return {
                label: format(d, 'dd/MM'),
                date: k,
                receita: cumInflowLine,
                custos: totalFixed + cumVariable,
            };
        });

        // Find intersection
        const intersection = breakEvenPoints.find(p => p.receita >= p.custos);

        // --- Calculate Totals & Accumulators ---
        let currentBalance = previousBalance;
        let totalInflows = 0;
        let totalOutflows = 0;
        let totalResult = 0;

        days.forEach(d => {
            const k = format(d, 'yyyy-MM-dd');
            const inc = inflows[k] || 0;
            const out = dailyOutflows[k] || 0;
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
            breakEvenPoints,
            intersection,
            totalFixed,
            totals: {
                inflows: totalInflows,
                outflows: totalOutflows,
                dailyOutflows,
                result: totalResult
            },
            finalBalance: currentBalance
        };

    }, [closings, expenses, days, previousBalance, filterType]);

    /* ── Chart Tooltip ── */
    const ChartTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        return (
            <div className="bg-white/90 dark:bg-black/80 backdrop-blur-md border border-gray-200/50 dark:border-white/10 p-3 rounded-xl shadow-xl text-[11px]">
                <p className="font-bold text-gray-900 dark:text-white mb-2">{label}</p>
                {payload.map((entry: any, i: number) => (
                    <div key={i} className="flex items-center justify-between gap-4 mb-1">
                        <span style={{ color: entry.color }} className="font-medium">{entry.name}:</span>
                        <span className="font-bold">
                            {(entry.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

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

            {/* --- Break-even Chart --- */}
            {days.length > 0 && reportData.breakEvenPoints.length > 0 && (
                <Card className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border-gray-200/50 dark:border-white/10 shadow-lg overflow-hidden relative">
                    <CardHeader className="pb-4 border-b border-gray-100 dark:border-white/5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-orange-500/10 rounded-xl">
                                    <Target className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold tracking-tight">Ponto de Equilíbrio (Break-even)</CardTitle>
                                    <p className="text-xs text-gray-500 dark:text-white/40">Crossover entre Receita Acumulada e Gastos Totais</p>
                                </div>
                            </div>
                            {reportData.intersection && (
                                <div className="bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20 flex items-center gap-2">
                                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                        Atingido em: {reportData.intersection.label}
                                    </span>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8 px-2 sm:px-6">
                        <div className="h-[380px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={reportData.breakEvenPoints} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 500 }}
                                        axisLine={false}
                                        tickLine={false}
                                        dy={10}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 500 }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `R$ ${v / 1000}k`}
                                    />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />

                                    <Line
                                        type="monotone"
                                        dataKey="receita"
                                        name="Receita Total"
                                        stroke="#3B82F6"
                                        strokeWidth={4}
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        animationDuration={1500}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="custos"
                                        name="Custos Totais"
                                        stroke="#10B981"
                                        strokeWidth={4}
                                        dot={false}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        animationDuration={1500}
                                    />

                                    {reportData.intersection && reportData.intersection.label && (
                                        <ReferenceDot
                                            x={reportData.intersection.label}
                                            y={reportData.intersection.receita}
                                            r={6}
                                            fill="#FFF"
                                            stroke="#10B981"
                                            strokeWidth={3}
                                        >
                                            <RechartsLabel
                                                value="Ponto de Equilíbrio"
                                                position="top"
                                                offset={15}
                                                fill="#10B981"
                                                fontSize={12}
                                                fontWeight="bold"
                                            />
                                        </ReferenceDot>
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 border-t border-gray-100 dark:border-white/5 pt-6">
                            <div className="flex flex-col gap-1 items-center md:items-start">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base de Custos Fixos</span>
                                <span className="text-sm font-black text-gray-900 dark:text-white">
                                    {(reportData.totalFixed || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 items-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status do Período</span>
                                <div className="flex items-center gap-2">
                                    {reportData.totals.result >= 0 ? (
                                        <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-sm">
                                            <TrendingUp className="h-4 w-4" /> Lucro Operacional
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1.5 text-red-500 font-bold text-sm">
                                            <AlertTriangle className="h-4 w-4" /> Operando em Prejuízo
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 items-center md:items-end">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saldo Final Projetado</span>
                                <span className={cn(
                                    "text-sm font-black",
                                    reportData.finalBalance >= 0 ? "text-emerald-600" : "text-red-500"
                                )}>
                                    {(reportData.finalBalance || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

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
