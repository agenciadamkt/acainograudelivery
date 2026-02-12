'use client';

import { useState } from 'react';
import {
    Plus, Pencil, Trash2, GripVertical, Play, Eye, BookOpen, Clock,
    FileText, ExternalLink, MessageCircle, ChevronLeft, Upload, X, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

/* ══════════════════════════════════════
   TYPES
   ══════════════════════════════════════ */
interface Material { id: string; name: string; type: string; size: string; url: string }
interface LinkItem { id: string; title: string; url: string; description: string }
interface Question { id: string; author: string; date: string; text: string; answered: boolean; reply?: string }

interface Lesson {
    id: string; title: string; subtitle: string; duration: string;
    videoUrl: string; completed: boolean; description: string;
    materials: Material[]; links: LinkItem[]; questions: Question[];
    order: number;
}

interface Trail {
    id: string; title: string; description: string; category: string;
    level: string; color: string; required: boolean; active: boolean;
    totalLessons: number; totalDuration: string; completionRate: number;
    lessons: Lesson[];
}

/* ══════════════════════════════════════
   MOCK DATA
   ══════════════════════════════════════ */
const initialTrails: Trail[] = [
    {
        id: '1', title: 'Abertura da Loja', description: 'Procedimentos diários de abertura, checklist e rotinas matinais.',
        category: 'onboarding', level: 'Básico', color: '#e50914', required: true, active: true,
        totalLessons: 8, totalDuration: '45min', completionRate: 87,
        lessons: [
            { id: '1-1', title: 'Checklist de Abertura', subtitle: 'Lista completa de verificação', duration: '6 min', videoUrl: 'https://youtube.com/watch?v=abc', completed: false, description: 'Nesta aula você aprenderá o checklist completo de abertura da loja.', materials: [{ id: 'm1', name: 'Checklist.pdf', type: 'pdf', size: '340 KB', url: '#' }], links: [{ id: 'l1', title: 'Manual de Operações', url: '#', description: 'Capítulo 1' }], questions: [{ id: 'q1', author: 'Maria', date: '3 dias', text: 'Quanto tempo antes devo chegar?', answered: true, reply: '30 minutos antes.' }], order: 1 },
            { id: '1-2', title: 'Ligando Equipamentos', subtitle: 'Ordem de ativação', duration: '5 min', videoUrl: 'https://youtube.com/watch?v=def', completed: false, description: 'Aprenda a ordem correta de ativação dos equipamentos.', materials: [], links: [], questions: [], order: 2 },
            { id: '1-3', title: 'Conferência de Estoque', subtitle: 'Verificação dos insumos', duration: '7 min', videoUrl: '', completed: false, description: 'Conferência rápida de estoque pela manhã.', materials: [], links: [], questions: [{ id: 'q2', author: 'João', date: '1 sem', text: 'Como registrar falta de insumo?', answered: false }], order: 3 },
        ],
    },
    {
        id: '2', title: 'Fechamento de Caixa', description: 'Rotina de encerramento do dia.',
        category: 'onboarding', level: 'Básico', color: '#e87c03', required: true, active: true,
        totalLessons: 6, totalDuration: '30min', completionRate: 62,
        lessons: [
            { id: '2-1', title: 'Conferência do Caixa', subtitle: 'Contagem e verificação', duration: '5 min', videoUrl: '', completed: false, description: 'Processo completo de conferência.', materials: [], links: [], questions: [], order: 1 },
        ],
    },
    {
        id: '3', title: 'Padrão de Atendimento', description: 'Como encantar cada cliente.',
        category: 'onboarding', level: 'Básico', color: '#46d369', required: true, active: true,
        totalLessons: 10, totalDuration: '1h', completionRate: 45,
        lessons: [],
    },
    {
        id: '7', title: 'Montagem de Açaí', description: 'Padrão de montagem das receitas.',
        category: 'operacao', level: 'Básico', color: '#8D42DD', required: false, active: true,
        totalLessons: 20, totalDuration: '2h30', completionRate: 23,
        lessons: [
            { id: '7-1', title: 'Cadastros de Ingredientes', subtitle: 'Cadastros de Ingredientes', duration: '2 min', videoUrl: 'https://youtube.com/watch?v=xyz', completed: false, description: 'Cadastre todos os ingredientes.', materials: [{ id: 'm2', name: 'Lista Ingredientes.pdf', type: 'pdf', size: '280 KB', url: '#' }], links: [{ id: 'l2', title: 'Painel de Ingredientes', url: '/admin/menu/ingredients', description: 'Acesse o sistema' }], questions: [], order: 1 },
            { id: '7-2', title: 'Cadastro de Produtos', subtitle: 'Criando produtos', duration: '2 min', videoUrl: '', completed: false, description: 'Crie e configure produtos.', materials: [], links: [], questions: [], order: 2 },
        ],
    },
    {
        id: '9', title: 'Marketing Local', description: 'Estratégias de marketing regional.',
        category: 'marketing', level: 'Avançado', color: '#f44336', required: false, active: false,
        totalLessons: 10, totalDuration: '1h20', completionRate: 0,
        lessons: [],
    },
];

const categories = [
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'operacao', label: 'Operação' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'financeiro', label: 'Financeiro' },
    { value: 'gestao', label: 'Gestão' },
];

const levels = ['Básico', 'Intermediário', 'Avançado'];

/* ══════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════ */
export default function UniversidadeAdminPage() {
    const [trails, setTrails] = useState<Trail[]>(initialTrails);
    const [view, setView] = useState<'list' | 'trail' | 'lesson'>('list');
    const [editingTrail, setEditingTrail] = useState<Trail | null>(null);
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [trailDialogOpen, setTrailDialogOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'trail' | 'lesson'; id: string } | null>(null);
    const [filterCategory, setFilterCategory] = useState('all');

    // ─── Trail form state ───
    const [trailForm, setTrailForm] = useState({ title: '', description: '', category: 'onboarding', level: 'Básico', color: '#e50914', required: false });

    // ─── Lesson form state ───
    const [lessonForm, setLessonForm] = useState({ title: '', subtitle: '', duration: '', videoUrl: '', description: '' });
    const [lessonTab, setLessonTab] = useState('descricao');

    // ─── Material / Link add state ───
    const [newMaterial, setNewMaterial] = useState({ name: '', url: '' });
    const [newLink, setNewLink] = useState({ title: '', url: '', description: '' });
    const [replyText, setReplyText] = useState<Record<string, string>>({});

    /* ══ TRAIL CRUD ══ */
    const openTrailDialog = (trail?: Trail) => {
        if (trail) {
            setTrailForm({ title: trail.title, description: trail.description, category: trail.category, level: trail.level, color: trail.color, required: trail.required });
            setEditingTrail(trail);
        } else {
            setTrailForm({ title: '', description: '', category: 'onboarding', level: 'Básico', color: '#e50914', required: false });
            setEditingTrail(null);
        }
        setTrailDialogOpen(true);
    };

    const saveTrail = () => {
        if (!trailForm.title.trim()) return;
        if (editingTrail) {
            setTrails(prev => prev.map(t => t.id === editingTrail.id ? { ...t, ...trailForm } : t));
        } else {
            const newTrail: Trail = {
                id: Date.now().toString(), ...trailForm, active: true,
                totalLessons: 0, totalDuration: '0min', completionRate: 0, lessons: [],
            };
            setTrails(prev => [...prev, newTrail]);
        }
        setTrailDialogOpen(false);
    };

    const deleteTrail = () => {
        if (deleteTarget?.type === 'trail') {
            setTrails(prev => prev.filter(t => t.id !== deleteTarget.id));
        }
        setDeleteTarget(null);
    };

    const toggleTrailActive = (id: string) => {
        setTrails(prev => prev.map(t => t.id === id ? { ...t, active: !t.active } : t));
    };

    /* ══ OPEN TRAIL DETAIL ══ */
    const openTrailDetail = (trail: Trail) => {
        setEditingTrail(trail);
        setView('trail');
    };

    /* ══ LESSON CRUD ══ */
    const openLessonEditor = (lesson?: Lesson) => {
        if (lesson) {
            setEditingLesson(lesson);
            setLessonForm({ title: lesson.title, subtitle: lesson.subtitle, duration: lesson.duration, videoUrl: lesson.videoUrl, description: lesson.description });
        } else {
            setEditingLesson(null);
            setLessonForm({ title: '', subtitle: '', duration: '', videoUrl: '', description: '' });
        }
        setLessonTab('descricao');
        setView('lesson');
    };

    const saveLesson = () => {
        if (!lessonForm.title.trim() || !editingTrail) return;
        setTrails(prev => prev.map(t => {
            if (t.id !== editingTrail.id) return t;
            if (editingLesson) {
                return { ...t, lessons: t.lessons.map(l => l.id === editingLesson.id ? { ...l, ...lessonForm } : l) };
            }
            const newLesson: Lesson = {
                id: `${t.id}-${Date.now()}`, ...lessonForm, completed: false,
                materials: [], links: [], questions: [], order: t.lessons.length + 1,
            };
            return { ...t, lessons: [...t.lessons, newLesson], totalLessons: t.totalLessons + 1 };
        }));
        // Update editingTrail reference
        setEditingTrail(prev => {
            if (!prev) return prev;
            const updated = trails.find(t => t.id === prev.id);
            return updated || prev;
        });
        setView('trail');
    };

    const deleteLesson = () => {
        if (deleteTarget?.type === 'lesson' && editingTrail) {
            setTrails(prev => prev.map(t => t.id === editingTrail.id ? { ...t, lessons: t.lessons.filter(l => l.id !== deleteTarget.id), totalLessons: t.totalLessons - 1 } : t));
        }
        setDeleteTarget(null);
    };

    /* ══ MATERIAL CRUD ══ */
    const addMaterial = () => {
        if (!newMaterial.name || !editingLesson || !editingTrail) return;
        const mat: Material = { id: `m-${Date.now()}`, name: newMaterial.name, type: newMaterial.name.split('.').pop() || 'pdf', size: '—', url: newMaterial.url || '#' };
        setTrails(prev => prev.map(t => t.id === editingTrail.id ? { ...t, lessons: t.lessons.map(l => l.id === editingLesson.id ? { ...l, materials: [...l.materials, mat] } : l) } : t));
        setEditingLesson(prev => prev ? { ...prev, materials: [...prev.materials, mat] } : prev);
        setNewMaterial({ name: '', url: '' });
    };

    const removeMaterial = (matId: string) => {
        if (!editingLesson || !editingTrail) return;
        setTrails(prev => prev.map(t => t.id === editingTrail.id ? { ...t, lessons: t.lessons.map(l => l.id === editingLesson.id ? { ...l, materials: l.materials.filter(m => m.id !== matId) } : l) } : t));
        setEditingLesson(prev => prev ? { ...prev, materials: prev.materials.filter(m => m.id !== matId) } : prev);
    };

    /* ══ LINK CRUD ══ */
    const addLink = () => {
        if (!newLink.title || !editingLesson || !editingTrail) return;
        const link: LinkItem = { id: `l-${Date.now()}`, ...newLink };
        setTrails(prev => prev.map(t => t.id === editingTrail.id ? { ...t, lessons: t.lessons.map(l => l.id === editingLesson.id ? { ...l, links: [...l.links, link] } : l) } : t));
        setEditingLesson(prev => prev ? { ...prev, links: [...prev.links, link] } : prev);
        setNewLink({ title: '', url: '', description: '' });
    };

    const removeLink = (linkId: string) => {
        if (!editingLesson || !editingTrail) return;
        setTrails(prev => prev.map(t => t.id === editingTrail.id ? { ...t, lessons: t.lessons.map(l => l.id === editingLesson.id ? { ...l, links: l.links.filter(li => li.id !== linkId) } : l) } : t));
        setEditingLesson(prev => prev ? { ...prev, links: prev.links.filter(li => li.id !== linkId) } : prev);
    };

    /* ══ REPLY TO QUESTION ══ */
    const replyToQuestion = (qId: string) => {
        if (!replyText[qId]?.trim() || !editingLesson || !editingTrail) return;
        setTrails(prev => prev.map(t => t.id === editingTrail.id ? { ...t, lessons: t.lessons.map(l => l.id === editingLesson.id ? { ...l, questions: l.questions.map(q => q.id === qId ? { ...q, answered: true, reply: replyText[qId] } : q) } : l) } : t));
        setEditingLesson(prev => prev ? { ...prev, questions: prev.questions.map(q => q.id === qId ? { ...q, answered: true, reply: replyText[qId] } : q) } : prev);
        setReplyText(prev => ({ ...prev, [qId]: '' }));
    };

    // Keep editingTrail in sync
    const currentTrail = editingTrail ? trails.find(t => t.id === editingTrail.id) || editingTrail : null;

    /* ══════════════════════════════════════
       TRAIL COLUMNS (for DataTable)
       ══════════════════════════════════════ */
    const filteredTrails = filterCategory === 'all' ? trails : trails.filter(t => t.category === filterCategory);

    const trailColumns = [
        { key: 'color', label: '', render: (t: Trail) => <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }} /> },
        {
            key: 'title', label: 'Trilha', render: (t: Trail) => (
                <div><p className="font-medium">{t.title}</p><p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p></div>
            )
        },
        { key: 'category', label: 'Categoria', render: (t: Trail) => <Badge variant="outline">{categories.find(c => c.value === t.category)?.label || t.category}</Badge> },
        { key: 'level', label: 'Nível', render: (t: Trail) => <Badge variant="secondary">{t.level}</Badge> },
        { key: 'totalLessons', label: 'Aulas', render: (t: Trail) => <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{t.totalLessons}</span> },
        { key: 'totalDuration', label: 'Duração', render: (t: Trail) => <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.totalDuration}</span> },
        {
            key: 'completionRate', label: 'Conclusão', render: (t: Trail) => (
                <div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full bg-green-500 rounded-full" style={{ width: `${t.completionRate}%` }} /></div><span className="text-xs">{t.completionRate}%</span></div>
            )
        },
        { key: 'required', label: 'Obrig.', render: (t: Trail) => t.required ? <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Sim</Badge> : <span className="text-muted-foreground text-xs">Não</span> },
        {
            key: 'active', label: 'Status', render: (t: Trail) => (
                <Switch checked={t.active} onCheckedChange={() => toggleTrailActive(t.id)} />
            )
        },
        {
            key: 'actions', label: 'Ações', render: (t: Trail) => (
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openTrailDetail(t)} title="Gerenciar aulas"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => openTrailDialog(t)} title="Editar trilha"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget({ type: 'trail', id: t.id })} title="Excluir"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
            )
        },
    ];

    /* ══════════════════════════════════════
       RENDER — LIST VIEW
       ══════════════════════════════════════ */
    if (view === 'list') {
        const unanswered = trails.reduce((sum, t) => sum + t.lessons.reduce((s, l) => s + l.questions.filter(q => !q.answered).length, 0), 0);
        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Universidade — Admin</h1>
                        <p className="text-muted-foreground">Gerencie trilhas, aulas e conteúdo de treinamento</p>
                    </div>
                    <Button onClick={() => openTrailDialog()}>
                        <Plus className="h-4 w-4 mr-2" />Nova Trilha
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Trilhas', value: trails.length, icon: BookOpen, color: 'text-blue-500' },
                        { label: 'Aulas totais', value: trails.reduce((s, t) => s + t.totalLessons, 0), icon: Play, color: 'text-green-500' },
                        { label: 'Conclusão média', value: `${Math.round(trails.reduce((s, t) => s + t.completionRate, 0) / (trails.length || 1))}%`, icon: Clock, color: 'text-orange-500' },
                        { label: 'Perguntas pendentes', value: unanswered, icon: MessageCircle, color: unanswered > 0 ? 'text-red-500' : 'text-green-500' },
                    ].map((stat, i) => (
                        <div key={i} className="rounded-lg border bg-card p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                <span className="text-sm text-muted-foreground">{stat.label}</span>
                            </div>
                            <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                    ))}
                </div>

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

                <DataTable data={filteredTrails} columns={trailColumns} searchPlaceholder="Buscar trilhas..." emptyMessage="Nenhuma trilha cadastrada" />

                {/* Trail Dialog */}
                <Dialog open={trailDialogOpen} onOpenChange={setTrailDialogOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editingTrail ? 'Editar Trilha' : 'Nova Trilha'}</DialogTitle>
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
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setTrailDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={saveTrail} disabled={!trailForm.title.trim()}>{editingTrail ? 'Salvar' : 'Criar'}</Button>
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
                            <AlertDialogAction onClick={deleteTarget?.type === 'trail' ? deleteTrail : deleteLesson} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    }

    /* ══════════════════════════════════════
       RENDER — TRAIL DETAIL (lesson list)
       ══════════════════════════════════════ */
    if (view === 'trail' && currentTrail) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => { setView('list'); setEditingTrail(null); }}>
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
                        <p className="text-2xl font-bold">{currentTrail.lessons.length}</p>
                        <p className="text-xs text-muted-foreground">Aulas cadastradas</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4 text-center">
                        <p className="text-2xl font-bold">{currentTrail.lessons.reduce((s, l) => s + l.questions.length, 0)}</p>
                        <p className="text-xs text-muted-foreground">Perguntas totais</p>
                    </div>
                    <div className="rounded-lg border bg-card p-4 text-center">
                        <p className="text-2xl font-bold text-red-500">{currentTrail.lessons.reduce((s, l) => s + l.questions.filter(q => !q.answered).length, 0)}</p>
                        <p className="text-xs text-muted-foreground">Sem resposta</p>
                    </div>
                </div>

                {/* Lesson list */}
                {currentTrail.lessons.length === 0 ? (
                    <div className="text-center py-16 border rounded-lg">
                        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">Nenhuma aula cadastrada</p>
                        <Button className="mt-4" onClick={() => openLessonEditor()}><Plus className="h-4 w-4 mr-2" />Adicionar Aula</Button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {currentTrail.lessons.sort((a, b) => a.order - b.order).map((lesson, idx) => (
                            <div key={lesson.id} className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
                                <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab" />
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{idx + 1}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium">{lesson.title}</p>
                                    <p className="text-xs text-muted-foreground">{lesson.subtitle} • {lesson.duration}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {lesson.videoUrl ? <Badge variant="outline" className="gap-1 text-xs"><Play className="h-3 w-3" />Vídeo</Badge> : <Badge variant="secondary" className="text-xs">Sem vídeo</Badge>}
                                    {lesson.materials.length > 0 && <Badge variant="outline" className="text-xs">{lesson.materials.length} mat.</Badge>}
                                    {lesson.questions.filter(q => !q.answered).length > 0 && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{lesson.questions.filter(q => !q.answered).length} pend.</Badge>}
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
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={deleteLesson} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    }

    /* ══════════════════════════════════════
       RENDER — LESSON EDITOR
       ══════════════════════════════════════ */
    if (view === 'lesson' && currentTrail) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => setView('trail')}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <p className="text-xs text-muted-foreground">{currentTrail.title}</p>
                        <h1 className="text-2xl font-bold">{editingLesson ? 'Editar Aula' : 'Nova Aula'}</h1>
                    </div>
                    <div className="ml-auto flex gap-2">
                        <Button variant="outline" onClick={() => setView('trail')}>Cancelar</Button>
                        <Button onClick={saveLesson} disabled={!lessonForm.title.trim()}>Salvar Aula</Button>
                    </div>
                </div>

                {/* Basic fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border bg-card p-6">
                    <div><Label>Título da aula *</Label><Input value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Checklist de Abertura" /></div>
                    <div><Label>Subtítulo</Label><Input value={lessonForm.subtitle} onChange={e => setLessonForm(p => ({ ...p, subtitle: e.target.value }))} placeholder="Ex: Lista de verificação" /></div>
                    <div><Label>Duração</Label><Input value={lessonForm.duration} onChange={e => setLessonForm(p => ({ ...p, duration: e.target.value }))} placeholder="Ex: 6 min" /></div>
                    <div><Label>URL do Vídeo (YouTube)</Label><Input value={lessonForm.videoUrl} onChange={e => setLessonForm(p => ({ ...p, videoUrl: e.target.value }))} placeholder="https://youtube.com/watch?v=..." /></div>
                </div>

                {/* Tabs */}
                <Tabs value={lessonTab} onValueChange={setLessonTab}>
                    <TabsList className="w-full grid grid-cols-4">
                        <TabsTrigger value="descricao" className="gap-1"><FileText className="h-3 w-3" />Descrição</TabsTrigger>
                        <TabsTrigger value="materiais" className="gap-1"><Upload className="h-3 w-3" />Materiais{editingLesson && editingLesson.materials.length > 0 && <Badge className="ml-1 h-4 text-[10px] px-1">{editingLesson.materials.length}</Badge>}</TabsTrigger>
                        <TabsTrigger value="links" className="gap-1"><ExternalLink className="h-3 w-3" />Links{editingLesson && editingLesson.links.length > 0 && <Badge className="ml-1 h-4 text-[10px] px-1">{editingLesson.links.length}</Badge>}</TabsTrigger>
                        <TabsTrigger value="perguntas" className="gap-1"><MessageCircle className="h-3 w-3" />Perguntas{editingLesson && editingLesson.questions.filter(q => !q.answered).length > 0 && <Badge className="ml-1 h-4 text-[10px] px-1 bg-red-500">{editingLesson.questions.filter(q => !q.answered).length}</Badge>}</TabsTrigger>
                    </TabsList>

                    {/* ─── DESCRIÇÃO ─── */}
                    <TabsContent value="descricao" className="border rounded-lg p-6">
                        <Label>Descrição da aula</Label>
                        <Textarea value={lessonForm.description} onChange={e => setLessonForm(p => ({ ...p, description: e.target.value }))} placeholder="Descreva o conteúdo desta aula em detalhes..." rows={8} className="mt-2" />
                    </TabsContent>

                    {/* ─── MATERIAIS ─── */}
                    <TabsContent value="materiais" className="border rounded-lg p-6 space-y-4">
                        <div className="flex gap-2">
                            <Input value={newMaterial.name} onChange={e => setNewMaterial(p => ({ ...p, name: e.target.value }))} placeholder="Nome do arquivo (ex: checklist.pdf)" className="flex-1" />
                            <Input value={newMaterial.url} onChange={e => setNewMaterial(p => ({ ...p, url: e.target.value }))} placeholder="URL (opcional)" className="w-48" />
                            <Button onClick={addMaterial} disabled={!newMaterial.name || !editingLesson}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
                        </div>
                        {editingLesson?.materials.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhum material adicionado</p>}
                        {editingLesson?.materials.map(m => (
                            <div key={m.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="flex-1 text-sm">{m.name}</span>
                                <span className="text-xs text-muted-foreground">{m.size}</span>
                                <Button variant="ghost" size="icon" onClick={() => removeMaterial(m.id)}><X className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        {!editingLesson && <p className="text-center text-sm text-muted-foreground py-4">Salve a aula primeiro para gerenciar materiais</p>}
                    </TabsContent>

                    {/* ─── LINKS ─── */}
                    <TabsContent value="links" className="border rounded-lg p-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <Input value={newLink.title} onChange={e => setNewLink(p => ({ ...p, title: e.target.value }))} placeholder="Título do link" />
                            <Input value={newLink.url} onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))} placeholder="URL" />
                            <div className="flex gap-2">
                                <Input value={newLink.description} onChange={e => setNewLink(p => ({ ...p, description: e.target.value }))} placeholder="Descrição" className="flex-1" />
                                <Button onClick={addLink} disabled={!newLink.title || !editingLesson}><Plus className="h-4 w-4" /></Button>
                            </div>
                        </div>
                        {editingLesson?.links.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhum link adicionado</p>}
                        {editingLesson?.links.map(l => (
                            <div key={l.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                                <ExternalLink className="h-4 w-4 text-blue-500" />
                                <div className="flex-1 min-w-0"><p className="text-sm font-medium">{l.title}</p><p className="text-xs text-muted-foreground truncate">{l.url}</p></div>
                                <Button variant="ghost" size="icon" onClick={() => removeLink(l.id)}><X className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        {!editingLesson && <p className="text-center text-sm text-muted-foreground py-4">Salve a aula primeiro para gerenciar links</p>}
                    </TabsContent>

                    {/* ─── PERGUNTAS ─── */}
                    <TabsContent value="perguntas" className="border rounded-lg p-6 space-y-4">
                        {!editingLesson && <p className="text-center text-sm text-muted-foreground py-8">Salve a aula primeiro para ver perguntas</p>}
                        {editingLesson?.questions.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma pergunta dos alunos</p>}
                        {editingLesson?.questions.map(q => (
                            <div key={q.id} className="rounded-lg border p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium">{q.author} <span className="text-muted-foreground font-normal">• {q.date}</span></p>
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
                                        <Button size="sm" onClick={() => replyToQuestion(q.id)} disabled={!replyText[q.id]?.trim()}>Responder</Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </TabsContent>
                </Tabs>
            </div>
        );
    }

    return null;
}
