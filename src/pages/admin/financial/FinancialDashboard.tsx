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
    Building2,
    Banknote,
    Clock,
    ChevronRight,
    AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
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

    const startOfMonthDate = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');

    const todayStr = format(today, 'yyyy-MM-dd');

    /* ── Fetch cash closings (mês corrente, até hoje) ── */
    const { data: closings } = useQuery({
        queryKey: ['financial_dashboard', selectedCD],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();

            // Enforce franchisee isolation via inner join
            const selectStr = `*, distribution_center:distribution_centers!inner(name, franchisee_user_id), operator:cash_operators!operator_id(name)`;

            let query = supabase
                .from('cash_closings' as any)
                .select(selectStr)
                .gte('closing_date', startOfMonthDate)
                .lte('closing_date', todayStr)
                .order('closing_date', { ascending: false });

            if (selectedCD) {
                query = query.eq('distribution_center_id', selectedCD);
            } else {
                query = query.eq('distribution_center.franchisee_user_id', user?.id);
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
            const { data: { user } } = await supabase.auth.getUser();

            // Enforce franchisee isolation via inner join
            const selectStr = `amount, expense_type, expense_date, paid_with_cash_balance, paid, distribution_center:distribution_centers!inner(franchisee_user_id)`;

            let query = supabase
                .from('expenses' as any)
                .select(selectStr)
                .gte('expense_date', startOfMonthDate);

            if (selectedCD) {
                query = query.eq('distribution_center_id', selectedCD);
            } else {
                query = query.eq('distribution_center.franchisee_user_id', user?.id);
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
            const { data: { user } } = await supabase.auth.getUser();
            const now = new Date();
            const startOfMonthDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
            const endOfMonthDate = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd');

            let query = supabase
                .from('financial_goals' as any)
                .select('*')
                .eq('status', 'active')
                .eq('goal_type', 'revenue')
                .eq('franchisee_user_id', user?.id)
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

    /* ── Fetch accounts receivable (pending) ── */
    const { data: receivables } = useQuery({
        queryKey: ['financial_dashboard_receivables', selectedCD],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            let query = supabase
                .from('accounts_receivable' as any)
                .select('amount, paid')
                .eq('paid', false);

            if (selectedCD) {
                query = query.eq('distribution_center_id', selectedCD);
            } else {
                query = query.eq('franchisee_user_id', user?.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    /* ── Fetch overdue expenses ── */
    const { data: overdueExpenses = [] } = useQuery({
        queryKey: ['financial_dashboard_overdue_expenses', selectedCD],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const todayStr = format(new Date(), 'yyyy-MM-dd');

            let query = supabase
                .from('expenses' as any)
                .select('id, amount, due_date, purpose, distribution_center:distribution_centers!inner(franchisee_user_id)')
                .eq('paid', false)
                .lt('due_date', todayStr);

            if (selectedCD) {
                query = query.eq('distribution_center_id', selectedCD);
            } else {
                query = query.eq('distribution_center.franchisee_user_id', user?.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    /* ── Fetch overdue receivables ── */
    const { data: overdueReceivables = [] } = useQuery({
        queryKey: ['financial_dashboard_overdue_receivables', selectedCD],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            const todayStr = format(new Date(), 'yyyy-MM-dd');

            let query = supabase
                .from('accounts_receivable' as any)
                .select('id, amount, due_date, description')
                .eq('paid', false)
                .lt('due_date', todayStr);

            if (selectedCD) {
                query = query.eq('distribution_center_id', selectedCD);
            } else {
                query = query.eq('franchisee_user_id', user?.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    /* ── Fetch all active accounts ── */
    const { data: accounts } = useQuery({
        queryKey: ['financial_accounts_dashboard'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();

            const { data, error } = await supabase
                .from('financial_accounts' as any)
                .select('name, balance')
                .eq('active', true)
                .eq('franchisee_user_id', user?.id);

            if (error) throw error;
            return data as any[];
        },
    });

    /* ── Fetch financial_records (lançamentos PixPag) for Total Entradas ── */
    const { data: financialRecords } = useQuery({
        queryKey: ['financial_records_dashboard', selectedCD],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();

            let query = supabase
                .from('financial_records' as any)
                .select('amount, status, transaction_type, distribution_center:distribution_centers!inner(franchisee_user_id)')
                .gte('transaction_date', startOfMonthDate)
                .neq('status', 'cancelled')
                .neq('status', 'rejected');

            if (selectedCD) {
                query = query.eq('distribution_center_id', selectedCD);
            } else {
                query = query.eq('distribution_center.franchisee_user_id', user?.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as any[];
        },
    });

    /* ── KPI Calculations ── */
    const kpis = useMemo(() => {
        // Total Entradas = somatório de Vendas nos Fechamentos de Caixa do mês
        const totalIncome = (closings || []).reduce((sum: number, c: any) => sum + Number(c.total_sales || 0), 0);
        const totalExpenses = (expensesData || []).reduce((sum: number, e: any) => sum + Number(e.amount), 0);

        // All-time balance from all accounts
        const totalAccountsBalance = (accounts || []).reduce((sum: number, a: any) => sum + Number(a.balance), 0);

        // Specific Caixa Geral balance
        const caixaGeralAccount = (accounts || []).find(a => a.name === 'Caixa Geral');
        const totalCash = caixaGeralAccount ? Number(caixaGeralAccount.balance) : 0;

        // Total Pending Receivables
        const totalPendingReceivables = (receivables || []).reduce((sum: number, r: any) => sum + Number(r.amount), 0);

        return {
            balance: totalAccountsBalance,
            totalExpenses,
            totalIncome,
            totalCash,
            totalPendingReceivables,
        };
    }, [closings, expensesData, accounts, receivables]);

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
            <div className="bg-white/80 dark:bg-black/60 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 rounded-xl shadow-2xl p-4 min-w-[160px]">
                <p className="font-bold text-gray-900 dark:text-white mb-2 text-sm border-b border-gray-100 dark:border-white/5 pb-1">{label}</p>
                <div className="space-y-1.5">
                    {payload.map((entry: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{entry.name}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">
                                {formatBRL(entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 lg:p-8 space-y-8 min-h-screen bg-gray-50/50 dark:bg-transparent"
        >
            {/* ─── Header & CD Selector ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 dark:bg-white/[0.02] backdrop-blur-md p-6 rounded-2xl border border-gray-200/50 dark:border-white/5 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-xl">
                        <Building2 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Dashboard Financeiro</h1>
                        <p className="text-xs text-gray-500 dark:text-white/40">Visão consolidada do fluxo e saldos</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-64">
                        <DistributionCenterSelect
                            value={selectedCD}
                            onChange={setSelectedCD}
                            placeholder="Todos os CDs"
                        />
                    </div>
                    {selectedCD && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCD('')}
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/10"
                        >
                            Limpar
                        </Button>
                    )}
                </div>
            </div>

            {/* ─── Alerts & Notifications ─── */}
            {(overdueExpenses.length > 0 || overdueReceivables.length > 0) && (
                <div className="flex flex-col gap-3">
                    {overdueExpenses.length > 0 && (
                        <div className="bg-red-50/80 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 backdrop-blur-md p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 dark:bg-red-500/20 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-red-900 dark:text-red-300">Atenção: Existem {overdueExpenses.length} {overdueExpenses.length === 1 ? 'despesa vencida' : 'despesas vencidas'}!</p>
                                    <p className="text-xs text-red-700 dark:text-red-400">Regularize as pendências para evitar juros e perda de fornecimento.</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate('/admin/financeiro/despesas')}
                                className="border-red-200 text-red-700 hover:bg-red-100 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/20 w-full sm:w-auto"
                            >
                                Ver Despesas
                            </Button>
                        </div>
                    )}

                    {overdueReceivables.length > 0 && (
                        <div className="bg-amber-50/80 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 backdrop-blur-md p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-amber-900 dark:text-amber-300">Aviso: {overdueReceivables.length} {overdueReceivables.length === 1 ? 'recebimento em atraso' : 'recebimentos em atraso'}!</p>
                                    <p className="text-xs text-amber-700 dark:text-amber-400">Verifique os clientes com faturas ou pagamentos pendentes.</p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate('/admin/financeiro/receber')}
                                className="border-amber-200 text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/20 w-full sm:w-auto"
                            >
                                Ver Recebimentos
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* ─── KPI Cards Row ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Saldo Total em Contas */}
                <Card className="bg-gradient-to-br from-purple-600 to-indigo-700 border-0 shadow-xl shadow-purple-600/20 text-white overflow-hidden relative group">
                    <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <Wallet className="h-6 w-6 text-white" />
                            </div>
                            <p className="text-sm font-bold text-white/80 uppercase tracking-widest">Saldo Total</p>
                        </div>
                        <p className="text-3xl font-black tracking-tight mb-1">
                            {formatBRL(kpis.balance)}
                        </p>
                        <p className="text-[10px] text-white/60 font-medium">Consolidado em todas as contas</p>
                    </CardContent>
                </Card>

                {/* Saldo em Dinheiro (Caixa Geral) */}
                <Card className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-green-500/5 transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                                <Banknote className="h-6 w-6 text-green-600" />
                            </div>
                            <p className="text-sm font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">Saldo em Dinheiro</p>
                        </div>
                        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
                            {formatBRL(kpis.totalCash)}
                        </p>
                        <p className="text-[10px] text-green-600/60 font-medium">Disponível em Caixa Geral</p>
                    </CardContent>
                </Card>

                {/* Gastos Totais (Mensal) */}
                <Card className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-red-500/5 transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                <ArrowDownLeft className="h-6 w-6 text-red-500" />
                            </div>
                            <p className="text-sm font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">Gastos Totais</p>
                        </div>
                        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
                            {formatBRL(kpis.totalExpenses)}
                        </p>
                        <p className="text-[10px] text-red-500/60 font-medium">Total do mês corrente</p>
                    </CardContent>
                </Card>

                {/* Total Entradas (Mensal) */}
                <Card className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-emerald-500/5 transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                                <ArrowUpRight className="h-6 w-6 text-emerald-500" />
                            </div>
                            <p className="text-sm font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">Total Entradas</p>
                        </div>
                        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
                            {formatBRL(kpis.totalIncome)}
                        </p>
                        <p className="text-[10px] text-emerald-600/60 font-medium">Total do mês corrente</p>
                    </CardContent>
                </Card>

                {/* Previsão a Receber */}
                <Card className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-blue-500/5 transition-all">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-blue-500" />
                            </div>
                            <p className="text-sm font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">A Receber</p>
                        </div>
                        <p className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
                            {formatBRL(kpis.totalPendingReceivables)}
                        </p>
                        <p className="text-[10px] text-blue-500/60 font-medium">Contas pendentes de recebimento</p>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Charts Row ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart — Fluxo de Caixa */}
                <Card className="lg:col-span-2 bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <CardHeader className="pb-4 border-b border-gray-100 dark:border-white/5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="h-5 w-5 text-emerald-500" />
                                <CardTitle className="text-lg font-bold">Fechamento de Caixa</CardTitle>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                                <span className="flex items-center gap-1.5 text-emerald-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                                    Receitas
                                </span>
                                <span className="flex items-center gap-1.5 text-purple-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm" />
                                    Despesas
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-8">
                        <div className="h-[320px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb33" vertical={false} />
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
                                        tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}K`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="receitas"
                                        stroke="#10B981"
                                        strokeWidth={3}
                                        fill="url(#gradReceitas)"
                                        animationDuration={1500}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="despesas"
                                        stroke="#8B5CF6"
                                        strokeWidth={3}
                                        fill="url(#gradDespesas)"
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Side Stats Side */}
                <div className="space-y-8">
                    {/* Metas Card */}
                    <Card className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Target className="h-5 w-5 text-purple-600" />
                                    <CardTitle className="text-base font-bold">Meta Mensal</CardTitle>
                                </div>
                                <span className="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest px-2 py-1 bg-gray-100 dark:bg-white/5 rounded-lg">
                                    {format(today, 'MMM, yyyy', { locale: ptBR })}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-500 dark:text-white/40">Progresso Atual</p>
                                <p className="text-sm font-black text-gray-900 dark:text-white">{Math.min(100, Math.round(goalProgress))}%</p>
                            </div>

                            <div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, goalProgress)}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/5">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Alcançado</p>
                                    <p className="text-sm font-black text-gray-900 dark:text-white">{formatBRL(kpis.totalIncome)}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-100 dark:border-white/5">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Objetivo</p>
                                    <p className="text-sm font-black text-gray-900 dark:text-white">{goalTarget > 0 ? formatBRL(goalTarget) : 'ND'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Breakdown Bar Chart */}
                    <Card className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <div className="w-2 h-5 bg-purple-500 rounded-sm" />
                                Distribuição de Gastos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={expenseBreakdown} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: '#9CA3AF', fontWeight: 600 }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}K`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                                backdropFilter: 'blur(12px)',
                                                border: '1px solid rgba(0,0,0,0.1)',
                                                borderRadius: '12px',
                                                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                                color: '#111827',
                                                fontSize: '11px',
                                                fontWeight: 'bold'
                                            }}
                                            itemStyle={{ color: '#111827' }}
                                        />
                                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={28}>
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
            <Card className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <CardHeader className="pb-4 flex flex-row items-center justify-between border-b border-gray-100 dark:border-white/5">
                    <div>
                        <CardTitle className="text-lg font-bold">Fechamentos Recentes</CardTitle>
                        <p className="text-xs text-gray-500 mt-0.5">Últimas 5 operações registradas</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/admin/financeiro/fluxo')}
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 font-bold text-xs uppercase tracking-widest"
                    >
                        Ver Detalhes
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left border-b border-gray-100 dark:border-white/[0.05]">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest">Data</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest">Centro de Distr.</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest">Total Vendas</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest">Retiradas/San.</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest">Saldo Líquido</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-widest">Conferente</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/[0.02]">
                                {recentClosings.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic font-medium">
                                            Nenhum registro encontrado para este período.
                                        </td>
                                    </tr>
                                )}
                                {recentClosings.map((c: any) => (
                                    <tr key={c.id} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900 dark:text-white">
                                                {format(new Date(c.closing_date + 'T12:00:00'), 'dd MMM yyyy', { locale: ptBR })}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-white/40">
                                            {c.distribution_center?.name || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-emerald-600 font-black">
                                            {formatBRL(Number(c.total_sales))}
                                        </td>
                                        <td className="px-6 py-4 text-red-500 font-bold opacity-80">
                                            {formatBRL(Number(c.total_expenses))}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg font-black ${Number(c.balance) >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                                                {formatBRL(Number(c.balance))}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 dark:text-white/40 text-xs font-semibold">
                                            {c.operator?.name || '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
