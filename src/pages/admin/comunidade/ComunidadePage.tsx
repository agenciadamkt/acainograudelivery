import { useState } from 'react';
import { GrauOSLayout } from '@/components/admin/GrauOSLayout';
import {
    Users,
    Trophy,
    Target,
    Heart,
    MessageCircle,
    ChevronUp,
    Clock,
    Star,
    Crown,
    Medal,
    Flame,
    Gift,
    ThumbsUp,
    Share2,
    TrendingUp,
    Shield,
    Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Level system
const levels = [
    { name: 'Bronze', min: 0, max: 999, color: 'from-amber-700 to-amber-500', textColor: 'text-amber-500', icon: Shield },
    { name: 'Prata', min: 1000, max: 4999, color: 'from-gray-400 to-gray-300', textColor: 'text-gray-400', icon: Star },
    { name: 'Ouro', min: 5000, max: 9999, color: 'from-yellow-500 to-yellow-300', textColor: 'text-yellow-500', icon: Crown },
    { name: 'Elite', min: 10000, max: Infinity, color: 'from-purple-600 to-indigo-400', textColor: 'text-purple-400', icon: Zap },
];

// Mock challenges
const challenges = [
    { id: '1', title: 'Mestre do Upselling', description: 'Atinja ticket médio de R$ 50 por 7 dias consecutivos', reward: 500, daysLeft: 12, progress: 45, icon: '🎯' },
    { id: '2', title: 'Velocidade Máxima', description: 'Mantenha tempo médio de preparo abaixo de 4min por 5 dias', reward: 300, daysLeft: 8, progress: 60, icon: '⚡' },
    { id: '3', title: 'Acadêmico Estrela', description: 'Complete 3 trilhas da Universidade neste mês', reward: 400, daysLeft: 18, progress: 33, icon: '🎓' },
    { id: '4', title: 'NPS Perfeito', description: 'Consiga 10 avaliações 5 estrelas em uma semana', reward: 250, daysLeft: 5, progress: 70, icon: '⭐' },
];

// Mock feed
const feedPosts = [
    {
        id: '1',
        author: 'Unidade Alphaville',
        avatar: '🏆',
        level: 'Ouro',
        content: 'Case: Aumentamos nosso faturamento em 40% após implementar a estratégia de combos premium no delivery. Compartilhando os resultados! 📈',
        likes: 47,
        comments: 12,
        time: '3h atrás',
        type: 'case' as const,
    },
    {
        id: '2',
        author: 'Sede Franquia',
        avatar: '🏢',
        level: 'Elite',
        content: '🚀 Nova trilha disponível na Universidade: "Marketing para Carnaval 2026". Aproveitem as estratégias sazonais! Unidades que completarem ganham +200 pontos.',
        likes: 89,
        comments: 23,
        time: '6h atrás',
        type: 'announcement' as const,
    },
    {
        id: '3',
        author: 'Unidade Vila Mariana',
        avatar: '💡',
        level: 'Prata',
        content: 'Dica: Começamos a usar bandejas organizadoras para os toppings e nosso tempo de montagem caiu de 5min para 3min30s. Vale testar! 🍇',
        likes: 34,
        comments: 8,
        time: '1d atrás',
        type: 'tip' as const,
    },
    {
        id: '4',
        author: 'Unidade Moema',
        avatar: '🎉',
        level: 'Ouro',
        content: 'Primeiro mês com CMV abaixo de 30%! 🎊 A dica é: ficha técnica atualizada + controle de porções com utensílios padronizados.',
        likes: 62,
        comments: 15,
        time: '2d atrás',
        type: 'case' as const,
    },
];

// Top ranking
const topRanking = [
    { pos: 1, name: 'Alphaville', points: 9800, level: 'Ouro' },
    { pos: 2, name: 'Vila Mariana', points: 9200, level: 'Ouro' },
    { pos: 3, name: 'Sua Unidade', points: 8750, level: 'Prata', isYou: true },
    { pos: 4, name: 'Moema', points: 8400, level: 'Ouro' },
    { pos: 5, name: 'Pinheiros', points: 8100, level: 'Prata' },
];

export default function ComunidadePage() {
    const [activeTab, setActiveTab] = useState<'feed' | 'desafios' | 'ranking'>('feed');

    const userPoints = 2350;
    const currentLevel = levels.find(l => userPoints >= l.min && userPoints <= l.max) || levels[0];
    const nextLevel = levels[levels.indexOf(currentLevel) + 1];
    const progressToNext = nextLevel ? ((userPoints - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100 : 100;

    return (
        <GrauOSLayout>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Level Card */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pink-600/20 to-rose-500/10 border border-pink-500/10 p-6 mb-8">
                    <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-pink-500/10 blur-2xl" />
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${currentLevel.color} shadow-lg`}>
                                <Medal className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-white/40 mb-0.5">Seu nível</p>
                                <h3 className={`text-2xl font-bold ${currentLevel.textColor}`}>{currentLevel.name}</h3>
                                <p className="text-sm text-white/50">{userPoints.toLocaleString()} pontos</p>
                            </div>
                        </div>

                        {nextLevel && (
                            <div className="flex-1 w-full md:w-auto">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-white/40">Próximo nível: <span className="text-white/60 font-semibold">{nextLevel.name}</span></span>
                                    <span className="text-xs text-white/40">{nextLevel.min.toLocaleString()} pts</span>
                                </div>
                                <Progress value={progressToNext} className="h-2 bg-white/5" />
                                <p className="text-[10px] text-white/30 mt-1">Faltam {(nextLevel.min - userPoints).toLocaleString()} pontos</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-8 w-fit">
                    {[
                        { key: 'feed' as const, label: 'Feed', icon: MessageCircle },
                        { key: 'desafios' as const, label: 'Desafios', icon: Target },
                        { key: 'ranking' as const, label: 'Ranking', icon: Trophy },
                    ].map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                        ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                                        : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                {activeTab === 'feed' && (
                    <div className="space-y-4">
                        {feedPosts.map(post => (
                            <div key={post.id} className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all">
                                {/* Post header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">
                                        {post.avatar}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-semibold text-white">{post.author}</span>
                                            <Badge className="bg-white/5 text-white/50 text-[10px] border-0">{post.level}</Badge>
                                            {post.type === 'announcement' && (
                                                <Badge className="bg-blue-500/20 text-blue-300 text-[10px] border-0">📢 Anúncio</Badge>
                                            )}
                                            {post.type === 'case' && (
                                                <Badge className="bg-green-500/20 text-green-300 text-[10px] border-0">📊 Case</Badge>
                                            )}
                                            {post.type === 'tip' && (
                                                <Badge className="bg-yellow-500/20 text-yellow-300 text-[10px] border-0">💡 Dica</Badge>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-white/30">{post.time}</p>
                                    </div>
                                </div>

                                {/* Post content */}
                                <p className="text-sm text-white/70 leading-relaxed mb-4">{post.content}</p>

                                {/* Post actions */}
                                <div className="flex items-center gap-4">
                                    <button className="flex items-center gap-1.5 text-xs text-white/40 hover:text-pink-400 transition-colors">
                                        <Heart className="h-4 w-4" /> {post.likes}
                                    </button>
                                    <button className="flex items-center gap-1.5 text-xs text-white/40 hover:text-blue-400 transition-colors">
                                        <MessageCircle className="h-4 w-4" /> {post.comments}
                                    </button>
                                    <button className="flex items-center gap-1.5 text-xs text-white/40 hover:text-green-400 transition-colors">
                                        <Share2 className="h-4 w-4" /> Compartilhar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'desafios' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {challenges.map(ch => (
                            <div key={ch.id} className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all">
                                <div className="flex items-start gap-3 mb-3">
                                    <span className="text-2xl">{ch.icon}</span>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-bold text-white mb-0.5">{ch.title}</h4>
                                        <p className="text-xs text-white/40 leading-relaxed">{ch.description}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs text-white/40 mb-2">
                                    <div className="flex items-center gap-1">
                                        <Gift className="h-3 w-3 text-yellow-400" />
                                        <span className="text-yellow-400 font-medium">+{ch.reward} pts</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{ch.daysLeft} dias restantes</span>
                                    </div>
                                </div>

                                <Progress value={ch.progress} className="h-1.5 bg-white/5" />
                                <p className="text-[10px] text-white/30 mt-1">{ch.progress}% concluído</p>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'ranking' && (
                    <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-6">
                            <Trophy className="h-4 w-4 text-yellow-400" />
                            Ranking Geral — Fevereiro 2026
                        </h3>

                        <div className="space-y-2">
                            {topRanking.map(r => (
                                <div
                                    key={r.pos}
                                    className={`flex items-center justify-between p-4 rounded-xl transition-all ${r.isYou
                                            ? 'bg-pink-500/10 border border-pink-500/20'
                                            : 'bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.03]'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${r.pos === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                                                r.pos === 2 ? 'bg-gray-400/20 text-gray-300' :
                                                    r.pos === 3 ? 'bg-amber-600/20 text-amber-500' :
                                                        'bg-white/5 text-white/40'
                                            }`}>
                                            {r.pos <= 3 ? ['🥇', '🥈', '🥉'][r.pos - 1] : r.pos}
                                        </div>
                                        <div>
                                            <span className={`text-sm font-medium ${r.isYou ? 'text-pink-300' : 'text-white/80'}`}>
                                                {r.name} {r.isYou && '(Você ⭐)'}
                                            </span>
                                            <p className="text-[11px] text-white/30">{r.points.toLocaleString()} pts • {r.level}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </GrauOSLayout>
    );
}
