'use client';

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    ChevronLeft, ChevronRight, Play, Star, Clock, BookOpen, Send, MessageCircle, FileText,
    ExternalLink, Download, HelpCircle, CheckCircle2, Bell, Loader2
} from 'lucide-react';
import logoCircular from '@/assets/logo-circular.png';
import { useTrail, useAnswerQuestion, useCreateQuestion } from '@/hooks/useUniversity';
import { Button } from '@/components/ui/button';

/* ══════════════════════════════════════════════════
   TAB TYPES
   ══════════════════════════════════════════════════ */

type TabId = 'descricao' | 'materiais' | 'links' | 'perguntas';

const tabLabels: Record<TabId, string> = {
    descricao: 'Descrição',
    materiais: 'Materiais',
    links: 'Links',
    perguntas: 'Perguntas',
};

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */

export default function TrailDetailPage() {
    const navigate = useNavigate();
    const { trailId } = useParams<{ trailId: string }>();
    const { user } = useAuth();

    // Fetch trail data
    const { data: trail, isLoading, error } = useTrail(trailId || '');
    const createQuestion = useCreateQuestion();

    const [currentLessonIdx, setCurrentLessonIdx] = useState(0);
    const [activeTab, setActiveTab] = useState<TabId>('descricao');
    const [questionText, setQuestionText] = useState('');
    const [favorited, setFavorited] = useState<Record<string, boolean>>({});

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#141414] flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-red-600 animate-spin" />
            </div>
        );
    }

    if (error || !trail) {
        return (
            <div className="min-h-screen bg-[#141414] text-white flex flex-col items-center justify-center gap-4">
                <p className="text-red-500">Trilha não encontrada ou erro ao carregar.</p>
                <Button onClick={() => navigate('/admin/universidade')}>Voltar</Button>
            </div>
        );
    }

    // Sort lessons by order
    const sortedLessons = (trail.lessons || []).sort((a, b) => a.order - b.order);
    const currentLesson = sortedLessons[currentLessonIdx];

    // Mock progress calculation (since we don't have user_progress linked yet in hook fully)
    const completedCount = 0; // trail.lessons?.filter(l => l.completed).length || 0;
    const progressPercent = sortedLessons.length > 0 ? Math.round((completedCount / sortedLessons.length) * 100) : 0;

    const goToLesson = (idx: number) => {
        if (idx >= 0 && idx < sortedLessons.length) {
            setCurrentLessonIdx(idx);
            setActiveTab('descricao');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const toggleFavorite = (lessonId: string) => {
        setFavorited(prev => ({ ...prev, [lessonId]: !prev[lessonId] }));
    };

    const handleSendQuestion = async () => {
        if (!questionText.trim() || !currentLesson) return;
        try {
            await createQuestion.mutateAsync({
                lesson_id: currentLesson.id,
                user_id: user?.id || 'anon', // Should come from auth context
                text: questionText,
                author_name: user?.email?.split('@')[0] || 'Aluno',
                author_avatar: (user?.email?.[0] || 'A').toUpperCase()
            });
            setQuestionText('');
        } catch (err) {
            alert('Erro ao enviar pergunta');
        }
    }

    const fileIcon = (type: string) => {
        switch (type) {
            case 'pdf': return '📄';
            case 'doc': return '📝';
            case 'xls': return '📊';
            case 'img': return '🖼️';
            default: return '📎';
        }
    };

    return (
        <div className="min-h-screen bg-[#141414] text-white" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            {/* Hide scrollbar */}
            <style>{`
                *::-webkit-scrollbar { display: none; }
                * { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* ═══════════════════════════════════════════
                 TOP NAVBAR
                ═══════════════════════════════════════════ */}
            <nav className="sticky top-0 z-50 flex items-center justify-between h-14 px-4 md:px-8 bg-[#141414] border-b border-[#2a2a2a]">
                <div className="flex items-center gap-4">
                    <img src={logoCircular} alt="" className="h-7 w-7" />
                    <span className="text-sm font-semibold text-white/90 hidden sm:block">Dashboard</span>
                </div>
                <div className="flex items-center gap-4">
                    <button className="text-white/60 hover:text-white transition-colors">
                        <Bell className="h-5 w-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-white/80 hidden sm:block">{user?.email?.split('@')[0] || 'Usuário'}</span>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold">
                            {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                    </div>
                </div>
            </nav>

            {/* ═══════════════════════════════════════════
                 BACK BUTTON
                ═══════════════════════════════════════════ */}
            <div className="px-4 md:px-8 pt-5 pb-2">
                <button
                    onClick={() => navigate('/admin/universidade')}
                    className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors group"
                >
                    <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                    Voltar para cursos
                </button>
            </div>

            {/* ═══════════════════════════════════════════
                 TRAIL HEADER
                ═══════════════════════════════════════════ */}
            <div className="px-4 md:px-8 pb-4">
                <h1 className="text-xl md:text-2xl font-bold text-white mb-2">{trail.title}</h1>
                <div className="flex items-center gap-4 text-sm text-white/60">
                    <span className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {sortedLessons.length} aulas
                    </span>
                    {/* Placeholder total duration or sum logic */}
                    <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {sortedLessons.reduce((acc, curr) => acc + (parseInt(curr.duration) || 0), 0)} min
                    </span>
                    <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-[#333] rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${progressPercent}%`, backgroundColor: trail.color }}
                            />
                        </div>
                        <span>{progressPercent}% completo</span>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════
                 MAIN LAYOUT — Video + Sidebar
                ═══════════════════════════════════════════ */}
            <div className="flex flex-col lg:flex-row gap-0 px-4 md:px-8">
                {/* ─── VIDEO PLAYER ─── */}
                <div className="flex-1 min-w-0">
                    {/* Conditional rendering if no lessons */}
                    {sortedLessons.length === 0 ? (
                        <div className="aspect-video bg-black rounded-lg flex items-center justify-center text-white/30 flex-col gap-2">
                            <BookOpen className="h-12 w-12" />
                            <p>Esta trilha ainda não possui aulas.</p>
                        </div>
                    ) : (
                        <>
                            <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                                {currentLesson?.video_url ? (
                                    <iframe
                                        src={currentLesson.video_url}
                                        title={currentLesson.title}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="absolute inset-0 w-full h-full"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-white/30 bg-gray-900">
                                        <div className="text-center">
                                            <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            <p>Vídeo não disponível</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* "Assistir no YouTube" label */}
                            {currentLesson?.video_url && (
                                <div className="flex items-center gap-2 mt-2 mb-4">
                                    <span className="text-xs text-white/40">Assistir no</span>
                                    <a
                                        href={currentLesson.video_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-xs font-semibold text-white/60 flex items-center gap-1 hover:text-[#ff0000] transition-colors"
                                    >
                                        <svg viewBox="0 0 90 20" className="h-4 fill-current">
                                            <text x="0" y="15" fontSize="14" fontWeight="bold">▶ YouTube</text>
                                        </svg>
                                    </a>
                                </div>
                            )}
                        </>
                    )}

                    {/* ─── LESSON TITLE ─── */}
                    {currentLesson && (
                        <div className="mb-4 mt-4">
                            <h2 className="text-lg font-bold text-white">{currentLesson.title}</h2>
                            <p className="text-sm text-white/50">{currentLesson.subtitle}</p>
                        </div>
                    )}

                    {/* ─── NAVIGATION: Aula Anterior / Próxima Aula ─── */}
                    {sortedLessons.length > 0 && (
                        <div className="flex items-center justify-between mb-6">
                            <button
                                onClick={() => goToLesson(currentLessonIdx - 1)}
                                disabled={currentLessonIdx === 0}
                                className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Aula Anterior
                            </button>
                            <button
                                onClick={() => goToLesson(currentLessonIdx + 1)}
                                disabled={currentLessonIdx === sortedLessons.length - 1}
                                className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Próxima Aula
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* ═══════════════════════════════════════════
                         TABS — Descrição | Materiais | Links | Perguntas
                        ═══════════════════════════════════════════ */}
                    {currentLesson && (
                        <>
                            <div className="flex rounded-xl overflow-hidden mb-6 border border-[#2a2a2a]">
                                {(['descricao', 'materiais', 'links', 'perguntas'] as TabId[]).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200
                                        ${activeTab === tab
                                                ? 'bg-[#2dd4bf] text-[#141414] font-bold'
                                                : 'bg-[#1e1e1e] text-white/60 hover:text-white hover:bg-[#252525]'
                                            }`}
                                    >
                                        {tabLabels[tab]}
                                    </button>
                                ))}
                            </div>

                            {/* ════ TAB CONTENT ════ */}
                            <div className="min-h-[200px] mb-12">
                                {/* ─── DESCRIÇÃO ─── */}
                                {activeTab === 'descricao' && (
                                    <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                                        <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">
                                            {currentLesson.description || 'Sem descrição para esta aula.'}
                                        </p>
                                    </div>
                                )}

                                {/* ─── MATERIAIS ─── */}
                                {activeTab === 'materiais' && (
                                    <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                                        {(!currentLesson.materials || currentLesson.materials.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-white/30">
                                                <FileText className="h-10 w-10 mb-3" />
                                                <p className="text-sm">Nenhum material disponível para esta aula.</p>
                                            </div>
                                        ) : (
                                            currentLesson.materials.map(mat => (
                                                <a
                                                    key={mat.id}
                                                    href={mat.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    download
                                                    className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#3a3a3a] hover:bg-[#252525] transition-all text-left group"
                                                >
                                                    <span className="text-2xl">{fileIcon(mat.type)}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white/90 truncate">{mat.name}</p>
                                                        <p className="text-xs text-white/40">{mat.size}</p>
                                                    </div>
                                                    <Download className="h-4 w-4 text-white/30 group-hover:text-[#2dd4bf] transition-colors" />
                                                </a>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* ─── LINKS ─── */}
                                {activeTab === 'links' && (
                                    <div className="space-y-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                                        {(!currentLesson.links || currentLesson.links.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-white/30">
                                                <ExternalLink className="h-10 w-10 mb-3" />
                                                <p className="text-sm">Nenhum link disponível para esta aula.</p>
                                            </div>
                                        ) : (
                                            currentLesson.links.map(link => (
                                                <a
                                                    key={link.id}
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3.5 rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#2dd4bf]/40 hover:bg-[#252525] transition-all group"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-[#2dd4bf]/10 flex items-center justify-center flex-shrink-0">
                                                        <ExternalLink className="h-4 w-4 text-[#2dd4bf]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-white/90 truncate">{link.title}</p>
                                                        <p className="text-xs text-white/40">{link.description}</p>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-[#2dd4bf] transition-colors" />
                                                </a>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* ─── PERGUNTAS ─── */}
                                {activeTab === 'perguntas' && (
                                    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
                                        {/* Input de pergunta */}
                                        <div>
                                            <textarea
                                                value={questionText}
                                                onChange={e => setQuestionText(e.target.value)}
                                                placeholder="Tem alguma dúvida? Pergunte aqui..."
                                                className="w-full bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl p-4 text-sm text-white/90 placeholder:text-white/30 resize-none focus:outline-none focus:border-[#2dd4bf]/50 transition-colors"
                                                rows={3}
                                            />
                                            <button
                                                onClick={handleSendQuestion}
                                                disabled={!questionText.trim() || createQuestion.isPending}
                                                className="mt-2 flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all
                                                bg-[#2dd4bf]/10 text-[#2dd4bf] border border-[#2dd4bf]/30
                                                hover:bg-[#2dd4bf]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <Send className="h-4 w-4" />
                                                {createQuestion.isPending ? 'Enviando...' : 'Enviar Pergunta'}
                                            </button>
                                        </div>

                                        {/* Lista de perguntas */}
                                        {(!currentLesson.questions || currentLesson.questions.length === 0) ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-white/30">
                                                <MessageCircle className="h-10 w-10 mb-3" />
                                                <p className="text-sm">Nenhuma pergunta ainda. Seja o primeiro a perguntar!</p>
                                            </div>
                                        ) : (
                                            currentLesson.questions.map(q => (
                                                <div key={q.id} className="rounded-xl bg-[#1e1e1e] border border-[#2a2a2a] p-4">
                                                    {/* Author */}
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                                                            {q.author_avatar}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-white/90">{q.author_name || 'Aluno'}</p>
                                                            <p className="text-[11px] text-white/40">{new Date(q.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-white/70 mb-3">{q.text}</p>

                                                    {/* Replies */}
                                                    {q.answered && q.reply && (
                                                        <div className="ml-6 pl-4 border-l-2 border-[#2dd4bf]/30 mt-3">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className="w-6 h-6 rounded-full bg-[#2dd4bf]/20 flex items-center justify-center">
                                                                    <HelpCircle className="h-3 w-3 text-[#2dd4bf]" />
                                                                </div>
                                                                <span className="text-xs font-semibold text-[#2dd4bf]">Suporte Grau</span>
                                                            </div>
                                                            <p className="text-sm text-white/60">{q.reply}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* ══════════════════════════════════════════════════
                     SIDEBAR — Conteúdo do curso
                    ══════════════════════════════════════════════════ */}
                <aside className="lg:w-[340px] lg:flex-shrink-0 lg:ml-6 mb-8 lg:mb-0">
                    <div className="bg-[#1e1e1e] rounded-xl border border-[#2a2a2a] overflow-hidden sticky top-16">
                        {/* Sidebar header */}
                        <div className="p-4 border-b border-[#2a2a2a]">
                            <h3 className="text-sm font-bold text-white">Conteúdo do curso</h3>
                            <p className="text-xs text-white/40 mt-0.5">{sortedLessons.length} aulas disponíveis</p>
                        </div>

                        {/* Lesson list */}
                        <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                            {sortedLessons.length === 0 && (
                                <p className="p-4 text-xs text-white/30 text-center">Nenhuma aula cadastrada</p>
                            )}
                            {sortedLessons.map((lesson, idx) => {
                                const isActive = idx === currentLessonIdx;
                                return (
                                    <button
                                        key={lesson.id}
                                        onClick={() => goToLesson(idx)}
                                        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all duration-200 border-l-4
                                            ${isActive
                                                ? 'bg-[#2dd4bf]/15 border-l-[#2dd4bf]'
                                                : 'border-l-transparent hover:bg-white/[0.04]'
                                            }`}
                                    >
                                        {/* Number */}
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
                                            ${isActive
                                                ? 'bg-[#2dd4bf] text-[#141414]'
                                                : lesson.completed
                                                    ? 'bg-[#2dd4bf]/20 text-[#2dd4bf]'
                                                    : 'bg-[#333] text-white/50'
                                            }`}
                                        >
                                            {lesson.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-white/70'}`}>
                                                {lesson.title}
                                            </p>
                                            <p className="text-[11px] text-white/40 flex items-center gap-1 mt-0.5">
                                                <Clock className="h-3 w-3" /> {lesson.duration}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            {isActive && (
                                                <div className="w-7 h-7 rounded-full bg-[#2dd4bf] flex items-center justify-center">
                                                    <Play className="h-3 w-3 text-[#141414] fill-[#141414] ml-0.5" />
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleFavorite(lesson.id); }}
                                                className="text-white/30 hover:text-[#ffc107] transition-colors"
                                            >
                                                <Star className={`h-4 w-4 ${favorited[lesson.id] ? 'fill-[#ffc107] text-[#ffc107]' : ''}`} />
                                            </button>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Footer */}
            <footer className="border-t border-[#2a2a2a] px-8 py-6 mt-8">
                <p className="text-xs text-[#808080]/60 text-center">
                    © 2026 Universidade no Grau — Açaí no Grau Franchising
                </p>
            </footer>
        </div>
    );
}
