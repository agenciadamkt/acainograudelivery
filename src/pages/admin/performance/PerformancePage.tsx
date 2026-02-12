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

// Mock data
const kpis = [
    { label: 'Faturamento', value: 'R$ 87.350', target: 'R$ 100.000', percent: 87, trend: 12, icon: DollarSign, color: 'text-green-400', bgColor: 'bg-green-500/10' },
    { label: 'Ticket Médio', value: 'R$ 42,80', target: 'R$ 45,00', percent: 95, trend: 5, icon: ShoppingBag, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    { label: 'CMV', value: '32%', target: '< 35%', percent: 91, trend: -2, icon: Percent, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    { label: 'NPS', value: '78', target: '80', percent: 97, trend: 3, icon: Star, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
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

const ranking = [
    { pos: 1, name: 'Unidade Alphaville', points: 9800, trend: 'up' as const, isYou: false },
    { pos: 2, name: 'Unidade Vila Mariana', points: 9200, trend: 'up' as const, isYou: false },
    { pos: 3, name: 'Sua Unidade', points: 8750, trend: 'up' as const, isYou: true },
    { pos: 4, name: 'Unidade Moema', points: 8400, trend: 'down' as const, isYou: false },
    { pos: 5, name: 'Unidade Pinheiros', points: 8100, trend: 'same' as const, isYou: false },
    { pos: 6, name: 'Unidade Itaim', points: 7800, trend: 'down' as const, isYou: false },
    { pos: 7, name: 'Unidade Perdizes', points: 7500, trend: 'up' as const, isYou: false },
];

function KPICard({ kpi }: { kpi: typeof kpis[0] }) {
    const Icon = kpi.icon;
    const isPositive = kpi.trend > 0;

    return (
        <div className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all">
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${kpi.bgColor}`}>
                    <Icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {Math.abs(kpi.trend)}%
                </div>
            </div>
            <p className="text-2xl font-bold text-white mb-0.5">{kpi.value}</p>
            <p className="text-xs text-white/40 mb-3">Meta: {kpi.target}</p>
            <div className="space-y-1">
                <Progress
                    value={kpi.percent}
                    className="h-1.5 bg-white/5"
                />
                <div className="flex justify-between">
                    <span className="text-[10px] text-white/30">{kpi.percent}% da meta</span>
                    <span className={`text-[10px] font-medium ${kpi.percent >= 90 ? 'text-green-400' : kpi.percent >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {kpi.percent >= 90 ? '🟢' : kpi.percent >= 70 ? '🟡' : '🔴'}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function PerformancePage() {
    return (
        <GrauOSLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-400 shadow-lg shadow-emerald-500/20">
                            <BarChart3 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Performance da Unidade</h2>
                            <p className="text-sm text-white/40">Fevereiro 2026 • Comparado com a média da rede</p>
                        </div>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {kpis.map(kpi => (
                        <KPICard key={kpi.label} kpi={kpi} />
                    ))}
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* Revenue Line Chart */}
                    <div className="lg:col-span-2 p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <h3 className="text-sm font-semibold text-white mb-1">Faturamento Mensal</h3>
                        <p className="text-xs text-white/40 mb-4">Sua unidade vs média da rede</p>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={monthlyRevenue}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="month" fontSize={11} tick={{ fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
                                    <YAxis fontSize={11} tick={{ fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                                        formatter={(value: number) => [`R$ ${value.toLocaleString()}`, '']}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }} />
                                    <Line type="monotone" dataKey="unidade" stroke="#10b981" strokeWidth={2.5} dot={{ fill: '#10b981', r: 4 }} name="Sua Unidade" />
                                    <Line type="monotone" dataKey="rede" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Média Rede" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Radar Chart */}
                    <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <h3 className="text-sm font-semibold text-white mb-1">Desempenho Geral</h3>
                        <p className="text-xs text-white/40 mb-4">Comparativo multidimensional</p>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart outerRadius={80} data={radarData}>
                                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Sua Unidade" dataKey="A" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                                    <Radar name="Média Rede" dataKey="B" stroke="rgba(255,255,255,0.3)" fill="rgba(255,255,255,0.05)" fillOpacity={0.1} strokeWidth={1} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Ranking */}
                <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-yellow-400" />
                                Ranking da Rede
                            </h3>
                            <p className="text-xs text-white/40">Baseado em pontuação de desempenho + treinamentos</p>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <span className="text-xs font-semibold text-emerald-400">Sua posição: #3</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {ranking.map(r => (
                            <div
                                key={r.pos}
                                className={`flex items-center justify-between p-3.5 rounded-xl transition-all ${r.isYou
                                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                                        : 'bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.03]'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${r.pos === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                                            r.pos === 2 ? 'bg-gray-400/20 text-gray-300' :
                                                r.pos === 3 ? 'bg-amber-600/20 text-amber-500' :
                                                    'bg-white/5 text-white/40'
                                        }`}>
                                        {r.pos <= 3 ? ['🥇', '🥈', '🥉'][r.pos - 1] : r.pos}
                                    </div>
                                    <div>
                                        <span className={`text-sm font-medium ${r.isYou ? 'text-emerald-300' : 'text-white/80'}`}>
                                            {r.name} {r.isYou && '⭐'}
                                        </span>
                                        <p className="text-[11px] text-white/30">{r.points.toLocaleString()} pontos</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {r.trend === 'up' && <ArrowUp className="h-3.5 w-3.5 text-green-400" />}
                                    {r.trend === 'down' && <ArrowDown className="h-3.5 w-3.5 text-red-400" />}
                                    {r.trend === 'same' && <Minus className="h-3.5 w-3.5 text-white/30" />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </GrauOSLayout>
    );
}
