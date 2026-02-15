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
    Zap,
    Trash2,
    MessageCircle as MessageIcon,
    Send,
    Share2,
    TrendingUp,
    Shield,
    Pencil,
    CheckCircle2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ManageCommunityDialog } from '@/components/admin/comunidade/ManageCommunityDialog';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    type: 'sales' | 'orders' | 'lessons' | 'manual';
    target_value: number;
    metric_table?: string;
}

interface UserChallenge {
    id: string;
    challenge_id: string;
    status: 'active' | 'completed' | 'failed';
    progress: number;
}

// Level system
const levels = [
    { name: 'Bronze', min: 0, max: 999, color: 'from-amber-700 to-amber-500', textColor: 'text-amber-500', icon: Shield },
    { name: 'Prata', min: 1000, max: 4999, color: 'from-gray-400 to-gray-300', textColor: 'text-gray-400', icon: Star },
    { name: 'Ouro', min: 5000, max: 9999, color: 'from-yellow-500 to-yellow-300', textColor: 'text-yellow-500', icon: Crown },
    { name: 'Elite', min: 10000, max: Infinity, color: 'from-purple-600 to-indigo-400', textColor: 'text-purple-400', icon: Zap },
];

export default function ComunidadePage() {
    const [activeTab, setActiveTab] = useState<'feed' | 'desafios' | 'ranking'>('feed');
    const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [editingPost, setEditingPost] = useState<Post | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const queryClient = useQueryClient();

    // Check if user is admin
    const { data: user } = useQuery({
        queryKey: ['check-admin'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        }
    });

    const isAdmin = user?.email === 'agenciadamkt@gmail.com';
    const { data: rankingData, isLoading: loadingRanking } = useQuery({
        queryKey: ['network-ranking'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_network_ranking' as any);
            if (error) throw error;
            return data as unknown as RankingItem[];
        }
    });

    const { data: myLikes } = useQuery({
        queryKey: ['my_likes'],
        queryFn: async () => {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return [];
            const { data } = await supabase
                .from('community_likes' as any)
                .select('post_id')
                .eq('user_id', user.id);
            return data?.map((l: any) => l.post_id) || [];
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

    // Fetch User Challenges
    const { data: userChallenges, refetch: refetchUserChallenges } = useQuery({
        queryKey: ['user_challenges'],
        queryFn: async () => {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return [];
            const { data, error } = await supabase
                .from('user_challenges' as any)
                .select('*')
                .eq('user_id', user.id);
            if (error) throw error;
            return data as unknown as UserChallenge[];
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

    // Like Mutation
    const toggleLike = useMutation({
        mutationFn: async (postId: string) => {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('User not found');

            // Check if already liked
            const { data: existingLike } = await supabase
                .from('community_likes' as any)
                .select('*')
                .eq('user_id', user.id)
                .eq('post_id', postId)
                .single();

            if (existingLike) {
                await supabase
                    .from('community_likes' as any)
                    .delete()
                    .eq('user_id', user.id)
                    .eq('post_id', postId);
            } else {
                await supabase
                    .from('community_likes' as any)
                    .insert({ user_id: user.id, post_id: postId });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['community_posts'] });
            queryClient.invalidateQueries({ queryKey: ['community_likes'] });
            queryClient.invalidateQueries({ queryKey: ['my_likes'] });
        },
        onError: () => toast.error('Erro ao curtir post')
    });

    // Add Comment Mutation
    const addComment = useMutation({
        mutationFn: async () => {
            if (!selectedPostId || !commentText.trim()) return;
            const user = (await supabase.auth.getUser()).data.user;

            const { error } = await supabase
                .from('community_comments' as any)
                .insert({
                    post_id: selectedPostId,
                    user_id: user?.id,
                    content: commentText,
                    status: 'pending' // Moderation
                });

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Comentário enviado para aprovação!');
            setCommentText('');
            setSelectedPostId(null);
        },
        onError: () => toast.error('Erro ao enviar comentário')
    });

    // Fetch Comments for selected post
    const { data: comments } = useQuery({
        queryKey: ['community_comments', selectedPostId],
        enabled: !!selectedPostId,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('community_comments' as any)
                .select('*, user_id') // Join with user_id to maybe fetch name/avatar later if needed
                .eq('post_id', selectedPostId)
                .eq('status', 'approved') // Only show approved
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as any[];
        }
    });

    // Join Challenge
    const joinChallenge = useMutation({
        mutationFn: async (challengeId: string) => {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('User not found');
            const { error } = await supabase
                .from('user_challenges' as any)
                .insert({
                    user_id: user.id,
                    challenge_id: challengeId,
                    status: 'active',
                    progress: 0
                });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Desafio aceito! Boa sorte 🚀');
            refetchUserChallenges();
        },
        onError: () => toast.error('Erro ao aceitar desafio')
    });

    // Update Progress (Call RPC)
    const updateProgress = useMutation({
        mutationFn: async (challengeId: string) => {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('User not found');

            const { data, error } = await supabase.rpc('verify_challenge_progress', {
                p_user_id: user.id,
                p_challenge_id: challengeId
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (data: any) => {
            if (data.new_status === 'completed') {
                toast.success('Parabéns! Desafio concluído! 🏆');
            } else {
                toast.info(`Progresso atualizado: ${data.new_progress}%`);
            }
            refetchUserChallenges();
        },
        onError: (error) => toast.error('Erro ao atualizar progresso: ' + error.message)
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
                <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/[0.05] p-6 mb-8 shadow-sm dark:shadow-none">
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${currentLevel.color} shadow-lg`}>
                                <Medal className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-white/40 mb-0.5">Seu nível</p>
                                <h3 className={`text-2xl font-bold ${currentLevel.textColor} drop-shadow-sm`}>{currentLevel.name}</h3>
                                <p className="text-sm text-gray-600 dark:text-white/50">{userPoints.toLocaleString()} pontos</p>
                            </div>
                        </div>

                        {nextLevel && (
                            <div className="flex-1 w-full md:w-auto">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs text-gray-500 dark:text-white/40">Próximo nível: <span className="text-gray-900 dark:text-white/60 font-semibold">{nextLevel.name}</span></span>
                                    <span className="text-xs text-gray-500 dark:text-white/40">{nextLevel.min.toLocaleString()} pts</span>
                                </div>
                                <Progress value={progressToNext} className="h-2 bg-gray-100 dark:bg-white/5" />
                                <p className="text-[10px] text-gray-400 dark:text-white/30 mt-1">Faltam {(nextLevel.min - userPoints).toLocaleString()} pontos</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs, Management */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] w-fit shadow-sm dark:shadow-none">
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
                                        ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-md shadow-pink-500/20'
                                        : 'text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white/70 hover:bg-gray-50 dark:hover:bg-white/5'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                    {/* Management Button (Admin Only) */}
                    {isAdmin && (
                        <>
                            <Button
                                onClick={() => {
                                    setEditingPost(null);
                                    setIsEditOpen(true);
                                }}
                                className="bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-600/20"
                            >
                                <Pencil className="h-4 w-4 mr-2" />
                                Gerenciar
                            </Button>

                            <ManageCommunityDialog
                                open={isEditOpen}
                                onOpenChange={(open) => {
                                    setIsEditOpen(open);
                                    if (!open) setEditingPost(null);
                                }}
                                postToEdit={editingPost}
                            />
                        </>
                    )}
                </div>

                {/* Tab Content */}
                {activeTab === 'feed' && (
                    <div className="space-y-4">
                        {loadingPosts ? (
                            <div className="text-center py-8 text-gray-500 dark:text-white/40">Carregando feed...</div>
                        ) : posts?.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-white/40">Nenhum post ainda. Seja o primeiro!</div>
                        ) : posts?.map(post => {
                            const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR });
                            return (
                                <div key={post.id} className="p-5 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.1] transition-all shadow-sm dark:shadow-none">
                                    {/* Post header */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-lg">
                                            {!post.user || post.user.email === 'agenciadamkt@gmail.com' ? '🍇' : '👤'}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                                    {!post.user || post.user.email === 'agenciadamkt@gmail.com' ? 'Açaí no Grau' : 'Franqueado'}
                                                </h4>
                                                {(!post.user || post.user.email === 'agenciadamkt@gmail.com') && (
                                                    <Badge className="bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-300 border-0 h-5 px-1.5 text-[10px]">
                                                        Admin
                                                    </Badge>
                                                )}
                                                {(() => {
                                                    const typeData = postTypes?.find((t: any) => t.value === post.type);
                                                    if (typeData) {
                                                        const colorMap: Record<string, string> = {
                                                            blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
                                                            green: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
                                                            yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300',
                                                            red: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
                                                            purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
                                                        };
                                                        const colorClass = colorMap[typeData.color] || 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300';

                                                        return (
                                                            <Badge className={`${colorClass} text-[10px] border-0`}>
                                                                {typeData.icon} {typeData.label}
                                                            </Badge>
                                                        );
                                                    }
                                                    // Fallback for old posts or missing types
                                                    if (post.type) {
                                                        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300 text-[10px] border-0">{post.type}</Badge>;
                                                    }
                                                    return null;
                                                })()}
                                            </div>
                                            <p className="text-[11px] text-gray-400 dark:text-white/30">{timeAgo}</p>
                                        </div>

                                        {/* Actions (Admin Only) */}
                                        {isAdmin && (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => {
                                                        setEditingPost(post);
                                                        setIsEditOpen(true);
                                                    }}
                                                    className="text-gray-400 dark:text-white/20 hover:text-blue-600 dark:hover:text-blue-400 p-1 transition-colors"
                                                    title="Editar post"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => deletePost.mutate(post.id)}
                                                    className="text-gray-400 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 p-1 transition-colors"
                                                    title="Excluir post"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Post content */}
                                    <p className="text-sm text-gray-700 dark:text-white/70 leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>

                                    {/* Post actions */}
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => toggleLike.mutate(post.id)}
                                            className={`flex items-center gap-1.5 text-xs transition-colors ${myLikes?.includes(post.id)
                                                ? 'text-pink-500'
                                                : 'text-gray-500 dark:text-white/40 hover:text-pink-500 dark:hover:text-pink-400'
                                                }`}
                                        >
                                            <Heart className={`h-4 w-4 ${myLikes?.includes(post.id) ? 'fill-current' : ''}`} />
                                            {post.likes_count || 0}
                                        </button>

                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <button
                                                    className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                                    onClick={() => setSelectedPostId(post.id)}
                                                >
                                                    <MessageIcon className="h-4 w-4" /> {post.comments_count || 0}
                                                </button>
                                            </DialogTrigger>
                                            <DialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white sm:max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>Comentários</DialogTitle>
                                                </DialogHeader>

                                                <ScrollArea className="h-[300px] w-full rounded-md border border-gray-100 dark:border-white/5 p-4">
                                                    {comments?.length === 0 ? (
                                                        <p className="text-sm text-gray-500 dark:text-white/40 text-center py-8">Nenhum comentário aprovado ainda.</p>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {comments?.map((comment: any) => (
                                                                <div key={comment.id} className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <p className="text-xs font-bold text-gray-600 dark:text-white/50">
                                                                            {!comment.user || comment.user.email === 'agenciadamkt@gmail.com' ? 'Açaí no Grau' : 'Franqueado'}
                                                                        </p>
                                                                        {(!comment.user || comment.user.email === 'agenciadamkt@gmail.com') && (
                                                                            <Badge className="bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-300 border-0 h-4 px-1 text-[8px]">
                                                                                Admin
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-gray-800 dark:text-white">{comment.content}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </ScrollArea>

                                                <div className="flex items-center gap-2 mt-2">
                                                    <Textarea
                                                        placeholder="Escreva um comentário (sujeito a moderação)..."
                                                        className="bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white min-h-[40px] resize-none"
                                                        value={commentText}
                                                        onChange={e => setCommentText(e.target.value)}
                                                    />
                                                    <Button
                                                        size="icon"
                                                        className="bg-pink-600 hover:bg-pink-700 text-white"
                                                        onClick={() => addComment.mutate()}
                                                        disabled={addComment.isPending || !commentText.trim()}
                                                    >
                                                        <Send className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>

                                        <button className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-white/40 hover:text-green-600 dark:hover:text-green-400 transition-colors">
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
                            <div className="text-center py-8 text-gray-500 dark:text-white/40 col-span-2">Carregando desafios...</div>
                        ) : challenges?.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-white/40 col-span-2">Nenhum desafio ativo.</div>
                        ) : challenges?.map(ch => {
                            const daysLeft = Math.ceil((new Date(ch.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                            const userChallenge = userChallenges?.find((uc: any) => uc.challenge_id === ch.id);
                            const isParticipating = !!userChallenge;
                            const isCompleted = userChallenge?.status === 'completed';
                            const progress = userChallenge?.progress || 0;

                            return (
                                <div key={ch.id} className="flex flex-col p-5 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.1] transition-all shadow-sm dark:shadow-none h-full">
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="text-2xl">{ch.icon}</span>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">{ch.title}</h4>
                                            <p className="text-xs text-gray-600 dark:text-white/40 leading-relaxed">{ch.description}</p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] h-5 border-gray-200 dark:border-white/10 text-gray-500">
                                                    Meta: {ch.type === 'sales' ? `R$ ${ch.target_value}` :
                                                        ch.type === 'orders' ? `${ch.target_value} pedidos` :
                                                            ch.type === 'lessons' ? `${ch.target_value} aulas` : 'Manual'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-white/40 mb-4 mt-auto pt-2">
                                        <div className="flex items-center gap-1">
                                            <Gift className="h-3 w-3 text-yellow-500 dark:text-yellow-400" />
                                            <span className="text-yellow-600 dark:text-yellow-400 font-medium">+{ch.reward_points} pts</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            <span>{daysLeft > 0 ? `${daysLeft} dias restantes` : 'Encerrado'}</span>
                                        </div>
                                    </div>

                                    {/* Action Area */}
                                    {isCompleted ? (
                                        <div className="mt-2 w-full p-2 bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-300 rounded-lg text-center text-xs font-bold flex items-center justify-center gap-2">
                                            <CheckCircle2 className="h-4 w-4" /> Desafio Concluído!
                                        </div>
                                    ) : isParticipating ? (
                                        <div className="mt-2 space-y-3">
                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-[10px] text-gray-500 dark:text-white/40">
                                                    <span>Progresso atual</span>
                                                    <span className="font-bold text-gray-900 dark:text-white">{progress}%</span>
                                                </div>
                                                <Progress value={progress} className="h-1.5 bg-gray-100 dark:bg-white/5" />
                                            </div>
                                            <Button
                                                onClick={() => updateProgress.mutate(ch.id)}
                                                disabled={updateProgress.isPending}
                                                className="w-full bg-white dark:bg-white/10 hover:bg-gray-50 dark:hover:bg-white/20 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 h-8 text-xs gap-2"
                                                variant="outline"
                                            >
                                                <TrendingUp className="h-3 w-3" />
                                                {updateProgress.isPending ? 'Verificando...' : 'Atualizar Progresso'}
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={() => joinChallenge.mutate(ch.id)}
                                            disabled={joinChallenge.isPending}
                                            className="w-full bg-pink-600 hover:bg-pink-700 text-white h-8 text-xs mt-2"
                                        >
                                            {joinChallenge.isPending ? 'Entrando...' : 'Aceitar Desafio'}
                                        </Button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {activeTab === 'ranking' && (
                    <div className="p-6 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] shadow-sm dark:shadow-none">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-6">
                            <Trophy className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
                            Ranking Geral — Fevereiro 2026
                        </h3>

                        <div className="space-y-2">
                            {loadingRanking ? (
                                <div className="text-center py-8 text-gray-500 dark:text-white/40">Carregando ranking...</div>
                            ) : rankingData?.map(r => (
                                <div
                                    key={r.store_id}
                                    className={`flex items-center justify-between p-4 rounded-xl transition-all border ${r.is_current_user
                                        ? 'bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/20'
                                        : 'bg-white dark:bg-white/[0.01] border-gray-100 dark:border-white/[0.04] hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${r.rank_pos === 1 ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400' :
                                            r.rank_pos === 2 ? 'bg-gray-200 text-gray-600 dark:bg-gray-400/20 dark:text-gray-300' :
                                                r.rank_pos === 3 ? 'bg-amber-100 text-amber-600 dark:bg-amber-600/20 dark:text-amber-500' :
                                                    'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-white/40'
                                            }`}>
                                            {r.rank_pos <= 3 ? ['🥇', '🥈', '🥉'][r.rank_pos - 1] : r.rank_pos}
                                        </div>
                                        <div>
                                            <span className={`text-sm font-medium ${r.is_current_user ? 'text-pink-600 dark:text-pink-300' : 'text-gray-900 dark:text-white/80'}`}>
                                                {r.store_name} {r.is_current_user && '(Você ⭐)'}
                                            </span>
                                            {/* Logic to determine Level based on Score could be added here, using mock level for now or deriving it */}
                                            <p className="text-[11px] text-gray-500 dark:text-white/30">{Number(r.score).toLocaleString()} pts</p>
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
