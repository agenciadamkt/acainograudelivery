'use client';

import { useState } from 'react';
import {
    Plus, Pencil, Trash2, GripVertical, Play, Eye, BookOpen, Clock, CheckCircle2,
    FileText, ExternalLink, MessageCircle, ChevronLeft, Upload, X, Search, Loader2,
    AlertCircle, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/admin/DataTable';
import { supabase } from '@/integrations/supabase/client';
import {
    useTrails, useTrail, useCreateTrail, useUpdateTrail, useDeleteTrail,
    useCreateLesson, useUpdateLesson, useDeleteLesson,
    useCreateMaterial, useDeleteMaterial,
    useCreateLink, useDeleteLink,
    useAnswerQuestion
} from '@/hooks/useUniversity';
import { Trail, Lesson, Material, LinkItem, Question } from '@/hooks/useUniversity';

/* ══════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════ */
const categories = [
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'operacao', label: 'Operação' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'gestao', label: 'Gestão' },
    { value: 'vendas', label: 'Vendas' },
    { value: 'geral', label: 'Geral' },
];

const levels = ['Básico', 'Intermediário', 'Avançado'];

/* ══════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════ */
export default function UniversidadeAdminPage() {
    const { data: trails, isLoading: isLoadingTrails } = useTrails();
    const createTrail = useCreateTrail();
    const updateTrail = useUpdateTrail();
    const deleteTrail = useDeleteTrail();
    const createLesson = useCreateLesson();
    const updateLesson = useUpdateLesson();
    const deleteLesson = useDeleteLesson();
    const createMaterial = useCreateMaterial();
    const deleteMaterial = useDeleteMaterial();
    const createLink = useCreateLink();
    const deleteLink = useDeleteLink();
    const answerQuestion = useAnswerQuestion();
    const queryClient = useQueryClient();

    const [view, setView] = useState<'list' | 'trail' | 'lesson'>('list');
    const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null); // For editing lesson FORM

    // Fetch full trail details when in 'trail' or 'lesson' view
    const { data: currentTrail, isLoading: isLoadingTrail } = useTrail(selectedTrailId || '');

    const [trailDialogOpen, setTrailDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'trail' | 'lesson'; id: string } | null>(null);
    const [filterCategory, setFilterCategory] = useState('all');

    // ─── Trail form state ───
    const [trailForm, setTrailForm] = useState({ title: '', description: '', category: 'onboarding', level: 'Básico', color: '#e50914', required: false, thumbnail: '' });
    const [editingTrailId, setEditingTrailId] = useState<string | null>(null);

    // ─── Lesson form state ───
    // Note: 'order' will be auto-assigned on create
    const [lessonForm, setLessonForm] = useState({ title: '', subtitle: '', duration: '', video_url: '', description: '' });
    const [lessonTab, setLessonTab] = useState('descricao');

    // ─── Material / Link add state ───
    const [newMaterial, setNewMaterial] = useState({ name: '', url: '', type: 'pdf', size: '' });
    const [newLink, setNewLink] = useState({ title: '', url: '', description: '' });
    const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

    /* ══ MIGRATION UTILITY ══ */
    const handleMigrateAssets = async () => {
        if (!confirm('Isso fará o upload das imagens locais (/assets/...) para o Supabase Storage. Continuar?')) return;
        setIsMigrating(true);
        try {
            const localTrails = trails?.filter(t => t.thumbnail && t.thumbnail.startsWith('/assets/')) || [];
            let updatedCount = 0;

            for (const trail of localTrails) {
                try {
                    // 1. Fetch the local asset
                    const response = await fetch(trail.thumbnail!);
                    if (!response.ok) throw new Error(`Failed to fetch ${trail.thumbnail}`);
                    const blob = await response.blob();

                    // 2. Upload to Supabase Storage
                    const fileName = trail.thumbnail!.split('/').pop()!;
                    const filePath = `thumbnails/${Date.now()}-${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('university-thumbnails')
                        .upload(filePath, blob, { contentType: blob.type });

                    if (uploadError) throw uploadError;

                    // 3. Get Public URL
                    const { data } = supabase.storage
                        .from('university-thumbnails')
                        .getPublicUrl(filePath);

                    if (data?.publicUrl) {
                        // 4. Update Trail Record
                        await updateTrail.mutateAsync({
                            id: trail.id,
                            thumbnail: data.publicUrl
                        });
                        updatedCount++;
                    }
                } catch (err) {
                    console.error(`Failed to migrate ${trail.title}:`, err);
                }
            }
            alert(`Migração concluída! ${updatedCount} trilhas atualizadas.`);
        } catch (error) {
            console.error('Migration failed:', error);
            alert('Erro na migração. Verifique o console.');
        } finally {
            setIsMigrating(false);
        }
    };

    const [replyText, setReplyText] = useState<Record<string, string>>({});

    /* ══ TRAIL CRUD ══ */
    const openTrailDialog = (trail?: Trail) => {
        if (trail) {
            setTrailForm({
                title: trail.title,
                description: trail.description,
                category: trail.category,
                level: trail.level,
                color: trail.color,
                required: trail.required,
                thumbnail: trail.thumbnail || ''
            });
            setEditingTrailId(trail.id);
        } else {
            setTrailForm({ title: '', description: '', category: 'onboarding', level: 'Básico', color: '#e50914', required: false, thumbnail: '' });
            setEditingTrailId(null);
        }
        setTrailDialogOpen(true);
    };

    const handleSaveTrail = async () => {
        if (!trailForm.title.trim()) return;

        try {
            if (editingTrailId) {
                await updateTrail.mutateAsync({ id: editingTrailId, ...trailForm });
            } else {
                await createTrail.mutateAsync({ ...trailForm, active: true });
            }
            setTrailDialogOpen(false);
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar trilha');
        }
    };

    const handleDelete = async () => {
        try {
            if (deleteTarget?.type === 'trail') {
                await deleteTrail.mutateAsync(deleteTarget.id);
            } else if (deleteTarget?.type === 'lesson' && currentTrail) {
                await deleteLesson.mutateAsync({ id: deleteTarget.id, trailId: currentTrail.id });
            }
            setDeleteTarget(null);
        } catch (error) {
            alert('Erro ao excluir');
        }
    };

    const toggleTrailActive = (trail: Trail) => {
        updateTrail.mutate({ id: trail.id, active: !trail.active });
    };

    /* ══ OPEN TRAIL DETAIL ══ */
    const openTrailDetail = (trailId: string) => {
        setSelectedTrailId(trailId);
        setView('trail');
    };

    /* ══ LESSON CRUD ══ */
    const openLessonEditor = (lesson?: Lesson) => {
        if (lesson) {
            setSelectedLesson(lesson);
            setLessonForm({
                title: lesson.title,
                subtitle: lesson.subtitle,
                duration: lesson.duration,
                video_url: lesson.video_url,
                description: lesson.description
            });
        } else {
            setSelectedLesson(null);
            setLessonForm({ title: '', subtitle: '', duration: '', video_url: '', description: '' });
        }
        setLessonTab('descricao');
        setView('lesson');
    };

    const handleSaveLesson = async () => {
        if (!lessonForm.title.trim() || !currentTrail) return;

        try {
            if (selectedLesson) {
                await updateLesson.mutateAsync({ id: selectedLesson.id, trail_id: currentTrail.id, ...lessonForm });
            } else {
                // Determine order
                const maxOrder = currentTrail.lessons?.reduce((max, l) => Math.max(max, l.order), 0) || 0;
                await createLesson.mutateAsync({
                    trail_id: currentTrail.id,
                    ...lessonForm,
                    order: maxOrder + 1
                });
            }
            setView('trail');
        } catch (error) {
            alert('Erro ao salvar aula');
        }
    };

    /* ══ MATERIAL CRUD ══ */
    const handleAddMaterial = async () => {
        if (!newMaterial.name || !selectedLesson) return;
        try {
            await createMaterial.mutateAsync({
                lesson_id: selectedLesson.id,
                name: newMaterial.name,
                type: newMaterial.type,
                size: newMaterial.size || '—',
                url: newMaterial.url || '#'
            });
            setNewMaterial({ name: '', url: '', type: 'pdf', size: '' });
            // Refetch needed or mutation handles invalidation
        } catch (error) { alert('Erro ao adicionar material'); }
    };

    const handleRemoveMaterial = (id: string) => deleteMaterial.mutate(id);

    /* ══ LINK CRUD ══ */
    const handleAddLink = async () => {
        if (!newLink.title || !selectedLesson) return;
        try {
            await createLink.mutateAsync({
                lesson_id: selectedLesson.id,
                ...newLink
            });
            setNewLink({ title: '', url: '', description: '' });
        } catch (error) { alert('Erro ao adicionar link'); }
    };

    const handleRemoveLink = (id: string) => deleteLink.mutate(id);

    /* ══ REPLY TO QUESTION ══ */
    const handleReply = async (qId: string) => {
        if (!replyText[qId]?.trim()) return;
        try {
            await answerQuestion.mutateAsync({ id: qId, reply: replyText[qId] });
            setReplyText(prev => ({ ...prev, [qId]: '' }));
        } catch (error) { alert('Erro ao responder'); }
    };

    /* ══════════════════════════════════════
       TRAIL COLUMNS
       ══════════════════════════════════════ */
    const filteredTrails = filterCategory === 'all'
        ? trails || []
        : (trails || []).filter(t => t.category === filterCategory);

    const trailColumns = [
        { key: 'color', label: '', render: (t: Trail) => <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} /> },
        {
            key: 'title', label: 'Trilha', render: (t: Trail) => (
                <div><p className="font-medium">{t.title}</p><p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p></div>
            )
        },
        { key: 'category', label: 'Categoria', render: (t: Trail) => <Badge variant="outline">{categories.find(c => c.value === t.category)?.label || t.category}</Badge> },
        { key: 'level', label: 'Nível', render: (t: Trail) => <Badge variant="secondary">{t.level}</Badge> },
        { key: 'totalLessons', label: 'Aulas', render: (t: Trail) => <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{t.lessons_count || 0}</span> },
        { key: 'required', label: 'Obrig.', render: (t: Trail) => t.required ? <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Sim</Badge> : <span className="text-muted-foreground text-xs">Não</span> },
        {
            key: 'active', label: 'Status', render: (t: Trail) => (
                <Switch checked={t.active} onCheckedChange={() => toggleTrailActive(t)} />
            )
        },
        {
            key: 'actions', label: 'Ações', render: (t: Trail) => (
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openTrailDetail(t.id)} title="Gerenciar aulas"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openTrailDialog(t)} title="Editar trilha"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'trail', id: t.id })} title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
            )
        },
    ];

    /* ══ MODERATION LOGIC ══ */
    const { data: pendingComments, error: pendingError, isLoading: isPendingLoading } = useQuery({
        queryKey: ['university_pending_comments'],
        queryFn: async () => {
            console.log('Fetching pending comments...');
            const { data, error } = await supabase
                .from('community_comments' as any)
                .select('*, user:user_id(email)')
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            console.log('Pending comments result:', { data, error });

            if (error) {
                console.error('Error fetching comments:', error);
                throw error;
            }
            return data as any[];
        }
    });

    console.log('Pending Comments State:', { pendingComments, isPendingLoading, pendingError });

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
            queryClient.invalidateQueries({ queryKey: ['university_pending_comments'] });
        },
        onError: () => toast.error('Erro ao moderar comentário')
    });

    const [moderationOpen, setModerationOpen] = useState(false);

    /* ══ RENDER — LIST VIEW ══ */
    if (view === 'list') {
        return (
            <div className="space-y-6">
                {/* Moderation Banner */}
                {pendingComments && pendingComments.length > 0 && (
                    <div
                        onClick={() => setModerationOpen(true)}
                        className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-lg flex items-center justify-between cursor-pointer hover:bg-orange-500/20 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/20 rounded-full text-orange-500 group-hover:scale-110 transition-transform">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-orange-500">Comentários Pendentes</h3>
                                <p className="text-sm text-muted-foreground">Existem <strong className="text-white">{pendingComments.length}</strong> comentários aguardando aprovação.</p>
                            </div>
                        </div>
                        <Button size="sm" variant="outline" className="border-orange-500/30 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10">
                            Revisar Agora
                        </Button>
                    </div>
                )}

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Universidade — Admin</h1>
                        <p className="text-muted-foreground">Gerencie trilhas, aulas e conteúdo de treinamento</p>
                    </div>
                    <div className="flex gap-2">
                        {trails?.some(t => t.thumbnail?.startsWith('/assets/')) && (
                            <Button variant="outline" onClick={handleMigrateAssets} disabled={isMigrating}>
                                {isMigrating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                                {isMigrating ? 'Migrar Imagens Locais' : 'Migrar Imagens Locais'}
                            </Button>
                        )}
                        <Button onClick={() => openTrailDialog()}>
                            <Plus className="h-4 w-4 mr-2" />Nova Trilha
                        </Button>
                    </div>
                </div>

                {/* Moderation Dialog */}
                <Dialog open={moderationOpen} onOpenChange={setModerationOpen}>
                    <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Moderação de Comentários</DialogTitle>
                            <DialogDescription>Aprove ou rejeite os comentários da comunidade.</DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-2">
                            {pendingComments?.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p>Nenhum comentário pendente!</p>
                                    <Button variant="link" onClick={() => setModerationOpen(false)}>Fechar</Button>
                                </div>
                            ) : (
                                pendingComments?.map((comment: any) => (
                                    <div key={comment.id} className="p-4 rounded-lg bg-muted/30 border space-y-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                    {comment.user?.email?.substring(0, 2).toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">
                                                        {comment.user?.email || 'Usuário'} • {new Date(comment.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-background/50 p-3 rounded text-sm">
                                            "{comment.content}"
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
                                                onClick={() => moderateComment.mutate({ id: comment.id, status: 'rejected' })}
                                                disabled={moderateComment.isPending}
                                            >
                                                <X className="h-4 w-4 mr-1" /> Rejeitar
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white"
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
                    </DialogContent>
                </Dialog>

                {/* Filter */}
                <div className="flex items-center gap-4">
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger className="w-[220px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as categorias</SelectItem>
                            {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <DataTable
                    data={filteredTrails}
                    columns={trailColumns}
                    isLoading={isLoadingTrails}
                    searchPlaceholder="Buscar trilhas..."
                    emptyMessage="Nenhuma trilha cadastrada"
                />

                {/* Trail Dialog */}
                <Dialog open={trailDialogOpen} onOpenChange={setTrailDialogOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editingTrailId ? 'Editar Trilha' : 'Nova Trilha'}</DialogTitle>
                            <DialogDescription>Preencha os dados da trilha de treinamento</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div><Label>Título *</Label><Input value={trailForm.title} onChange={e => setTrailForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Abertura da Loja" /></div>
                            <div><Label>Descrição</Label><Textarea value={trailForm.description} onChange={e => setTrailForm(p => ({ ...p, description: e.target.value }))} placeholder="Descreva o objetivo da trilha" rows={3} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Categoria</Label>
                                    <Select value={trailForm.category} onValueChange={v => setTrailForm(p => ({ ...p, category: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Nível</Label>
                                    <Select value={trailForm.level} onValueChange={v => setTrailForm(p => ({ ...p, level: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{levels.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label>Cor (hex)</Label><div className="flex gap-2"><Input type="color" value={trailForm.color} onChange={e => setTrailForm(p => ({ ...p, color: e.target.value }))} className="w-12 h-9 p-1 cursor-pointer" /><Input value={trailForm.color} onChange={e => setTrailForm(p => ({ ...p, color: e.target.value }))} className="flex-1" /></div></div>
                                <div className="flex items-end gap-3 pb-1"><Label>Obrigatória</Label><Switch checked={trailForm.required} onCheckedChange={v => setTrailForm(p => ({ ...p, required: v }))} /></div>
                            </div>

                            <div>
                                <Label>Imagem da Trilha</Label>
                                <div className="mt-2 flex items-center gap-4">
                                    {trailForm.thumbnail && (
                                        <div className="relative w-24 h-16 rounded-md overflow-hidden bg-muted border">
                                            <img src={trailForm.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => setTrailForm(p => ({ ...p, thumbnail: '' }))}
                                                className="absolute top-0 right-0 bg-black/50 hover:bg-red-500 text-white p-0.5 rounded-bl"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            className="cursor-pointer"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                try {
                                                    // Generate unique filename
                                                    const fileExt = file.name.split('.').pop();
                                                    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                                                    const filePath = `thumbnails/${fileName}`;

                                                    // Upload logic directly here for simplicity
                                                    const { error: uploadError } = await supabase.storage
                                                        .from('university-thumbnails')
                                                        .upload(filePath, file);

                                                    if (uploadError) throw uploadError;

                                                    // Get public URL
                                                    const { data } = supabase.storage
                                                        .from('university-thumbnails')
                                                        .getPublicUrl(filePath);

                                                    if (data?.publicUrl) {
                                                        setTrailForm(p => ({ ...p, thumbnail: data.publicUrl }));
                                                    }
                                                } catch (error) {
                                                    console.error('Error uploading image:', error);
                                                    alert('Erro ao fazer upload da imagem. Verifique se o bucket "university-thumbnails" existe.');
                                                }
                                            }}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">Formatos: PNG, JPG (máx. 2MB recomendado)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setTrailDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSaveTrail} disabled={!trailForm.title.trim() || createTrail.isPending || updateTrail.isPending}>
                                {createTrail.isPending || updateTrail.isPending ? 'Salvando...' : (editingTrailId ? 'Salvar' : 'Criar')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Alert */}
                <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita. Deseja continuar?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    }

    /* ══════════════════════════════════════
       RENDER — TRAIL DETAIL (lesson list)
       ══════════════════════════════════════ */
    if (view === 'trail') {
        if (isLoadingTrail) return <div className="p-8 text-center">Carregando trilha...</div>;
        if (!currentTrail) return <div className="p-8 text-center text-red-500">Trilha não encontrada</div>;

        const sortedLessons = [...(currentTrail.lessons || [])].sort((a, b) => a.order - b.order);

        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => { setView('list'); setSelectedTrailId(null); }}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: currentTrail.color }} />
                            {currentTrail.title}
                        </h1>
                        <p className="text-muted-foreground text-sm">{currentTrail.description}</p>
                    </div>
                    <Button onClick={() => openLessonEditor()}>
                        <Plus className="h-4 w-4 mr-2" />Nova Aula
                    </Button>
                </div>

                {/* Lesson stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg border bg-card p-4 text-center">
                        <p className="text-2xl font-bold">{sortedLessons.length}</p>
                        <p className="text-xs text-muted-foreground">Aulas cadastradas</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4 text-center">
                        <p className="text-2xl font-bold">{sortedLessons.reduce((s, l) => s + (l.questions?.length || 0), 0)}</p>
                        <p className="text-xs text-muted-foreground">Perguntas totais</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4 text-center">
                        <p className="text-2xl font-bold text-red-500">{sortedLessons.reduce((s, l) => s + (l.questions?.filter(q => !q.answered).length || 0), 0)}</p>
                        <p className="text-xs text-muted-foreground">Sem resposta</p>
                    </div>
                </div>

                {/* Lesson list */}
                {sortedLessons.length === 0 ? (
                    <div className="text-center py-16 border rounded-lg">
                        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">Nenhuma aula cadastrada</p>
                        <Button className="mt-4" onClick={() => openLessonEditor()}><Plus className="h-4 w-4 mr-2" />Adicionar Aula</Button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sortedLessons.map((lesson, idx) => (
                            <div key={lesson.id} className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
                                <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab" />
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{idx + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium">{lesson.title}</p>
                                    <p className="text-xs text-muted-foreground">{lesson.subtitle} • {lesson.duration}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {lesson.video_url ? <Badge variant="outline" className="gap-1 text-xs"><Play className="h-3 w-3" />Vídeo</Badge> : <Badge variant="secondary" className="text-xs">Sem vídeo</Badge>}
                                    {(lesson.materials?.length || 0) > 0 && <Badge variant="outline" className="text-xs">{lesson.materials?.length} mat.</Badge>}
                                    {(lesson.questions?.filter(q => !q.answered).length || 0) > 0 && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{lesson.questions?.filter(q => !q.answered).length} pend.</Badge>}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" onClick={() => openLessonEditor(lesson)}><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'lesson', id: lesson.id })}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Delete Alert for lessons */}
                <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Excluir Aula</AlertDialogTitle><AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    }

    /* ══════════════════════════════════════
       RENDER — LESSON EDITOR
       ══════════════════════════════════════ */
    if (view === 'lesson' && currentTrail) {
        // Need to find the lesson in currentTrail because selectedLesson might be stale if we relied on separate state completely, 
        // but selectedLesson is fine for initial form values. 
        // For materials/links/questions list, we should use the one from currentTrail.lessons found by ID
        const activeLessonData = selectedLesson
            ? currentTrail.lessons?.find(l => l.id === selectedLesson.id)
            : null;

        // If creating new lesson, activeLessonData is null.

        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setView('trail')}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <p className="text-xs text-muted-foreground">{currentTrail.title}</p>
                        <h1 className="text-2xl font-bold">{selectedLesson ? 'Editar Aula' : 'Nova Aula'}</h1>
                    </div>
                    <div className="ml-auto flex gap-2">
                        <Button variant="outline" onClick={() => setView('trail')}>Cancelar</Button>
                        <Button onClick={handleSaveLesson} disabled={!lessonForm.title.trim() || createLesson.isPending || updateLesson.isPending}>
                            {createLesson.isPending || updateLesson.isPending ? 'Salvando...' : 'Salvar Aula'}
                        </Button>
                    </div>
                </div>

                {/* Basic fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border bg-card p-6">
                    <div><Label>Título da aula *</Label><Input value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Checklist de Abertura" /></div>
                    <div><Label>Subtítulo</Label><Input value={lessonForm.subtitle} onChange={e => setLessonForm(p => ({ ...p, subtitle: e.target.value }))} placeholder="Ex: Lista de verificação" /></div>
                    <div><Label>Duração</Label><Input value={lessonForm.duration} onChange={e => setLessonForm(p => ({ ...p, duration: e.target.value }))} placeholder="Ex: 6 min" /></div>
                    <div><Label>URL do Vídeo (YouTube)</Label><Input value={lessonForm.video_url} onChange={e => setLessonForm(p => ({ ...p, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." /></div>
                </div>

                {/* Tabs - Only show if editing existing lesson (need ID for relations) */}
                {!selectedLesson ? (
                    <div className="p-8 text-center border rounded-lg text-muted-foreground">
                        Salve a aula primeiro para adicionar materiais, links e perguntas.
                    </div>
                ) : (
                    <Tabs value={lessonTab} onValueChange={setLessonTab}>
                        <TabsList className="w-full grid grid-cols-4">
                            <TabsTrigger value="descricao" className="gap-1"><FileText className="h-3 w-3" />Descrição</TabsTrigger>
                            <TabsTrigger value="materiais" className="gap-1"><Upload className="h-3 w-3" />Materiais<Badge className="ml-1 h-4 text-[10px] px-1">{activeLessonData?.materials?.length || 0}</Badge></TabsTrigger>
                            <TabsTrigger value="links" className="gap-1"><ExternalLink className="h-3 w-3" />Links<Badge className="ml-1 h-4 text-[10px] px-1">{activeLessonData?.links?.length || 0}</Badge></TabsTrigger>
                            <TabsTrigger value="perguntas" className="gap-1"><MessageCircle className="h-3 w-3" />Perguntas<Badge className="ml-1 h-4 text-[10px] px-1 bg-red-500">{activeLessonData?.questions?.filter(q => !q.answered).length || 0}</Badge></TabsTrigger>
                        </TabsList>

                        {/* ─── DESCRIÇÃO ─── */}
                        <TabsContent value="descricao" className="border rounded-lg p-6">
                            <Label>Descrição da aula</Label>
                            <Textarea value={lessonForm.description} onChange={e => setLessonForm(p => ({ ...p, description: e.target.value }))} placeholder="Descreva o conteúdo desta aula em detalhes..." rows={8} className="mt-2" />
                        </TabsContent>

                        {/* ─── MATERIAIS ─── */}
                        <TabsContent value="materiais" className="border rounded-lg p-6 space-y-4">
                            <div className="flex gap-2 items-end">
                                <div className="flex-1 space-y-2">
                                    <Label>Nome do arquivo</Label>
                                    <Input
                                        value={newMaterial.name}
                                        onChange={e => setNewMaterial(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Nome do arquivo (ex: checklist.pdf)"
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <Label>Arquivo (Upload)</Label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                type="file"
                                                className="cursor-pointer file:text-primary file:font-semibold hover:file:bg-primary/10"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    setIsUploadingMaterial(true);
                                                    try {
                                                        // Calculate size
                                                        const sizeInMB = file.size / (1024 * 1024);
                                                        const sizeStr = sizeInMB > 1
                                                            ? `${sizeInMB.toFixed(1)} MB`
                                                            : `${(file.size / 1024).toFixed(0)} KB`;

                                                        // Get type
                                                        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';

                                                        // Generate path
                                                        const filePath = `materials/${Date.now()}-${file.name}`;

                                                        // Upload
                                                        const { error: uploadError } = await supabase.storage
                                                            .from('university-materials')
                                                            .upload(filePath, file);

                                                        if (uploadError) throw uploadError;

                                                        // Get URL
                                                        const { data } = supabase.storage
                                                            .from('university-materials')
                                                            .getPublicUrl(filePath);

                                                        if (data?.publicUrl) {
                                                            setNewMaterial(prev => ({
                                                                ...prev,
                                                                url: data.publicUrl,
                                                                name: prev.name || file.name, // Auto-fill name if empty
                                                                size: sizeStr,
                                                                type: fileExt
                                                            }));
                                                        }
                                                    } catch (error) {
                                                        console.error('Upload failed:', error);
                                                        alert('Erro no upload. Verifique se o bucket "university-materials" existe.');
                                                    } finally {
                                                        setIsUploadingMaterial(false);
                                                    }
                                                }}
                                                disabled={isUploadingMaterial}
                                            />
                                            {isUploadingMaterial && (
                                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    onClick={handleAddMaterial}
                                    disabled={!newMaterial.name || !newMaterial.url || createMaterial.isPending || isUploadingMaterial}
                                    className="mb-0.5"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Adicionar
                                </Button>
                            </div>

                            {/* Preview URL if uploaded */}
                            {newMaterial.url && (
                                <div className="text-xs text-green-600 flex items-center gap-1 bg-green-50 p-2 rounded border border-green-200">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Arquivo pronto para salvar: <span className="font-mono truncate max-w-[300px]">{newMaterial.url}</span>
                                </div>
                            )}

                            {(!activeLessonData?.materials || activeLessonData.materials.length === 0) && <p className="text-center text-sm text-muted-foreground py-8">Nenhum material adicionado</p>}
                            {activeLessonData?.materials?.map(m => (
                                <div key={m.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium block">{m.name}</span>
                                        <span className="text-xs text-muted-foreground">{m.type?.toUpperCase()} • {m.size}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveMaterial(m.id)}><X className="h-3 w-3" /></Button>
                                </div>
                            ))}
                        </TabsContent>

                        {/* ─── LINKS ─── */}
                        <TabsContent value="links" className="border rounded-lg p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                <Input value={newLink.title} onChange={e => setNewLink(p => ({ ...p, title: e.target.value }))} placeholder="Título do link" />
                                <Input value={newLink.url} onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))} placeholder="URL" />
                                <div className="flex gap-2">
                                    <Input value={newLink.description} onChange={e => setNewLink(p => ({ ...p, description: e.target.value }))} placeholder="Descrição" className="flex-1" />
                                    <Button onClick={handleAddLink} disabled={!newLink.title || createLink.isPending}><Plus className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            {(!activeLessonData?.links || activeLessonData.links.length === 0) && <p className="text-center text-sm text-muted-foreground py-8">Nenhum link adicionado</p>}
                            {activeLessonData?.links?.map(l => (
                                <div key={l.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                                    <ExternalLink className="h-4 w-4 text-blue-500" />
                                    <div className="flex-1 min-w-0"><p className="text-sm font-medium">{l.title}</p><p className="text-xs text-muted-foreground truncate">{l.url}</p></div>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveLink(l.id)}><X className="h-3 w-3" /></Button>
                                </div>
                            ))}
                        </TabsContent>

                        {/* ─── PERGUNTAS ─── */}
                        <TabsContent value="perguntas" className="border rounded-lg p-6 space-y-4">
                            {(!activeLessonData?.questions || activeLessonData.questions.length === 0) && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma pergunta dos alunos</p>}
                            {activeLessonData?.questions?.map(q => (
                                <div key={q.id} className="rounded-lg border p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{q.author_name || 'Aluno'} <span className="text-muted-foreground font-normal">• {new Date(q.created_at).toLocaleDateString()}</span></p>
                                            <p className="text-sm mt-1">{q.text}</p>
                                        </div>
                                        <Badge variant={q.answered ? 'default' : 'destructive'}>{q.answered ? 'Respondida' : 'Pendente'}</Badge>
                                    </div>
                                    {q.answered && q.reply && (
                                        <div className="ml-4 pl-3 border-l-2 border-primary/30">
                                            <p className="text-xs text-primary font-semibold">Resposta</p>
                                            <p className="text-sm text-muted-foreground">{q.reply}</p>
                                        </div>
                                    )}
                                    {!q.answered && (
                                        <div className="flex gap-2">
                                            <Input value={replyText[q.id] || ''} onChange={e => setReplyText(p => ({ ...p, [q.id]: e.target.value }))} placeholder="Escreva sua resposta..." className="flex-1" />
                                            <Button size="sm" onClick={() => handleReply(q.id)} disabled={!replyText[q.id]?.trim() || answerQuestion.isPending}>Responder</Button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </TabsContent>
                    </Tabs>
                )}
            </div>
        );
    }

    return null;
}
