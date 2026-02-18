'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    FileBarChart,
    Download,
    FileSpreadsheet,
    TrendingUp,
    TrendingDown,
    DollarSign,
    ArrowDownLeft,
    BarChart3,
    PieChart as PieChartIcon,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DistributionCenterSelect from './components/DistributionCenterSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addPdfBranding } from './utils/pdfBranding';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
} from 'recharts';

const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6'];

export default function ReportsPage() {
    const now = new Date();
    const [dateStart, setDateStart] = useState(format(startOfMonth(now), 'yyyy-MM-dd'));
    const [dateEnd, setDateEnd] = useState(format(endOfMonth(now), 'yyyy-MM-dd'));
    const [selectedCD, setSelectedCD] = useState('');

    const { data: centers = [] } = useQuery({
        queryKey: ['distribution_centers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('distribution_centers' as any)
                .select('*')
                .eq('active', true)
                .order('name');
            if (error) throw error;
            return data as any[];
        },
    });

    /* ── Fetch cash closings (revenue) ── */
    const { data: closings = [] } = useQuery({
        queryKey: ['report_closings', dateStart, dateEnd, selectedCD],
        queryFn: async () => {
            let query = supabase
                .from('cash_closings' as any)
                .select('closing_date, total_sales, total_cash, title_settlement, cash_settlement, total_expenses')
                .gte('closing_date', dateStart)
                .lte('closing_date', dateEnd)
                .order('closing_date', { ascending: true });
            if (selectedCD) query = query.eq('distribution_center_id', selectedCD);
            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    /* ── Fetch expenses ── */
    const { data: expenses = [] } = useQuery({
        queryKey: ['report_expenses', dateStart, dateEnd, selectedCD],
        queryFn: async () => {
            let query = supabase
                .from('expenses' as any)
                .select(`
                    expense_date, amount, expense_type, purpose,
                    cost_center:cost_centers!cost_center_id(name),
                    chart_account:chart_of_accounts!chart_of_accounts_id(name)
                `)
                .gte('expense_date', dateStart)
                .lte('expense_date', dateEnd)
                .order('expense_date', { ascending: true });
            if (selectedCD) query = query.eq('distribution_center_id', selectedCD);
            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    /* ── Fetch financial records ── */
    const { data: records = [] } = useQuery({
        queryKey: ['report_records', dateStart, dateEnd, selectedCD],
        queryFn: async () => {
            let query = supabase
                .from('financial_records' as any)
                .select('transaction_date, amount, status, transaction_type')
                .gte('transaction_date', dateStart)
                .lte('transaction_date', dateEnd);
            if (selectedCD) query = query.eq('distribution_center_id', selectedCD);
            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    /* ── KPIs ── */
    const kpis = useMemo(() => {
        const totalRevenue = closings.reduce((s: number, c: any) => s + Number(c.total_sales), 0);
        const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
        const totalRecords = records.filter((r: any) => r.status === 'approved').reduce((s: number, r: any) => s + Number(r.amount), 0);
        const balance = totalRevenue - totalExpenses;
        const margin = totalRevenue > 0 ? ((balance / totalRevenue) * 100) : 0;

        return { totalRevenue, totalExpenses, totalRecords, balance, margin };
    }, [closings, expenses, records]);

    /* ── Revenue vs Expenses trend (daily) ── */
    const trendData = useMemo(() => {
        const days: Record<string, { revenue: number; expenses: number }> = {};

        closings.forEach((c: any) => {
            const d = c.closing_date;
            if (!days[d]) days[d] = { revenue: 0, expenses: 0 };
            days[d].revenue += Number(c.total_sales);
        });

        expenses.forEach((e: any) => {
            const d = e.expense_date;
            if (!days[d]) days[d] = { revenue: 0, expenses: 0 };
            days[d].expenses += Number(e.amount);
        });

        return Object.entries(days)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, vals]) => ({
                date: format(new Date(date + 'T12:00:00'), 'dd/MM', { locale: ptBR }),
                fullDate: date,
                receitas: vals.revenue,
                despesas: vals.expenses,
                resultado: vals.revenue - vals.expenses,
            }));
    }, [closings, expenses]);

    /* ── Expenses by type (pie) ── */
    const expensesByType = useMemo(() => {
        const types: Record<string, number> = { fixed: 0, variable: 0, investment: 0 };
        expenses.forEach((e: any) => {
            types[e.expense_type] = (types[e.expense_type] || 0) + Number(e.amount);
        });

        const labels: Record<string, string> = { fixed: 'Fixas', variable: 'Variáveis', investment: 'Investimentos' };
        return Object.entries(types)
            .filter(([_, v]) => v > 0)
            .map(([key, value], i) => ({
                name: labels[key] || key,
                value,
                fill: COLORS[i % COLORS.length],
            }));
    }, [expenses]);

    /* ── Top cost centers ── */
    const topCostCenters = useMemo(() => {
        const grouped: Record<string, number> = {};
        expenses.forEach((e: any) => {
            const name = e.cost_center?.name || 'Outros';
            grouped[name] = (grouped[name] || 0) + Number(e.amount);
        });
        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
    }, [expenses]);

    /* ── Payment method distribution ── */
    const paymentData = useMemo(() => {
        const totalCash = closings.reduce((s: number, c: any) => s + Number(c.cash_settlement || 0), 0);
        const totalTitle = closings.reduce((s: number, c: any) => s + Number(c.title_settlement || 0), 0);
        return [
            { name: 'Dinheiro', value: totalCash, fill: '#10B981' },
            { name: 'Título (Pix/Cartão)', value: totalTitle, fill: '#3B82F6' },
        ].filter(d => d.value > 0);
    }, [closings]);

    /* ── Export Full Report PDF ── */
    const handleExportPDF = async () => {
        const doc = new jsPDF();
        const centerName = selectedCD
            ? centers.find((c: any) => c.id === selectedCD)?.name
            : 'Todos os CDs';

        const startY = await addPdfBranding(doc, centerName);
        doc.setFontSize(14);
        doc.text('Relatório Financeiro Consolidado', 14, startY + 5);
        doc.setFontSize(10);
        const periodStr = `${format(new Date(dateStart + 'T12:00:00'), 'dd/MM/yyyy')} a ${format(new Date(dateEnd + 'T12:00:00'), 'dd/MM/yyyy')}`;
        doc.text(`Período: ${periodStr}`, 14, startY + 12);

        // KPIs
        doc.setFontSize(12);
        doc.text('Resumo', 14, startY + 20);
        autoTable(doc, {
            head: [['Indicador', 'Valor']],
            body: [
                ['Receita Total', formatBRL(kpis.totalRevenue)],
                ['Despesas Totais', formatBRL(kpis.totalExpenses)],
                ['Resultado', formatBRL(kpis.balance)],
                ['Margem', `${kpis.margin.toFixed(1)}%`],
            ],
            startY: startY + 24,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [124, 58, 237] },
            columnStyles: { 1: { halign: 'right' } },
        });

        // Daily trend
        let y = (doc as any).lastAutoTable?.finalY + 10 || 80;
        doc.setFontSize(12);
        doc.text('Movimentação Diária', 14, y);
        autoTable(doc, {
            head: [['Data', 'Receitas', 'Despesas', 'Resultado']],
            body: trendData.map((d) => [d.date, formatBRL(d.receitas), formatBRL(d.despesas), formatBRL(d.resultado)]),
            startY: y + 4,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [124, 58, 237] },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        });

        // Top cost centers
        y = (doc as any).lastAutoTable?.finalY + 10 || 160;
        if (y > 260) { doc.addPage(); y = 15; }
        doc.setFontSize(12);
        doc.text('Maiores Centros de Custo', 14, y);
        autoTable(doc, {
            head: [['Centro de Custos', 'Total']],
            body: topCostCenters.map((c) => [c.name, formatBRL(c.value)]),
            startY: y + 4,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [124, 58, 237] },
            columnStyles: { 1: { halign: 'right' } },
        });

        doc.save(`relatorio_financeiro_${dateStart}_${dateEnd}.pdf`);
    };

    /* ── Export Excel (CSV) ── */
    const handleExportExcel = () => {
        const headers = ['Data', 'Receita', 'Despesa', 'Resultado'];
        const rows = trendData.map((d) => [d.fullDate, d.receitas.toFixed(2), d.despesas.toFixed(2), d.resultado.toFixed(2)]);

        let csvContent = 'data:text/csv;charset=utf-8,'
            + headers.join(';') + '\n'
            + rows.map((r) => r.join(';')).join('\n');

        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', `relatorio_financeiro_${dateStart}_${dateEnd}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const periodLabel = useMemo(() => {
        return `${format(new Date(dateStart + 'T12:00:00'), 'dd MMM', { locale: ptBR })} a ${format(new Date(dateEnd + 'T12:00:00'), 'dd MMM yyyy', { locale: ptBR })}`;
    }, [dateStart, dateEnd]);

    return (
        <div className="p-4 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Relatórios</h2>
                    <p className="text-sm text-gray-500 dark:text-white/40">Visão consolidada de receitas, despesas e resultados</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
                        <Download className="h-4 w-4" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
                        <FileSpreadsheet className="h-4 w-4" /> Excel
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className="text-xs text-gray-500 dark:text-white/30 mb-1 block">Centro de Distribuição</label>
                    <DistributionCenterSelect value={selectedCD} onChange={setSelectedCD} placeholder="Todos os CDs" />
                </div>
                <div>
                    <label className="text-xs text-gray-500 dark:text-white/30 mb-1 block">De</label>
                    <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
                </div>
                <div>
                    <label className="text-xs text-gray-500 dark:text-white/30 mb-1 block">Até</label>
                    <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="bg-gradient-to-br from-emerald-500 to-green-600 border-0 shadow-lg shadow-emerald-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Receitas</p>
                                <p className="text-lg font-bold text-white tracking-tight">{formatBRL(kpis.totalRevenue)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-500 to-rose-600 border-0 shadow-lg shadow-red-500/20">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <ArrowDownLeft className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Despesas</p>
                                <p className="text-lg font-bold text-white tracking-tight">{formatBRL(kpis.totalExpenses)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border-0 shadow-lg ${kpis.balance >= 0
                    ? 'bg-gradient-to-br from-violet-500 to-purple-600 shadow-purple-500/20'
                    : 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-orange-500/20'
                    }`}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <DollarSign className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Resultado</p>
                                <p className="text-lg font-bold text-white tracking-tight">{formatBRL(kpis.balance)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                <BarChart3 className="h-5 w-5 text-gray-500 dark:text-white/40" />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 dark:text-white/40 font-medium uppercase tracking-wider">Margem</p>
                                <p className={`text-lg font-bold tracking-tight ${kpis.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {kpis.margin.toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                                <FileBarChart className="h-5 w-5 text-gray-500 dark:text-white/40" />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-500 dark:text-white/40 font-medium uppercase tracking-wider">Período</p>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{periodLabel}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Revenue vs Expenses Trend */}
            <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                        Receitas vs Despesas
                    </CardTitle>
                    <p className="text-xs text-gray-400 dark:text-white/30">Evolução diária no período selecionado</p>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip
                                    formatter={(value: number) => formatBRL(value)}
                                    contentStyle={{
                                        backgroundColor: '#1A1A24',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 8,
                                        color: '#fff',
                                        fontSize: 12,
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: 11 }} />
                                <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#10B981" fillOpacity={1} fill="url(#colorReceitas)" strokeWidth={2} />
                                <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#EF4444" fillOpacity={1} fill="url(#colorDespesas)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Expenses by Type Pie */}
                <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                            Despesas por Tipo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            {expensesByType.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={expensesByType}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            innerRadius={45}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
                                        >
                                            {expensesByType.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value: number) => formatBRL(value)} contentStyle={{ backgroundColor: '#1A1A24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-sm text-gray-400">Sem dados</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Cost Centers Bar */}
                <Card className="lg:col-span-2 bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                            Top Centros de Custos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[250px]">
                            {topCostCenters.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topCostCenters} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                        <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} width={120} />
                                        <Tooltip formatter={(value: number) => formatBRL(value)} contentStyle={{ backgroundColor: '#1A1A24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                                        <Bar dataKey="value" name="Total" radius={[0, 4, 4, 0]}>
                                            {topCostCenters.map((_, i) => (
                                                <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-sm text-gray-400">Sem dados</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment Methods */}
            {paymentData.length > 0 && (
                <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                            Recebimentos por Forma de Pagamento
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {paymentData.map((d) => (
                                <div key={d.name} className="flex items-center gap-4">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.fill }} />
                                    <div className="flex-1">
                                        <p className="text-sm text-gray-700 dark:text-white/60">{d.name}</p>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{formatBRL(d.value)}</p>
                                    </div>
                                    <div className="text-sm font-medium text-gray-500 dark:text-white/40">
                                        {((d.value / paymentData.reduce((s, p) => s + p.value, 0)) * 100).toFixed(0)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Daily Breakdown Table */}
            <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                <CardHeader className="pb-2 border-b border-gray-100 dark:border-white/[0.05]">
                    <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                        Movimentação Diária
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase">Data</th>
                                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase">Receitas</th>
                                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase">Despesas</th>
                                    <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase">Resultado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                                {trendData.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-5 py-8 text-center text-gray-400 dark:text-white/30">
                                            Nenhum dado no período
                                        </td>
                                    </tr>
                                )}
                                {trendData.map((d) => (
                                    <tr key={d.fullDate} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                                            {format(new Date(d.fullDate + 'T12:00:00'), 'dd MMM yyyy', { locale: ptBR })}
                                        </td>
                                        <td className="px-5 py-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                                            {formatBRL(d.receitas)}
                                        </td>
                                        <td className="px-5 py-3 text-right text-red-500 font-semibold">
                                            {formatBRL(d.despesas)}
                                        </td>
                                        <td className={`px-5 py-3 text-right font-bold ${d.resultado >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {formatBRL(d.resultado)}
                                        </td>
                                    </tr>
                                ))}
                                {trendData.length > 0 && (
                                    <tr className="bg-gray-50/50 dark:bg-white/[0.02] font-bold">
                                        <td className="px-5 py-3 text-gray-900 dark:text-white">TOTAL</td>
                                        <td className="px-5 py-3 text-right text-emerald-600 dark:text-emerald-400">
                                            {formatBRL(kpis.totalRevenue)}
                                        </td>
                                        <td className="px-5 py-3 text-right text-red-500">
                                            {formatBRL(kpis.totalExpenses)}
                                        </td>
                                        <td className={`px-5 py-3 text-right ${kpis.balance >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {formatBRL(kpis.balance)}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
