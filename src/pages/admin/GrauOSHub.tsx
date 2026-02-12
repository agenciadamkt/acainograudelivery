import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import {
    LayoutDashboard,
    GraduationCap,
    BarChart3,
    Bot,
    Users,
    ArrowRight,
    Trophy,
    Star,
    Zap,
    TrendingUp,
    Bell,
    Shield,
    LogOut,
    Store,
    ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import logoCircular from '@/assets/logo-circular.png';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect } from 'react';

// Gamification levels
const LEVELS = [
    { name: 'Bronze', min: 0, max: 999, color: 'from-amber-700 to-amber-500', icon: Shield, textColor: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    { name: 'Prata', min: 1000, max: 4999, color: 'from-gray-400 to-gray-300', icon: Star, textColor: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
    { name: 'Ouro', min: 5000, max: 9999, color: 'from-yellow-500 to-yellow-300', icon: Trophy, textColor: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    { name: 'Elite', min: 10000, max: Infinity, color: 'from-purple-600 to-indigo-400', icon: Zap, textColor: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
];

function getUserLevel(points: number) {
    return LEVELS.find(l => points >= l.min && points <= l.max) || LEVELS[0];
}

const modules = [
    {
        id: 'operacao',
        title: 'Operação',
        subtitle: 'PDV, Delivery, Estoque e Financeiro',
        description: 'Gerencie pedidos, cardápio, entregas e todo o dia-a-dia da sua unidade.',
        icon: LayoutDashboard,
        gradient: 'from-orange-500 to-red-500',
        bgGlow: 'bg-orange-500/10',
        path: '/admin/dashboard',
        stats: [
            { label: 'PDV', icon: Store },
            { label: 'Entregas', icon: TrendingUp },
            { label: 'Relatórios', icon: BarChart3 },
        ]
    },
    {
        id: 'universidade',
        title: 'Universidade no Grau',
        subtitle: 'Trilhas de aprendizado e treinamentos',
        description: 'Capacite sua equipe com conteúdos exclusivos da franquia.',
        icon: GraduationCap,
        gradient: 'from-blue-500 to-cyan-400',
        bgGlow: 'bg-blue-500/10',
        path: '/admin/universidade',
        stats: [
            { label: 'Trilhas', icon: GraduationCap },
            { label: 'Certificados', icon: Trophy },
            { label: 'Progresso', icon: TrendingUp },
        ]
    },
    {
        id: 'performance',
        title: 'Performance',
        subtitle: 'Métricas e ranking da unidade',
        description: 'Acompanhe KPIs, compare com a rede e suba no ranking.',
        icon: BarChart3,
        gradient: 'from-emerald-500 to-green-400',
        bgGlow: 'bg-emerald-500/10',
        path: '/admin/performance',
        stats: [
            { label: 'KPIs', icon: BarChart3 },
            { label: 'Ranking', icon: Trophy },
            { label: 'Metas', icon: Star },
        ]
    },
    {
        id: 'assistente',
        title: 'Assistente IA',
        subtitle: 'GrauBot — seu consultor 24/7',
        description: 'Tire dúvidas sobre vendas, operação, marketing e financeiro.',
        icon: Bot,
        gradient: 'from-purple-600 to-indigo-500',
        bgGlow: 'bg-purple-500/10',
        path: '/admin/assistente',
        stats: [
            { label: 'Vendas', icon: TrendingUp },
            { label: 'Marketing', icon: Users },
            { label: 'Financeiro', icon: BarChart3 },
        ]
    },
];

// Mock notifications for now
const notifications = [
    { id: 1, text: 'Novo treinamento obrigatório disponível', type: 'warning' as const, time: '2h atrás' },
    { id: 2, text: 'Sua unidade subiu para o Top 5 do ranking!', type: 'success' as const, time: '5h atrás' },
    { id: 3, text: 'Meta mensal de faturamento atingida! 🎉', type: 'success' as const, time: '1d atrás' },
];

export default function GrauOSHub() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { currentStore } = useStore();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Mock user points — will come from DB later
    const userPoints = 2350;
    const level = getUserLevel(userPoints);
    const LevelIcon = level.icon;

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const greeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Parceiro';

    return (
        <div className="min-h-screen bg-[#0F0F14] text-white">
            {/* Ambient background effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-600/5 blur-3xl" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/5 blur-3xl" />
                <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full bg-orange-500/3 blur-3xl" />
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Top Navigation */}
                <nav className="border-b border-white/5 bg-white/[0.02] backdrop-blur-xl">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-16">
                            {/* Logo */}
                            <div className="flex items-center gap-3">
                                <img src={logoCircular} alt="Açaí no Grau" className="h-10 w-10" />
                                <div>
                                    <h1 className="text-lg font-bold tracking-tight">
                                        Grau<span className="text-purple-400">OS</span>
                                    </h1>
                                    <p className="text-[10px] text-white/40 font-medium tracking-widest uppercase">Sistema Operacional</p>
                                </div>
                            </div>

                            {/* Right side */}
                            <div className="flex items-center gap-3">
                                {/* Level Badge */}
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${level.borderColor} ${level.bgColor}`}>
                                    <LevelIcon className={`h-4 w-4 ${level.textColor}`} />
                                    <span className={`text-xs font-bold ${level.textColor}`}>{level.name}</span>
                                    <span className={`text-[10px] ${level.textColor} opacity-70`}>{userPoints.toLocaleString()} pts</span>
                                </div>

                                {/* Notifications */}
                                <Button variant="ghost" size="icon" className="relative text-white/60 hover:text-white hover:bg-white/10">
                                    <Bell className="h-5 w-5" />
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                                </Button>

                                {/* Store indicator */}
                                {currentStore && (
                                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                                        <div className="w-2 h-2 rounded-full bg-green-400" />
                                        <span className="text-xs text-white/70 font-medium">{currentStore.name}</span>
                                    </div>
                                )}

                                {/* Logout */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={signOut}
                                    className="text-white/40 hover:text-red-400 hover:bg-red-500/10"
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                    {/* Hero / Greeting */}
                    <div className="mb-10 md:mb-14">
                        <p className="text-white/40 text-sm font-medium mb-1">
                            {format(currentTime, "eeee, dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold mb-2">
                            {greeting()}, <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">{userName}</span> 👋
                        </h2>
                        <p className="text-white/50 text-lg">
                            O que vamos colocar no grau hoje?
                        </p>
                    </div>

                    {/* Module Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
                        {modules.map((mod, index) => {
                            const Icon = mod.icon;
                            return (
                                <button
                                    key={mod.id}
                                    onClick={() => navigate(mod.path)}
                                    className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-6 md:p-8 text-left transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.05] hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/5 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    {/* Glow effect on hover */}
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${mod.bgGlow}`} />

                                    {/* Gradient orb */}
                                    <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${mod.gradient} opacity-10 group-hover:opacity-20 group-hover:scale-150 transition-all duration-700`} />

                                    <div className="relative z-10">
                                        {/* Icon + Title */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 rounded-xl bg-gradient-to-br ${mod.gradient} shadow-lg`}>
                                                <Icon className="h-6 w-6 text-white" />
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all duration-300" />
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-1">{mod.title}</h3>
                                        <p className="text-sm text-white/40 font-medium mb-3">{mod.subtitle}</p>
                                        <p className="text-sm text-white/30 leading-relaxed mb-5">{mod.description}</p>

                                        {/* Mini stats */}
                                        <div className="flex items-center gap-3">
                                            {mod.stats.map((stat) => {
                                                const StatIcon = stat.icon;
                                                return (
                                                    <div
                                                        key={stat.label}
                                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5"
                                                    >
                                                        <StatIcon className="h-3 w-3 text-white/30" />
                                                        <span className="text-[11px] text-white/40 font-medium">{stat.label}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Quick Access: Comunidade */}
                    <div className="mb-12">
                        <button
                            onClick={() => navigate('/admin/comunidade')}
                            className="w-full group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-white/[0.01] backdrop-blur-sm p-5 text-left transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.05] focus:outline-none"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
                                        <Users className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Comunidade Grau</h3>
                                        <p className="text-xs text-white/40">Feed, desafios, cases de sucesso e ranking geral</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-white/20 group-hover:text-white/50 group-hover:translate-x-1 transition-all" />
                            </div>
                        </button>
                    </div>

                    {/* Notifications */}
                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">Atividade Recente</h3>
                        <div className="space-y-2">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${n.type === 'warning' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                                        <span className="text-sm text-white/70">{n.text}</span>
                                    </div>
                                    <span className="text-xs text-white/30">{n.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <footer className="border-t border-white/5 pt-6 pb-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/20">
                            <div className="flex items-center gap-2">
                                <img src={logoCircular} alt="" className="h-5 w-5 opacity-30" />
                                <span>GrauOS v1.0 — Açaí no Grau</span>
                            </div>
                            <span>© {new Date().getFullYear()} Todos os direitos reservados</span>
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
}
