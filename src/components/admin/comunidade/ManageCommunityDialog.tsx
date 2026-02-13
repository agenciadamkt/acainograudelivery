import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';

export function ManageCommunityDialog() {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    // Post state
    const [postContent, setPostContent] = useState('');
    const [postType, setPostType] = useState('announcement');

    // Challenge state
    const [challengeTitle, setChallengeTitle] = useState('');
    const [challengeDesc, setChallengeDesc] = useState('');
    const [challengeReward, setChallengeReward] = useState('100');
    const [challengeEndDate, setChallengeEndDate] = useState('');

    // Create Post Mutation
    const createPost = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('community_posts' as any)
                .insert({
                    content: postContent,
                    type: postType,
                    user_id: (await supabase.auth.getUser()).data.user?.id
                });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Post criado com sucesso!');
            setPostContent('');
            setOpen(false);
            queryClient.invalidateQueries({ queryKey: ['community_posts'] });
        },
        onError: (error) => toast.error('Erro ao criar post: ' + error.message)
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
            <DialogTrigger asChild>
                <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
                    <Plus className="h-4 w-4 mr-2" />
                    Gerenciar
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Gerenciar Comunidade</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="post" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-white/5">
                        <TabsTrigger value="post">Novo Post</TabsTrigger>
                        <TabsTrigger value="challenge">Novo Desafio</TabsTrigger>
                    </TabsList>

                    {/* NEW POST TAB */}
                    <TabsContent value="post" className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Tipo de Post</label>
                            <Select value={postType} onValueChange={setPostType}>
                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-800 border-white/10 text-white">
                                    <SelectItem value="announcement">📢 Anúncio Oficial</SelectItem>
                                    <SelectItem value="case">📊 Case de Sucesso</SelectItem>
                                    <SelectItem value="tip">💡 Dica Operacional</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Conteúdo</label>
                            <Textarea
                                placeholder="Escreva a mensagem..."
                                className="bg-white/5 border-white/10 text-white min-h-[100px]"
                                value={postContent}
                                onChange={e => setPostContent(e.target.value)}
                            />
                        </div>

                        <Button
                            className="w-full bg-pink-600 hover:bg-pink-700"
                            onClick={() => createPost.mutate()}
                            disabled={createPost.isPending || !postContent}
                        >
                            {createPost.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Publicar Post
                        </Button>
                    </TabsContent>

                    {/* NEW CHALLENGE TAB */}
                    <TabsContent value="challenge" className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Título do Desafio</label>
                            <Input
                                placeholder="Ex: Mestre do Delivery"
                                className="bg-white/5 border-white/10 text-white"
                                value={challengeTitle}
                                onChange={e => setChallengeTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Descrição / Regras</label>
                            <Textarea
                                placeholder="O que a unidade precisa fazer?"
                                className="bg-white/5 border-white/10 text-white"
                                value={challengeDesc}
                                onChange={e => setChallengeDesc(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Pontos (Recompensa)</label>
                                <Input
                                    type="number"
                                    className="bg-white/5 border-white/10 text-white"
                                    value={challengeReward}
                                    onChange={e => setChallengeReward(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Data de Término</label>
                                <Input
                                    type="date"
                                    className="bg-white/5 border-white/10 text-white"
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
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
