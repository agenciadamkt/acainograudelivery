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
    Zap,
    Trash2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ManageCommunityDialog } from '@/components/admin/comunidade/ManageCommunityDialog';
import { toast } from 'sonner';

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

interface Post {
    id: string;
    content: string;
    type: 'case' | 'announcement' | 'tip';
    created_at: string;
    likes_count: number;
    comments_count: number;
    user_id: string;
    // Relations to be fetched or mocked for now
    user?: {
        email: string;
    }
}

interface Challenge {
    id: string;
    title: string;
    description: string;
    reward_points: number;
    icon: string;
    end_date: string;
    active: boolean;
}

// Level system
const levels = [
    { name: 'Bronze', min: 0, max: 999, color: 'from-amber-700 to-amber-500', textColor: 'text-amber-500', icon: Shield },
    { name: 'Prata', min: 1000, max: 4999, color: 'from-gray-400 to-gray-300', textColor: 'text-gray-400', icon: Star },
    { name: 'Ouro', min: 5000, max: 9999, color: 'from-yellow-500 to-yellow-300', textColor: 'text-yellow-500', icon: Crown },
    { name: 'Elite', min: 10000, max: Infinity, color: 'from-purple-600 to-indigo-400', textColor: 'text-purple-400', icon: Zap },
];

// Mock data removed. Interfaces defined above.

// Top ranking (mock removed, fetched via RPC)

export default function ComunidadePage() {
    const [activeTab, setActiveTab] = useState<'feed' | 'desafios' | 'ranking'>('feed');

    const { data: rankingData, isLoading: loadingRanking } = useQuery({
        queryKey: ['network-ranking'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_network_ranking' as any);
            if (error) throw error;
            return data as unknown as RankingItem[];
        }
    });

    const { data: posts, isLoading: loadingPosts } = useQuery({
        queryKey: ['community_posts'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('community_posts' as any)
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as unknown as Post[];
        }
    });

    const { data: challenges, isLoading: loadingChallenges } = useQuery({
        queryKey: ['gamification_challenges'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('gamification_challenges' as any)
                .select('*')
                .order('end_date', { ascending: true });
            if (error) throw error;
            return data as unknown as Challenge[];
        }
    });

    // Fetch Post Types
    const { data: postTypes } = useQuery({
        queryKey: ['community_post_types'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('community_post_types' as any)
                .select('*');
            if (error) throw error;
            return data as any[];
        }
    });

    const queryClient = useQueryClient();

    // Delete Post Mutation
    const deletePost = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('community_posts' as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Post excluído!');
            queryClient.invalidateQueries({ queryKey: ['community_posts'] });
        },
        onError: (error) => toast.error('Erro ao excluir post: ' + error.message)
    });

    // Calculate real user points from ranking
    const currentUserRanking = rankingData?.find(r => r.is_current_user);
    const userPoints = currentUserRanking ? Math.round(currentUserRanking.score) : 0;

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
                {/* Tabs & Management */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06] w-fit">
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
                    {/* Management Button */}
                    <ManageCommunityDialog />
                </div>

                {/* Tab Content */}
                {activeTab === 'feed' && (
                    <div className="space-y-4">
                        {loadingPosts ? (
                            <div className="text-center py-8 text-white/40">Carregando feed...</div>
                        ) : posts?.length === 0 ? (
                            <div className="text-center py-8 text-white/40">Nenhum post ainda. Seja o primeiro!</div>
                        ) : posts?.map(post => {
                            const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR });
                            return (
                                <div key={post.id} className="p-5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all">
                                    {/* Post header */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">
                                            👤
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-white">Usuário</span>
                                                {/* <Badge className="bg-white/5 text-white/50 text-[10px] border-0">{post.level}</Badge> */}
                                                {(() => {
                                                    const typeData = postTypes?.find((t: any) => t.value === post.type);
                                                    if (typeData) {
                                                        const colorMap: Record<string, string> = {
                                                            blue: 'bg-blue-500/20 text-blue-300',
                                                            green: 'bg-green-500/20 text-green-300',
                                                            yellow: 'bg-yellow-500/20 text-yellow-300',
                                                            red: 'bg-red-500/20 text-red-300',
                                                            purple: 'bg-purple-500/20 text-purple-300',
                                                        };
                                                        const colorClass = colorMap[typeData.color] || 'bg-gray-500/20 text-gray-300';

                                                        return (
                                                            <Badge className={`${colorClass} text-[10px] border-0`}>
                                                                {typeData.icon} {typeData.label}
                                                            </Badge>
                                                        );
                                                    }
                                                    // Fallback for old posts or missing types
                                                    return <Badge className="bg-gray-500/20 text-gray-300 text-[10px] border-0">{post.type}</Badge>;
                                                })()}
                                            </div>
                                            <p className="text-[11px] text-white/30">{timeAgo}</p>
                                        </div>

                                        {/* Delete Button (Admin) */}
                                        <button
                                            onClick={() => deletePost.mutate(post.id)}
                                            className="text-white/20 hover:text-red-400 p-1 transition-colors"
                                            title="Excluir post"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Post content */}
                                    <p className="text-sm text-white/70 leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

                                    {/* Post actions */}
                                    <div className="flex items-center gap-4">
                                        <button className="flex items-center gap-1.5 text-xs text-white/40 hover:text-pink-400 transition-colors">
                                            <Heart className="h-4 w-4" /> {post.likes_count || 0}
                                        </button>
                                        <button className="flex items-center gap-1.5 text-xs text-white/40 hover:text-blue-400 transition-colors">
                                            <MessageCircle className="h-4 w-4" /> {post.comments_count || 0}
                                        </button>
                                        <button className="flex items-center gap-1.5 text-xs text-white/40 hover:text-green-400 transition-colors">
                                            <Share2 className="h-4 w-4" /> Compartilhar
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {activeTab === 'desafios' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loadingChallenges ? (
                            <div className="text-center py-8 text-white/40 col-span-2">Carregando desafios...</div>
                        ) : challenges?.length === 0 ? (
                            <div className="text-center py-8 text-white/40 col-span-2">Nenhum desafio ativo.</div>
                        ) : challenges?.map(ch => {
                            const daysLeft = Math.ceil((new Date(ch.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            const mockProgress = 0; // TODO: Implement challenge progress tracking

                            return (
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
                                            <span className="text-yellow-400 font-medium">+{ch.reward_points} pts</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{daysLeft > 0 ? `${daysLeft} dias restantes` : 'Encerrado'}</span>
                                        </div>
                                    </div>

                                    <Progress value={mockProgress} className="h-1.5 bg-white/5" />
                                    <p className="text-[10px] text-white/30 mt-1">{mockProgress}% concluído</p>
                                </div>
                            )
                        })}
                    </div>
                )}

                {activeTab === 'ranking' && (
                    <div className="p-6 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                        <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-6">
                            <Trophy className="h-4 w-4 text-yellow-400" />
                            Ranking Geral — Fevereiro 2026
                        </h3>

                        <div className="space-y-2">
                            {loadingRanking ? (
                                <div className="text-center py-8 text-white/40">Carregando ranking...</div>
                            ) : rankingData?.map(r => (
                                <div
                                    key={r.store_id}
                                    className={`flex items-center justify-between p-4 rounded-xl transition-all ${r.is_current_user
                                        ? 'bg-pink-500/10 border border-pink-500/20'
                                        : 'bg-white/[0.01] border border-white/[0.04] hover:bg-white/[0.03]'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${r.rank_pos === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                                            r.rank_pos === 2 ? 'bg-gray-400/20 text-gray-300' :
                                                r.rank_pos === 3 ? 'bg-amber-600/20 text-amber-500' :
                                                    'bg-white/5 text-white/40'
                                            }`}>
                                            {r.rank_pos <= 3 ? ['🥇', '🥈', '🥉'][r.rank_pos - 1] : r.rank_pos}
                                        </div>
                                        <div>
                                            <span className={`text-sm font-medium ${r.is_current_user ? 'text-pink-300' : 'text-white/80'}`}>
                                                {r.store_name} {r.is_current_user && '(Você ⭐)'}
                                            </span>
                                            {/* Logic to determine Level based on Score could be added here, using mock level for now or deriving it */}
                                            <p className="text-[11px] text-white/30">{Number(r.score).toLocaleString()} pts</p>
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
