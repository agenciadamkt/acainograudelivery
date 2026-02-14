import { GrauOSLayout } from '@/components/admin/GrauOSLayout';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    Star,
    Trophy,
    Target,
    ArrowUp,
    ArrowDown,
    Minus,
    Users,
    ShoppingBag,
    Percent
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    Legend
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';

interface RankingItem {
    store_id: string;
    store_name: string;
    store_city: string;
    revenue: number;
    lessons_completed: number;
    score: number;
    rank_pos: number;
    is_current_user: boolean;
}

// Mock data
// Mock data (kept for charts)
const kpis = [
    { label: 'Faturamento', value: 'R$ 87.350', target: 'R$ 100.000', percent: 87, trend: 12, icon: DollarSign, color: 'text-green-500 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-500/10' },
    { label: 'Ticket Médio', value: 'R$ 42,80', target: 'R$ 45,00', percent: 95, trend: 5, icon: ShoppingBag, color: 'text-blue-500 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-500/10' },
    { label: 'CMV', value: '32%', target: '< 35%', percent: 91, trend: -2, icon: Percent, color: 'text-emerald-500 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-500/10' },
    { label: 'NPS', value: '78', target: '80', percent: 97, trend: 3, icon: Star, color: 'text-yellow-500 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-500/10' },
];

const monthlyRevenue = [
    { month: 'Set', unidade: 72000, rede: 68000 },
    { month: 'Out', unidade: 78000, rede: 70000 },
    { month: 'Nov', unidade: 85000, rede: 72000 },
    { month: 'Dez', unidade: 95000, rede: 75000 },
    { month: 'Jan', unidade: 82000, rede: 73000 },
    { month: 'Fev', unidade: 87350, rede: 74000 },
];

const radarData = [
    { subject: 'Faturamento', A: 87, B: 74, fullMark: 100 },
    { subject: 'Ticket Médio', A: 95, B: 78, fullMark: 100 },
    { subject: 'CMV', A: 91, B: 80, fullMark: 100 },
    { subject: 'NPS', A: 97, B: 82, fullMark: 100 },
    { subject: 'Treinamentos', A: 60, B: 65, fullMark: 100 },
    { subject: 'Delivery', A: 85, B: 70, fullMark: 100 },
];

function KPICard({ kpi }: { kpi: typeof kpis[0] }) {
    const Icon = kpi.icon;
    const isPositive = kpi.trend > 0;

    return (
        <div className="p-5 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.1] transition-all shadow-sm dark:shadow-none">
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${kpi.bgColor}`}>
                    <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {Math.abs(kpi.trend)}%
                </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{kpi.value}</p>
            <p className="text-xs text-gray-500 dark:text-white/40 mb-3">Meta: {kpi.target}</p>
            <div className="space-y-1">
                <Progress
                    value={kpi.percent}
                    className="h-1.5 bg-gray-100 dark:bg-white/5"
                />
                <div className="flex justify-between">
                    <span className="text-[10px] text-gray-400 dark:text-white/30">{kpi.percent}% da meta</span>
                    <span className={`text-[10px] font-medium ${kpi.percent >= 90 ? 'text-green-600 dark:text-green-400' : kpi.percent >= 70 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'}`}>
                        {kpi.percent >= 90 ? '🟢' : kpi.percent >= 70 ? '🟡' : '🔴'}
                    </span>
                </div>
            </div>
        </div>
    );
}

import { usePerformanceMetrics } from '@/hooks/usePerformanceMetrics'; // Add import

// ... imports ...

export default function PerformancePage() {
    const { currentStore } = useStore();
    const { data: rankingData, isLoading: loadingRanking } = useQuery({
        // ... existing ranking query ...
        queryKey: ['network-ranking'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_network_ranking' as any);
            if (error) throw error;
            return data as unknown as RankingItem[];
        }
    });

    // Fetch Performance Metrics
    const { data: performance, isLoading: loadingPerformance } = usePerformanceMetrics();

    // Prepare KPI Data
    const realKpis = [
        {
            label: 'Faturamento',
            value: performance?.kpis.revenue.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00',
            target: 'R$ 50.000', // Mock target
            percent: performance ? Math.min(100, Math.round((performance.kpis.revenue.value / 50000) * 100)) : 0,
            trend: performance?.kpis.revenue.trend || 0,
            icon: DollarSign,
            color: 'text-green-500 dark:text-green-400',
            bgColor: 'bg-green-100 dark:bg-green-500/10'
        },
        {
            label: 'Ticket Médio',
            value: performance?.kpis.ticket.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00',
            target: 'R$ 45,00',
            percent: 80, // Mock for now
            trend: performance?.kpis.ticket.trend || 0,
            icon: ShoppingBag,
            color: 'text-blue-500 dark:text-blue-400',
            bgColor: 'bg-blue-100 dark:bg-blue-500/10'
        },
        // Keep Mock KPIs for visual completeness
        { label: 'CMV', value: '32%', target: '< 35%', percent: 91, trend: -2, icon: Percent, color: 'text-emerald-500 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-500/10' },
        { label: 'NPS', value: '78', target: '80', percent: 97, trend: 3, icon: Star, color: 'text-yellow-500 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-500/10' },
    ];

    const myRank = rankingData?.find(r => r.is_current_user);

    return (
        <GrauOSLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-300">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-400 shadow-lg shadow-emerald-500/20">
                            <BarChart3 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Performance da Unidade</h2>
                            <p className="text-sm text-gray-500 dark:text-white/40">Visão geral do mês atual</p>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {realKpis.map(kpi => (
                        <KPICard key={kpi.label} kpi={kpi} />
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Revenue Line Chart */}
                    <div className="lg:col-span-2 p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] shadow-sm dark:shadow-none">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Faturamento Diário</h3>
                                <p className="text-xs text-gray-500 dark:text-white/40">Progresso do mês</p>
                            </div>
                        </div>
                        <div className="h-64">
                            {loadingPerformance ? (
                                <div className="h-full flex items-center justify-center text-gray-400 dark:text-white/20 text-sm">Carregando gráfico...</div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={performance?.dailyChart || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-white/5" vertical={false} />
                                        <XAxis
                                            dataKey="day"
                                            fontSize={11}
                                            tick={{ fill: 'currentColor' }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            fontSize={11}
                                            tick={{ fill: 'currentColor' }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(100,100,100,0.1)' }}
                                            contentStyle={{
                                                backgroundColor: 'var(--tooltip-bg, #1a1a2e)',
                                                borderColor: 'var(--tooltip-border, rgba(255,255,255,0.1))',
                                                borderRadius: '12px',
                                                color: 'var(--tooltip-text, #fff)',
                                                fontSize: '12px'
                                            }}
                                            formatter={(value: number) => [`R$ ${value.toLocaleString()}`, 'Faturamento']}
                                        />
                                        <Bar
                                            dataKey="value"
                                            fill="#10b981"
                                            radius={[4, 4, 0, 0]}
                                            name="Faturamento"
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>

                    {/* Radar Chart */}
                    <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] shadow-sm dark:shadow-none">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Desempenho Geral</h3>
                        <p className="text-xs text-gray-500 dark:text-white/40 mb-4">Comparativo multidimensional</p>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart outerRadius={80} data={radarData}>
                                    <PolarGrid stroke="currentColor" className="text-gray-200 dark:text-white/10" />
                                    <PolarAngleAxis
                                        dataKey="subject"
                                        tick={{ fill: 'currentColor', fontSize: 10 }}
                                    />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Sua Unidade" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                                    <Radar name="Média Rede" dataKey="B" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.1} strokeWidth={1} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Ranking */}
                <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] shadow-sm dark:shadow-none">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-yellow-500" />
                                Ranking da Rede
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-white/40">Baseado em pontuação de desempenho + treinamentos</p>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {loadingRanking ? '...' : myRank ? `Sua posição: #${myRank.rank_pos}` : 'N/A'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {loadingRanking ? (
                            <div className="text-center py-8 text-gray-400 dark:text-white/40">Carregando ranking...</div>
                        ) : rankingData?.map(r => (
                            <div
                                key={r.store_id}
                                className={`flex items-center justify-between p-3.5 rounded-xl transition-all ${r.is_current_user
                                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20'
                                    : 'bg-gray-50 dark:bg-white/[0.01] border border-gray-100 dark:border-white/[0.04] hover:bg-gray-100 dark:hover:bg-white/[0.03]'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${r.rank_pos === 1 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400' :
                                        r.rank_pos === 2 ? 'bg-gray-200 text-gray-600 dark:bg-gray-400/20 dark:text-gray-300' :
                                            r.rank_pos === 3 ? 'bg-amber-100 text-amber-600 dark:bg-amber-600/20 dark:text-amber-500' :
                                                'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40'
                                        }`}>
                                        {r.rank_pos <= 3 ? ['🥇', '🥈', '🥉'][r.rank_pos - 1] : r.rank_pos}
                                    </div>
                                    <div>
                                        <span className={`text-sm font-medium ${r.is_current_user ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-white/80'}`}>
                                            {r.store_name} {r.is_current_user && '⭐'}
                                        </span>
                                        <p className="text-[11px] text-gray-400 dark:text-white/30">{Number(r.score).toLocaleString()} pontos</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* Using mock trend for now as we don't have historical data yet */}
                                    <Minus className="h-3.5 w-3.5 text-gray-300 dark:text-white/30" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </GrauOSLayout>
    );
}
