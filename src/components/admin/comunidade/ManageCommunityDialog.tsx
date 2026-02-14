import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';

import { Trash2, Pencil, Check, X, MessageSquare, AlertCircle } from 'lucide-react';

export function ManageCommunityDialog({
    postToEdit,
    open: controlledOpen,
    onOpenChange
}: {
    postToEdit?: any,
    open?: boolean,
    onOpenChange?: (open: boolean) => void
}) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? onOpenChange : setInternalOpen;

    const queryClient = useQueryClient();

    // Initialize state from postToEdit if available
    const [postContent, setPostContent] = useState('');
    const [postType, setPostType] = useState('');

    // Sync state when postToEdit changes or dialog opens
    useEffect(() => {
        if (postToEdit) {
            setPostContent(postToEdit.content || '');
            setPostType(postToEdit.type || '');
        } else {
            setPostContent('');
            setPostType('');
        }
    }, [postToEdit, open]);

    const isEditing = !!postToEdit;

    // Challenge state
    const [challengeTitle, setChallengeTitle] = useState('');
    const [challengeDesc, setChallengeDesc] = useState('');
    const [challengeReward, setChallengeReward] = useState('100');
    const [challengeEndDate, setChallengeEndDate] = useState('');

    // Post Type state
    const [newTypeLabel, setNewTypeLabel] = useState('');
    const [newTypeValue, setNewTypeValue] = useState('');
    const [newTypeColor, setNewTypeColor] = useState('blue');
    const [newTypeIcon, setNewTypeIcon] = useState('📢');

    // Fetch Post Types
    const { data: postTypes } = useQuery({
        queryKey: ['community_post_types'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('community_post_types' as any)
                .select('*')
                .order('label');
            if (error) throw error;
            return data as any[];
        }
    });

    // Fetch Pending Comments
    const { data: pendingComments } = useQuery({
        queryKey: ['pending_comments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('community_comments' as any)
                .select('*, user:user_id(email)')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as any[];
        }
    });

    // Moderate Comment Mutation
    const moderateComment = useMutation({
        mutationFn: async ({ id, status }: { id: string, status: 'approved' | 'rejected' }) => {
            const { error } = await supabase
                .from('community_comments' as any)
                .update({ status })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            toast.success(variables.status === 'approved' ? 'Comentário aprovado!' : 'Comentário rejeitado!');
            queryClient.invalidateQueries({ queryKey: ['pending_comments'] });
            queryClient.invalidateQueries({ queryKey: ['community_posts'] }); // Update counts if needed
        },
        onError: () => toast.error('Erro ao moderar comentário')
    });

    // Create/Update Post Mutation
    const savePost = useMutation({
        mutationFn: async () => {
            const user = (await supabase.auth.getUser()).data.user;

            if (isEditing) {
                const { error } = await supabase
                    .from('community_posts' as any)
                    .update({
                        content: postContent,
                        type: postType
                    })
                    .eq('id', postToEdit.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('community_posts' as any)
                    .insert({
                        content: postContent,
                        type: postType,
                        user_id: user?.id
                    });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success(isEditing ? 'Post atualizado!' : 'Post criado com sucesso!');
            if (!isEditing) {
                setPostContent('');
                setPostType('');
            }
            if (setOpen) setOpen(false);
            queryClient.invalidateQueries({ queryKey: ['community_posts'] });
        },
        onError: (error) => toast.error('Erro ao salvar post: ' + error.message)
    });

    // Create Post Type Mutation
    const createType = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('community_post_types' as any)
                .insert({
                    label: newTypeLabel,
                    value: newTypeValue,
                    color: newTypeColor,
                    icon: newTypeIcon
                });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Tipo criado com sucesso!');
            setNewTypeLabel('');
            setNewTypeValue('');
            queryClient.invalidateQueries({ queryKey: ['community_post_types'] });
        },
        onError: (error) => toast.error('Erro ao criar tipo: ' + error.message)
    });

    // Delete Post Type Mutation
    const deleteType = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('community_post_types' as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Tipo excluído com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['community_post_types'] });
        },
        onError: (error) => toast.error('Erro ao excluir tipo: ' + error.message)
    });

    // Create Challenge Mutation
    const createChallenge = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('gamification_challenges' as any)
                .insert({
                    title: challengeTitle,
                    description: challengeDesc,
                    reward_points: parseInt(challengeReward),
                    end_date: new Date(challengeEndDate).toISOString(),
                });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Desafio criado com sucesso!');
            setChallengeTitle('');
            setChallengeDesc('');
            setChallengeReward('100');
            setChallengeEndDate('');
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: ['gamification_challenges'] });
        },
        onError: (error) => toast.error('Erro ao criar desafio: ' + error.message)
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    <Button variant="outline" className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10">
                        <Plus className="h-4 w-4 mr-2" />
                        Gerenciar
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Post' : 'Gerenciar Comunidade'}</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="post" className="w-full">
                    <TabsList className={`grid w-full ${isEditing ? 'grid-cols-1' : 'grid-cols-3'} bg-gray-100 dark:bg-white/5`}>
                        <TabsTrigger value="post">{isEditing ? 'Editar' : 'Novo Post'}</TabsTrigger>
                        {!isEditing && (
                            <>
                                <TabsTrigger value="challenge">Novo Desafio</TabsTrigger>
                                <TabsTrigger value="types">Tipos</TabsTrigger>
                                <TabsTrigger value="moderation" className="relative">
                                    Moderação
                                    {pendingComments && pendingComments.length > 0 && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                    )}
                                </TabsTrigger>
                            </>
                        )}
                    </TabsList>

                    {/* NEW POST TAB */}
                    <TabsContent value="post" className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tipo de Post</label>
                            <Select value={postType} onValueChange={setPostType}>
                                <SelectTrigger className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
                                    <SelectValue placeholder="Selecione um tipo" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
                                    {postTypes?.map((t: any) => (
                                        <SelectItem key={t.id} value={t.value}>
                                            {t.icon} {t.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Conteúdo</label>
                            <Textarea
                                placeholder="Escreva a mensagem..."
                                className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white min-h-[100px]"
                                value={postContent}
                                onChange={e => setPostContent(e.target.value)}
                            />
                        </div>

                        <Button
                            className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                            onClick={() => savePost.mutate()}
                            disabled={savePost.isPending || !postContent}
                        >
                            {savePost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? 'Salvar Alterações' : 'Publicar Post'}
                        </Button>
                    </TabsContent>

                    {/* NEW CHALLENGE TAB */}
                    <TabsContent value="challenge" className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Título do Desafio</label>
                            <Input
                                placeholder="Ex: Mestre do Delivery"
                                className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                                value={challengeTitle}
                                onChange={e => setChallengeTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Descrição / Regras</label>
                            <Textarea
                                placeholder="O que a unidade precisa fazer?"
                                className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                                value={challengeDesc}
                                onChange={e => setChallengeDesc(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Pontos (Recompensa)</label>
                                <Input
                                    type="number"
                                    className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                                    value={challengeReward}
                                    onChange={e => setChallengeReward(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Data de Término</label>
                                <Input
                                    type="date"
                                    className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                                    value={challengeEndDate}
                                    onChange={e => setChallengeEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button
                            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                            onClick={() => createChallenge.mutate()}
                            disabled={createChallenge.isPending || !challengeTitle || !challengeEndDate}
                        >
                            {createChallenge.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Criar Desafio
                        </Button>
                    </TabsContent>

                    {/* MODERATION TAB */}
                    <TabsContent value="moderation" className="space-y-4 pt-4">
                        <div className="space-y-4">
                            {pendingComments?.length === 0 ? (
                                <div className="text-center py-8 text-gray-400 dark:text-white/40">
                                    <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>Tudo limpo! Nenhum comentário pendente.</p>
                                </div>
                            ) : (
                                pendingComments?.map((comment: any) => (
                                    <div key={comment.id} className="p-4 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-white/40 mb-1">
                                                    {comment.user?.email || 'Usuário'} • {new Date(comment.created_at).toLocaleDateString()}
                                                </p>
                                                <p className="text-sm text-gray-900 dark:text-white">{comment.content}</p>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
                                                onClick={() => moderateComment.mutate({ id: comment.id, status: 'rejected' })}
                                                disabled={moderateComment.isPending}
                                            >
                                                <X className="h-4 w-4 mr-1" /> Rejeitar
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="h-8 bg-green-600 hover:bg-green-700 text-white"
                                                onClick={() => moderateComment.mutate({ id: comment.id, status: 'approved' })}
                                                disabled={moderateComment.isPending}
                                            >
                                                <Check className="h-4 w-4 mr-1" /> Aprovar
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="types" className="space-y-4 pt-4">
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 space-y-4">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Adicionar Novo Tipo</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Nome (Label)</label>
                                    <Input
                                        placeholder="Ex: Aviso Importante"
                                        className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white h-8 text-xs"
                                        value={newTypeLabel}
                                        onChange={e => setNewTypeLabel(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Valor (Slug)</label>
                                    <Input
                                        placeholder="Ex: aviso_importante"
                                        className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white h-8 text-xs"
                                        value={newTypeValue}
                                        onChange={e => setNewTypeValue(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Cor</label>
                                    <Select value={newTypeColor} onValueChange={setNewTypeColor}>
                                        <SelectTrigger className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white h-8 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white">
                                            <SelectItem value="blue">Azul</SelectItem>
                                            <SelectItem value="green">Verde</SelectItem>
                                            <SelectItem value="yellow">Amarelo</SelectItem>
                                            <SelectItem value="red">Vermelho</SelectItem>
                                            <SelectItem value="purple">Roxo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Ícone (Emoji)</label>
                                    <Input
                                        placeholder="Ex: ⚠️"
                                        className="bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white h-8 text-xs"
                                        value={newTypeIcon}
                                        onChange={e => setNewTypeIcon(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 h-8 text-xs text-white"
                                onClick={() => createType.mutate()}
                                disabled={createType.isPending || !newTypeLabel || !newTypeValue}
                            >
                                {createType.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                Adicionar Tipo
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Tipos Existentes</h4>
                            {postTypes?.map((t: any) => (
                                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{t.icon}</span>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{t.label}</p>
                                            <p className="text-xs text-gray-500 dark:text-white/40">{t.value}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 dark:text-white/40 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10"
                                        onClick={() => deleteType.mutate(t.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
