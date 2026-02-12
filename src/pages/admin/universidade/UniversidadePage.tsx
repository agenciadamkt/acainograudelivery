import { useState } from 'react';
import { GrauOSLayout } from '@/components/admin/GrauOSLayout';
import {
    GraduationCap,
    Play,
    Clock,
    CheckCircle2,
    Lock,
    Star,
    Trophy,
    ChevronRight,
    Search,
    Filter,
    BookOpen,
    TrendingUp,
    Megaphone,
    DollarSign,
    ChefHat
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Mock data for trails
const categories = [
    {
        id: 'onboarding',
        title: '🚀 Onboarding',
        subtitle: 'Primeiros passos da sua unidade',
        trails: [
            { id: '1', title: 'Abertura da Loja', description: 'Procedimentos diários de abertura', lessons: 8, duration: '45min', progress: 100, required: true, thumbnail: '🏪', level: 'Básico' },
            { id: '2', title: 'Fechamento de Caixa', description: 'Rotina de encerramento do dia', lessons: 6, duration: '30min', progress: 60, required: true, thumbnail: '💰', level: 'Básico' },
            { id: '3', title: 'Padrão de Atendimento', description: 'Como encantar cada cliente', lessons: 10, duration: '1h', progress: 25, required: true, thumbnail: '🤝', level: 'Básico' },
            { id: '4', title: 'Uso do PDV', description: 'Domine o sistema de vendas', lessons: 12, duration: '1h30', progress: 0, required: true, thumbnail: '🖥️', level: 'Básico' },
        ]
    },
    {
        id: 'operacao',
        title: '⚙️ Operação',
        subtitle: 'Excelência operacional',
        trails: [
            { id: '5', title: 'Gestão de Estoque', description: 'Controle e prevenção de perdas', lessons: 8, duration: '50min', progress: 0, required: false, thumbnail: '📦', level: 'Intermediário' },
            { id: '6', title: 'Higiene e BPF', description: 'Boas Práticas de Fabricação', lessons: 15, duration: '2h', progress: 40, required: true, thumbnail: '🧼', level: 'Básico' },
            { id: '7', title: 'Montagem de Açaí', description: 'Padrão de montagem das receitas', lessons: 20, duration: '2h30', progress: 0, required: false, thumbnail: '🍇', level: 'Básico' },
            { id: '8', title: 'Delivery Perfeito', description: 'Embalagem, tempo e qualidade', lessons: 7, duration: '40min', progress: 0, required: false, thumbnail: '🛵', level: 'Intermediário' },
        ]
    },
    {
        id: 'marketing',
        title: '📣 Marketing & Vendas',
        subtitle: 'Estratégias para vender mais',
        trails: [
            { id: '9', title: 'Marketing Local', description: 'Estratégias para sua região', lessons: 10, duration: '1h20', progress: 0, required: false, thumbnail: '📍', level: 'Avançado' },
            { id: '10', title: 'Redes Sociais', description: 'Conteúdo que engaja e vende', lessons: 12, duration: '1h40', progress: 0, required: false, thumbnail: '📱', level: 'Intermediário' },
            { id: '11', title: 'Upselling & Cross-selling', description: 'Técnicas para aumentar o ticket', lessons: 6, duration: '35min', progress: 0, required: false, thumbnail: '🎯', level: 'Avançado' },
        ]
    },
    {
        id: 'financeiro',
        title: '💰 Financeiro',
        subtitle: 'Saúde financeira da unidade',
        trails: [
            { id: '12', title: 'CMV e Precificação', description: 'Entenda seus custos e margens', lessons: 8, duration: '1h', progress: 0, required: false, thumbnail: '📊', level: 'Avançado' },
            { id: '13', title: 'Fluxo de Caixa', description: 'Controle financeiro diário', lessons: 6, duration: '45min', progress: 0, required: false, thumbnail: '📈', level: 'Intermediário' },
        ]
    },
];

const filterOptions = ['Todas', 'Em Progresso', 'Concluídas', 'Obrigatórias'];

function TrailCard({ trail }: { trail: typeof categories[0]['trails'][0] }) {
    const isComplete = trail.progress === 100;
    const isLocked = trail.progress === 0 && !trail.required;

    return (
        <button className="group w-[260px] md:w-[280px] flex-shrink-0 text-left focus:outline-none">
            <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03] transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.06] hover:scale-[1.03] hover:shadow-xl hover:shadow-purple-500/5">
                {/* Thumbnail */}
                <div className="h-36 flex items-center justify-center bg-gradient-to-br from-white/5 to-white/[0.01] relative">
                    <span className="text-5xl">{trail.thumbnail}</span>
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity p-3 rounded-full bg-white/20 backdrop-blur-sm">
                            <Play className="h-6 w-6 text-white fill-white" />
                        </div>
                    </div>
                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex gap-1.5">
                        {trail.required && (
                            <Badge className="bg-red-500/90 text-white text-[10px] px-1.5 py-0.5 border-0">Obrigatório</Badge>
                        )}
                        <Badge className="bg-white/10 text-white/70 text-[10px] px-1.5 py-0.5 border-0 backdrop-blur-sm">{trail.level}</Badge>
                    </div>
                    {isComplete && (
                        <div className="absolute top-2 right-2">
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="p-4">
                    <h4 className="text-sm font-semibold text-white mb-1 line-clamp-1">{trail.title}</h4>
                    <p className="text-xs text-white/40 mb-3 line-clamp-1">{trail.description}</p>

                    <div className="flex items-center justify-between text-[11px] text-white/30 mb-2">
                        <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            <span>{trail.lessons} aulas</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{trail.duration}</span>
                        </div>
                    </div>

                    {trail.progress > 0 && (
                        <div className="space-y-1">
                            <Progress value={trail.progress} className="h-1.5 bg-white/5" />
                            <span className="text-[10px] text-white/30">{trail.progress}% concluído</span>
                        </div>
                    )}
                </div>
            </div>
        </button>
    );
}

export default function UniversidadePage() {
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('Todas');

    // Featured trail
    const featured = categories[0].trails[1]; // Fechamento de Caixa (in progress)

    return (
        <GrauOSLayout>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600/20 to-cyan-500/10 border border-blue-500/10 p-6 md:p-8 mb-8">
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl" />
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-500/20">
                            <GraduationCap className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Continue de onde parou</h2>
                            <p className="text-white/50 text-sm mb-3">
                                <span className="text-white/80 font-semibold">{featured.title}</span> — {featured.progress}% concluído
                            </p>
                            <Progress value={featured.progress} className="h-2 max-w-sm bg-white/10" />
                        </div>
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-gray-900 font-semibold text-sm hover:bg-white/90 transition-colors shadow-lg">
                            <Play className="h-4 w-4 fill-gray-900" />
                            Continuar
                        </button>
                    </div>
                </div>

                {/* Search + Filters */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar trilhas..."
                            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 h-10 rounded-xl focus:ring-blue-500/20 focus:border-blue-500/30"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {filterOptions.map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${activeFilter === f
                                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                        : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Trail Categories (Netflix-style) */}
                <div className="space-y-10">
                    {categories.map(cat => (
                        <section key={cat.id}>
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{cat.title}</h3>
                                    <p className="text-xs text-white/40">{cat.subtitle}</p>
                                </div>
                                <button className="flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors">
                                    Ver todas <ChevronRight className="h-3 w-3" />
                                </button>
                            </div>

                            {/* Horizontal scroll */}
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                                {cat.trails.map(trail => (
                                    <TrailCard key={trail.id} trail={trail} />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                {/* Stats Summary */}
                <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Trilhas Disponíveis', value: '13', icon: BookOpen },
                        { label: 'Em Progresso', value: '3', icon: TrendingUp },
                        { label: 'Concluídas', value: '1', icon: CheckCircle2 },
                        { label: 'Certificados', value: '1', icon: Trophy },
                    ].map(s => {
                        const Icon = s.icon;
                        return (
                            <div key={s.label} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                                <Icon className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                                <p className="text-xl font-bold text-white">{s.value}</p>
                                <p className="text-[11px] text-white/40">{s.label}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </GrauOSLayout>
    );
}
