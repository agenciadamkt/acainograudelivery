'use client';

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Wallet,
    ArrowDownLeft,
    ArrowUpRight,
    TrendingUp,
    Target,
    ChevronRight,
    Building2,
    Banknote,
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DistributionCenterSelect from './components/DistributionCenterSelect';

/* ─── Helpers ─── */
const formatBRL = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/* ─── Component ─── */
export default function FinancialDashboard() {
    const navigate = useNavigate();
    const today = new Date();
    const [selectedCD, setSelectedCD] = useState('');

    const thirtyDaysAgo = format(subDays(today, 30), 'yyyy-MM-dd');

    /* ── Fetch cash closings (last 30 days) ── */
    const { data: closings } = useQuery({
        queryKey: ['financial_dashboard', selectedCD],
        queryFn: async () => {
            let query = supabase
                .from('cash_closings' as any)
                .select(`
                    *,
                    distribution_center:distribution_centers!distribution_center_id(name),
                    operator:cash_operators!operator_id(name)
                `)
                .gte('closing_date', thirtyDaysAgo)
                .order('closing_date', { ascending: false });

            if (selectedCD) {
                query = query.eq('distribution_center_id', selectedCD);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    /* ── Fetch expenses (last 30 days) ── */

    /* ── Fetch expenses (last 30 days) ── */

    const { data: expensesData } = useQuery({
        queryKey: ['financial_dashboard_expenses', selectedCD],
        queryFn: async () => {
            let query = supabase
                .from('expenses' as any)
                .select('amount, expense_type, expense_date, paid_with_cash_balance, paid')
                .gte('expense_date', thirtyDaysAgo);

            if (selectedCD) {
                query = query.eq('distribution_center_id', selectedCD);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    /* ── Fetch active revenue goal ── */
    const { data: activeGoal } = useQuery({
        queryKey: ['active_revenue_goal', selectedCD],
        queryFn: async () => {
            const now = new Date();
            const startOfMonthDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
            const endOfMonthDate = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');

            let query = supabase
                .from('financial_goals' as any)
                .select('*')
                .eq('status', 'active')
                .eq('goal_type', 'revenue')
                .lte('start_date', endOfMonthDate)
                .gte('end_date', startOfMonthDate)
                .order('created_at', { ascending: false })
                .limit(1);

            if (selectedCD) {
                query = query.eq('distribution_center_id', selectedCD);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data?.[0] as any) || null;
        },
    });

    /* ── KPI Calculations ── */
    const kpis = useMemo(() => {
        const totalIncome = (closings || []).reduce((sum: number, c: any) => sum + Number(c.total_sales), 0);
        const totalExpenses = (expensesData || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);

        const expensesPaidWithCash = (expensesData || [])
            .filter((e: any) => e.paid_with_cash_balance && e.paid)
            .reduce((sum: number, e: any) => sum + Number(e.amount), 0);

        const totalCash = (closings || []).reduce((sum: number, c: any) => sum + Number(c.balance || 0), 0) - expensesPaidWithCash;

        return {
            balance: totalIncome - totalExpenses,
            totalExpenses,
            totalIncome,
            totalCash,
        };
    }, [closings, expensesData]);

    const goalTarget = activeGoal ? Number(activeGoal.target_value) : 0;
    const goalProgress = goalTarget > 0 ? (kpis.totalIncome / goalTarget) * 100 : 0;

    /* ── Chart Data (last 7 days) ── */
    const chartData = useMemo(() => {
        const days: { date: string; label: string; receitas: number; despesas: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const day = subDays(today, i);
            const dateStr = format(day, 'yyyy-MM-dd');
            const label = format(day, 'dd MMM', { locale: ptBR });

            const dayClosings = (closings || []).filter((c: any) => c.closing_date === dateStr);
            const dayExpenses = (expensesData || []).filter((e: any) => e.expense_date === dateStr);

            const receitas = dayClosings.reduce((sum: number, c: any) => sum + Number(c.total_sales), 0);
            const despesas = dayExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

            days.push({ date: dateStr, label, receitas, despesas });
        }
        return days;
    }, [closings, expensesData]);

    /* ── Expense breakdown (from expenses table, grouped by type) ── */
    const expenseBreakdown = useMemo(() => {
        if (!expensesData || expensesData.length === 0) return [];

        const fixed = expensesData.filter((e: any) => e.expense_type === 'fixed').reduce((s: number, e: any) => s + Number(e.amount), 0);
        const variable = expensesData.filter((e: any) => e.expense_type === 'variable').reduce((s: number, e: any) => s + Number(e.amount), 0);
        const investment = expensesData.filter((e: any) => e.expense_type === 'investment').reduce((s: number, e: any) => s + Number(e.amount), 0);

        const colors = ['#8B5CF6', '#6366F1', '#F59E0B'];
        const items = [
            { name: 'Fixas', value: fixed, color: colors[0] },
            { name: 'Variáveis', value: variable, color: colors[1] },
            { name: 'Investimentos', value: investment, color: colors[2] },
        ].filter(i => i.value > 0);

        return items;
    }, [expensesData]);

    /* ── Recent closings ── */
    const recentClosings = useMemo(() => {
        if (!closings) return [];
        return closings.slice(0, 5);
    }, [closings]);

    /* ── Chart Tooltip ── */
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload) return null;
        return (
            <div className="bg-white dark:bg-[#1E1E28] border border-gray-200 dark:border-white/10 rounded-lg shadow-lg px-3 py-2 text-xs">
                <p className="font-medium text-gray-900 dark:text-white mb-1">{label}</p>
                {payload.map((entry: any, i: number) => (
                    <p key={i} style={{ color: entry.color }}>
                        {entry.name}: {formatBRL(entry.value)}
                    </p>
                ))}
            </div>
        );
    };

    return (
        <div className="p-4 lg:p-8 space-y-6">
            {/* ─── CD Selector ─── */}
            <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-purple-500" />
                <div className="w-64">
                    <DistributionCenterSelect
                        value={selectedCD}
                        onChange={setSelectedCD}
                        placeholder="Todos os CDs"
                    />
                </div>
                {selectedCD && (
                    <button
                        onClick={() => setSelectedCD('')}
                        className="text-xs text-purple-600 hover:underline"
                    >
                        Limpar filtro
                    </button>
                )}
            </div>

            {/* ─── KPI Cards Row ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Saldo em caixa */}
                <Card className="bg-gradient-to-br from-purple-600 to-indigo-700 border-0 shadow-lg shadow-purple-600/20">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <Wallet className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <p className="text-xs text-white/70 font-medium">Saldo em caixa</p>
                            <p className="text-2xl font-bold text-white tracking-tight">
                                {formatBRL(kpis.balance)}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Saldo em Dinheiro */}
                <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                            <Banknote className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-white/40 font-medium">Saldo em Dinheiro</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {formatBRL(kpis.totalCash)}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Gastos totais */}
                <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                            <ArrowDownLeft className="h-6 w-6 text-red-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-white/40 font-medium">Gastos totais</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {formatBRL(kpis.totalExpenses)}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Total entradas */}
                <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                            <ArrowUpRight className="h-6 w-6 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-white/40 font-medium">Total entradas</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                                {formatBRL(kpis.totalIncome)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Charts Row ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart — Fluxo de Caixa (spans 2 cols) */}
                <Card className="lg:col-span-2 bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                                Fluxo de Caixa
                            </CardTitle>
                            <div className="flex items-center gap-4 text-xs">
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Receitas
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                                    Despesas
                                </span>
                                <span className="text-gray-400 dark:text-white/30">Últimos 7 dias</span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb33" />
                                    <XAxis
                                        dataKey="label"
                                        tick={{ fontSize: 11, fill: '#9CA3AF' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 11, fill: '#9CA3AF' }}
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="receitas"
                                        name="Receitas"
                                        stroke="#10B981"
                                        strokeWidth={2.5}
                                        fill="url(#gradReceitas)"
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="despesas"
                                        name="Despesas"
                                        stroke="#8B5CF6"
                                        strokeWidth={2.5}
                                        fill="url(#gradDespesas)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Sidebar — Metas + Gastos */}
                <div className="space-y-6">
                    {/* Metas Card */}
                    <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                                    Metas
                                </CardTitle>
                                <span className="text-xs text-gray-400 dark:text-white/30">
                                    {format(today, 'MMM, yyyy', { locale: ptBR })}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                                    <Target className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-400 dark:text-white/30">Meta alcançada</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                        {formatBRL(kpis.totalIncome)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-[11px] text-gray-400 dark:text-white/30">Meta deste mês</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                                        {goalTarget > 0 ? formatBRL(goalTarget) : 'ND'}
                                    </p>
                                </div>
                            </div>
                            {/* Progress bar */}
                            <div>
                                <div className="flex justify-between text-[11px] text-gray-400 mb-1.5">
                                    <span>Progresso</span>
                                    <span>{Math.min(100, Math.round(goalProgress))}%</span>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-700"
                                        style={{ width: `${Math.min(100, goalProgress)}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Breakdown Bar Chart */}
                    <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                                Gastos totais
                            </CardTitle>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {formatBRL(kpis.totalExpenses)}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[160px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={expenseBreakdown} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                                        />
                                        <Tooltip
                                            formatter={(value: number) => formatBRL(value)}
                                            contentStyle={{
                                                backgroundColor: '#fff',
                                                border: '1px solid #e5e7eb',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                                            {expenseBreakdown.map((entry, index) => (
                                                <Cell key={index} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ─── Recent Closings Table ─── */}
            <Card className="bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.06] shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                            Lançamentos recentes
                        </CardTitle>
                        <button
                            className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
                            onClick={() => navigate('/admin/financeiro/fluxo')}
                        >
                            Ver todos
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-white/[0.05]">
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Data</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">CD</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Vendas</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Saídas</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Saldo</th>
                                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-white/40 uppercase tracking-wider">Operador</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                                {recentClosings.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-400 dark:text-white/30">
                                            Nenhum fechamento encontrado
                                        </td>
                                    </tr>
                                )}
                                {recentClosings.map((c: any) => (
                                    <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-3.5 font-medium text-gray-900 dark:text-white">
                                            {format(new Date(c.closing_date + 'T12:00:00'), 'dd MMM yyyy', { locale: ptBR })}
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-600 dark:text-white/50">
                                            {c.distribution_center?.name || '—'}
                                        </td>
                                        <td className="px-6 py-3.5 text-emerald-600 font-semibold">
                                            {formatBRL(Number(c.total_sales))}
                                        </td>
                                        <td className="px-6 py-3.5 text-red-500">
                                            {formatBRL(Number(c.total_expenses))}
                                        </td>
                                        <td className={`px-6 py-3.5 font-semibold ${Number(c.balance) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {formatBRL(Number(c.balance))}
                                        </td>
                                        <td className="px-6 py-3.5 text-gray-600 dark:text-white/50">
                                            {c.operator?.name || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
