import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    Play,
    Info,
    ChevronLeft,
    ChevronRight,
    Search,
    Bell,
    Clock,
    CheckCircle2,
    BookOpen,
    GraduationCap,
    TrendingUp,
    Plus,
    ThumbsUp,
    ChevronDown,
    Volume2,
    VolumeX
} from 'lucide-react';
import logoCircular from '@/assets/logo-circular.png';
import heroBg from '@/assets/hero-universidade.png';

/* Trail thumbnail images */
import imgAberturaLoja from '@/assets/trails/abertura-loja.png';
import imgFechamentoCaixa from '@/assets/trails/fechamento-caixa.png';
import imgAtendimento from '@/assets/trails/atendimento.png';
import imgUsoPdv from '@/assets/trails/uso-pdv.png';
import imgEstoque from '@/assets/trails/estoque.png';
import imgHigiene from '@/assets/trails/higiene.png';
import imgMontagemAcai from '@/assets/trails/montagem-acai.png';
import imgDelivery from '@/assets/trails/delivery.png';
import imgMarketing from '@/assets/trails/marketing.png';
import imgRedesSociais from '@/assets/trails/redes-sociais.png';
import imgUpselling from '@/assets/trails/upselling.png';
import imgCmv from '@/assets/trails/cmv.png';
import imgFluxoCaixa from '@/assets/trails/fluxo-caixa.png';
import imgLideranca from '@/assets/trails/lideranca.png';
import imgCardapioSazonal from '@/assets/trails/cardapio-sazonal.png';

/* ══════════════════════════════════════════════════
   MOCK DATA — Trilhas de treinamento
   ══════════════════════════════════════════════════ */

interface Trail {
    id: string;
    title: string;
    description: string;
    lessons: number;
    duration: string;
    progress: number;
    required: boolean;
    thumbnail: string;
    level: string;
    category: string;
    color: string;
    match?: number;
}

const allTrails: Trail[] = [
    { id: '1', title: 'Abertura da Loja', description: 'Procedimentos diários de abertura, checklist e rotinas matinais.', lessons: 8, duration: '45min', progress: 100, required: true, thumbnail: imgAberturaLoja, level: 'Básico', category: 'onboarding', color: '#e50914', match: 98 },
    { id: '2', title: 'Fechamento de Caixa', description: 'Rotina de encerramento do dia: conferência, sangria e relatório.', lessons: 6, duration: '30min', progress: 60, required: true, thumbnail: imgFechamentoCaixa, level: 'Básico', category: 'onboarding', color: '#e87c03', match: 95 },
    { id: '3', title: 'Padrão de Atendimento', description: 'Como encantar cada cliente com o padrão Açaí no Grau.', lessons: 10, duration: '1h', progress: 25, required: true, thumbnail: imgAtendimento, level: 'Básico', category: 'onboarding', color: '#46d369', match: 97 },
    { id: '4', title: 'Uso do PDV', description: 'Domine o sistema de vendas, atalhos e funcionalidades avançadas.', lessons: 12, duration: '1h30', progress: 0, required: true, thumbnail: imgUsoPdv, level: 'Básico', category: 'onboarding', color: '#2196f3' },
    { id: '5', title: 'Gestão de Estoque', description: 'Controle de insumos, prevenção de perdas e inventário rotativo.', lessons: 8, duration: '50min', progress: 0, required: false, thumbnail: imgEstoque, level: 'Intermediário', category: 'operacao', color: '#9c27b0' },
    { id: '6', title: 'Higiene e BPF', description: 'Boas Práticas de Fabricação, controle de temperatura e limpeza.', lessons: 15, duration: '2h', progress: 40, required: true, thumbnail: imgHigiene, level: 'Básico', category: 'operacao', color: '#00bcd4', match: 96 },
    { id: '7', title: 'Montagem de Açaí', description: 'Padrão de montagem das receitas, proporções e apresentação perfeita.', lessons: 20, duration: '2h30', progress: 0, required: false, thumbnail: imgMontagemAcai, level: 'Básico', category: 'operacao', color: '#8D42DD', match: 99 },
    { id: '8', title: 'Delivery Perfeito', description: 'Embalagem, tempo de entrega e controle de qualidade no delivery.', lessons: 7, duration: '40min', progress: 0, required: false, thumbnail: imgDelivery, level: 'Intermediário', category: 'operacao', color: '#ff5722' },
    { id: '9', title: 'Marketing Local', description: 'Estratégias de marketing para a sua região e comunidade.', lessons: 10, duration: '1h20', progress: 0, required: false, thumbnail: imgMarketing, level: 'Avançado', category: 'marketing', color: '#f44336' },
    { id: '10', title: 'Redes Sociais', description: 'Conteúdo que engaja e vende: Instagram, TikTok e WhatsApp.', lessons: 12, duration: '1h40', progress: 15, required: false, thumbnail: imgRedesSociais, level: 'Intermediário', category: 'marketing', color: '#e91e63', match: 92 },
    { id: '11', title: 'Upselling & Cross', description: 'Técnicas para aumentar o ticket médio com naturalidade.', lessons: 6, duration: '35min', progress: 0, required: false, thumbnail: imgUpselling, level: 'Avançado', category: 'marketing', color: '#ff9800' },
    { id: '12', title: 'CMV e Precificação', description: 'Entenda seus custos, margens e forme preços competitivos.', lessons: 8, duration: '1h', progress: 0, required: false, thumbnail: imgCmv, level: 'Avançado', category: 'financeiro', color: '#4caf50' },
    { id: '13', title: 'Fluxo de Caixa', description: 'Controle financeiro diário, projeções e saúde do negócio.', lessons: 6, duration: '45min', progress: 0, required: false, thumbnail: imgFluxoCaixa, level: 'Intermediário', category: 'financeiro', color: '#03a9f4' },
    { id: '14', title: 'Liderança no Grau', description: 'Gestão de equipe, escala, motivação e cultura da franquia.', lessons: 9, duration: '1h10', progress: 0, required: false, thumbnail: imgLideranca, level: 'Avançado', category: 'gestao', color: '#ffc107' },
    { id: '15', title: 'Cardápio Sazonal', description: 'Criação de produtos temporários, sazonalidade e inovação.', lessons: 5, duration: '25min', progress: 0, required: false, thumbnail: imgCardapioSazonal, level: 'Intermediário', category: 'marketing', color: '#e040fb' },
];

const sections = [
    { title: 'Populares na Rede', trails: ['1', '6', '7', '3', '10', '9'] },
    { title: 'Continuar Assistindo', trails: ['2', '3', '6', '10'] },
    { title: 'Em Alta', trails: ['9', '11', '14', '8', '5', '12'] },
    { title: 'Conteúdos Originais', trails: ['1', '2', '3', '4', '6'], isOriginals: true },
    { title: 'Top 10 da Semana', trails: ['7', '1', '9', '3', '6', '11', '2', '14', '12', '8'], isTop10: true },
    { title: 'Assistir Novamente', trails: ['1'] },
    { title: 'Minha Lista', trails: ['5', '12', '13', '14', '15'] },
];

const heroTrail = allTrails.find(t => t.id === '7')!;

/* ══════════════════════════════════════════════════
   SCROLLABLE ROW — carrossel horizontal Netflix
   ══════════════════════════════════════════════════ */

function ScrollableRow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(true);

    const checkScroll = useCallback(() => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeft(scrollLeft > 10);
        setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
    }, []);

    useEffect(() => {
        checkScroll();
        const el = scrollRef.current;
        el?.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);
        return () => {
            el?.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [checkScroll]);

    const scroll = (dir: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const amount = scrollRef.current.clientWidth * 0.85;
        scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    };

    return (
        <div className={`group/row relative ${className}`}>
            {/* Left arrow */}
            {showLeft && (
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-0 bottom-0 w-14 z-30 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 cursor-pointer"
                    style={{ background: 'linear-gradient(to right, rgba(20,20,20,0.95), transparent)' }}
                >
                    <ChevronLeft className="h-10 w-10 text-white drop-shadow-lg" />
                </button>
            )}

            <div
                ref={scrollRef}
                className="flex gap-1 overflow-x-auto scroll-smooth px-[60px]"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
                <style>{`.flex::-webkit-scrollbar { display: none; }`}</style>
                {children}
            </div>

            {/* Right arrow */}
            {showRight && (
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-0 bottom-0 w-14 z-30 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-300 cursor-pointer"
                    style={{ background: 'linear-gradient(to left, rgba(20,20,20,0.95), transparent)' }}
                >
                    <ChevronRight className="h-10 w-10 text-white drop-shadow-lg" />
                </button>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════
   TRAIL CARD — card horizontal padrão Netflix
   ══════════════════════════════════════════════════ */

function TrailCard({ trail, large = false }: { trail: Trail; large?: boolean }) {
    const [hovered, setHovered] = useState(false);
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`/admin/universidade/${trail.id}`)}
            className="relative flex-shrink-0 cursor-pointer group/card"
            style={{
                width: large ? 'clamp(140px, 13vw, 210px)' : 'clamp(140px, 16.5vw, 260px)',
                transition: 'transform 300ms cubic-bezier(.4,0,.2,1), z-index 0ms',
                transform: hovered ? 'scale(1.45)' : 'scale(1)',
                zIndex: hovered ? 40 : 1,
                transformOrigin: 'center center',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Card image area */}
            <div
                className="relative overflow-hidden"
                style={{
                    aspectRatio: large ? '2/3' : '16/9',
                    borderRadius: hovered ? '4px 4px 0 0' : '4px',
                    background: `linear-gradient(145deg, ${trail.color}55, ${trail.color}18, #181818)`,
                }}
            >
                {/* Trail thumbnail image */}
                <img
                    src={trail.thumbnail}
                    alt={trail.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: 'brightness(0.85)' }}
                />

                {/* Bottom gradient (title) */}
                {!large && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 pt-8">
                        <p className="text-[12px] font-bold text-white leading-tight line-clamp-2 drop-shadow-md">{trail.title}</p>
                    </div>
                )}

                {/* Progress bar — Netflix red */}
                {trail.progress > 0 && trail.progress < 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#333]">
                        <div className="h-full bg-[#e50914] transition-all" style={{ width: `${trail.progress}%` }} />
                    </div>
                )}

                {/* Completed */}
                {trail.progress === 100 && (
                    <div className="absolute top-2 right-2">
                        <CheckCircle2 className="h-5 w-5 text-[#46d369] drop-shadow-md" />
                    </div>
                )}

                {/* Required badge on originals */}
                {trail.required && large && (
                    <div className="absolute top-0 left-0">
                        <div className="bg-[#e50914] text-white text-[8px] font-bold px-2 py-1 uppercase tracking-widest"
                            style={{ borderRadius: '4px 0 4px 0' }}>
                            Obrigatório
                        </div>
                    </div>
                )}

                {/* Netflix N badge for originals */}
                {large && (
                    <div className="absolute top-2 right-2">
                        <div className="flex items-center gap-0.5">
                            <GraduationCap className="h-3.5 w-3.5 text-[#e50914]" />
                            <span className="text-[8px] text-white/80 font-bold uppercase tracking-wider">Original</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Title for originals (below card) */}
            {large && (
                <div className="mt-2 px-0.5">
                    <p className="text-[13px] font-bold text-white/90 leading-tight line-clamp-1">{trail.title}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{trail.lessons} aulas • {trail.duration}</p>
                </div>
            )}

            {/* ─── HOVER EXPAND CARD ─── */}
            {hovered && (
                <div
                    className="absolute left-0 right-0 top-full -mt-0.5 z-50 animate-in fade-in-0 slide-in-from-top-1 duration-200"
                    style={{ background: '#181818', borderRadius: '0 0 6px 6px', boxShadow: '0 14px 36px rgba(0,0,0,0.8)' }}
                >
                    <div className="p-3">
                        {/* Action buttons row */}
                        <div className="flex items-center gap-1.5 mb-2.5">
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/admin/universidade/${trail.id}`); }} className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-colors">
                                <Play className="h-4 w-4 text-black fill-black ml-0.5" />
                            </button>
                            <button className="w-8 h-8 rounded-full border-2 border-[#6d6d6e] flex items-center justify-center hover:border-white transition-colors group/btn">
                                <Plus className="h-4 w-4 text-[#bcbcbc] group-hover/btn:text-white" />
                            </button>
                            <button className="w-8 h-8 rounded-full border-2 border-[#6d6d6e] flex items-center justify-center hover:border-white transition-colors group/btn">
                                <ThumbsUp className="h-3.5 w-3.5 text-[#bcbcbc] group-hover/btn:text-white" />
                            </button>
                            <button className="w-8 h-8 rounded-full border-2 border-[#6d6d6e] flex items-center justify-center hover:border-white transition-colors group/btn ml-auto">
                                <ChevronDown className="h-4 w-4 text-[#bcbcbc] group-hover/btn:text-white" />
                            </button>
                        </div>

                        {/* Meta info */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {trail.progress > 0 && (
                                <span className="text-[#46d369] text-[12px] font-bold">{trail.progress}% concluído</span>
                            )}
                            {trail.match && (
                                <span className="text-[#46d369] text-[12px] font-bold">{trail.match}% relevante</span>
                            )}
                            <span className="border border-[#808080] text-[10px] text-[#bcbcbc] px-1.5 py-[1px]">{trail.level}</span>
                            {trail.required && (
                                <span className="border border-[#808080] text-[10px] text-[#bcbcbc] px-1.5 py-[1px]">OBRIGATÓRIO</span>
                            )}
                        </div>

                        {/* Details */}
                        <div className="flex items-center gap-2 text-[11px] text-[#bcbcbc]">
                            <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" /> {trail.lessons} aulas
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {trail.duration}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════
   TOP 10 CARD — número gigante + mini card
   ══════════════════════════════════════════════════ */

function Top10Card({ trail, rank }: { trail: Trail; rank: number }) {
    const [hovered, setHovered] = useState(false);
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`/admin/universidade/${trail.id}`)}
            className="relative flex-shrink-0 flex items-end cursor-pointer"
            style={{
                width: 'clamp(160px, 12vw, 200px)',
                height: '200px',
                transition: 'transform 300ms cubic-bezier(.4,0,.2,1)',
                transform: hovered ? 'scale(1.08)' : 'scale(1)',
                zIndex: hovered ? 30 : 1,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Giant number */}
            <span
                className="absolute left-[-8px] bottom-[-6px] leading-none select-none pointer-events-none"
                style={{
                    fontSize: 'clamp(140px, 11vw, 180px)',
                    fontWeight: 900,
                    fontFamily: "'Arial Black', 'Impact', sans-serif",
                    color: '#141414',
                    WebkitTextStroke: '3px #595959',
                    paintOrder: 'stroke fill',
                    letterSpacing: '-0.08em',
                    zIndex: 1,
                    textShadow: '4px 4px 20px rgba(0,0,0,0.5)',
                }}
            >
                {rank}
            </span>

            {/* Card thumbnail */}
            <div
                className="relative overflow-hidden ml-auto z-10"
                style={{
                    width: 'clamp(95px, 7.5vw, 120px)',
                    height: '170px',
                    borderRadius: '4px',
                    background: `linear-gradient(145deg, ${trail.color}55, ${trail.color}18, #181818)`,
                    boxShadow: hovered ? '0 8px 25px rgba(0,0,0,0.6)' : 'none',
                    transition: 'box-shadow 300ms',
                }}
            >
                <img
                    src={trail.thumbnail}
                    alt={trail.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{ filter: 'brightness(0.85)' }}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 pt-8">
                    <p className="text-[10px] font-bold text-white leading-tight line-clamp-2">{trail.title}</p>
                </div>
                {trail.progress > 0 && trail.progress < 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#333]">
                        <div className="h-full bg-[#e50914]" style={{ width: `${trail.progress}%` }} />
                    </div>
                )}
            </div>
        </div>
    );
}

/* ══════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════ */

export default function UniversidadePage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchOpen, setSearchOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [muted, setMuted] = useState(true);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 80);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-[#141414] text-white" style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            {/* Hide scrollbar globally */}
            <style>{`
                *::-webkit-scrollbar { display: none; }
                * { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
                .fade-up { animation: fadeUp 0.6s ease-out forwards; }
            `}</style>

            {/* ═══════════════════════════════════════════
                NAVBAR — Netflix-style transparent → solid
               ═══════════════════════════════════════════ */}
            <nav
                className="fixed top-0 left-0 right-0 z-[100] transition-all duration-500"
                style={{
                    background: scrolled
                        ? 'rgb(20,20,20)'
                        : 'linear-gradient(180deg, rgba(0,0,0,0.71) 10%, rgba(0,0,0,0) 100%)',
                    height: scrolled ? '56px' : '68px',
                }}
            >
                <div className="flex items-center justify-between h-full px-[4%] max-w-[100%]">
                    {/* Left — Logo + Nav */}
                    <div className="flex items-center gap-6">
                        {/* Logo */}
                        <button onClick={() => navigate('/admin/hub')} className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1.5">
                                <img src={logoCircular} alt="" className="h-7 w-7" />
                                <span className="text-[#e50914] font-black text-xl tracking-tighter hidden sm:block" style={{ letterSpacing: '-0.03em' }}>
                                    UNIVERSIDADE
                                </span>
                            </div>
                        </button>

                        {/* Nav links */}
                        <div className="hidden md:flex items-center gap-5 text-[13px]">
                            <button onClick={() => navigate('/admin/hub')} className="text-[#e5e5e5] hover:text-[#b3b3b3] transition-colors duration-300">
                                Início
                            </button>
                            <span className="text-white font-semibold">Trilhas</span>
                            <span className="text-[#e5e5e5] hover:text-[#b3b3b3] cursor-pointer transition-colors duration-300">Obrigatórios</span>
                            <span className="text-[#e5e5e5] hover:text-[#b3b3b3] cursor-pointer transition-colors duration-300">Novidades</span>
                            <span className="text-[#e5e5e5] hover:text-[#b3b3b3] cursor-pointer transition-colors duration-300">Minha Lista</span>
                        </div>
                    </div>

                    {/* Right — Search, Notifications, Profile */}
                    <div className="flex items-center gap-4">
                        {/* Search */}
                        {searchOpen ? (
                            <div className="flex items-center bg-[#141414]/90 border border-white/60 px-2.5">
                                <Search className="h-4 w-4 text-white" />
                                <input
                                    autoFocus
                                    className="bg-transparent text-[14px] text-white placeholder:text-[#808080] px-2.5 py-1.5 w-[200px] outline-none"
                                    placeholder="Títulos, trilhas e mais"
                                    onBlur={() => setSearchOpen(false)}
                                />
                            </div>
                        ) : (
                            <button onClick={() => setSearchOpen(true)} className="text-white hover:text-[#b3b3b3] transition-colors">
                                <Search className="h-5 w-5" />
                            </button>
                        )}

                        {/* Notifications bell */}
                        <button className="relative text-white hover:text-[#b3b3b3] transition-colors">
                            <Bell className="h-5 w-5" />
                            <span className="absolute -top-0.5 -right-0.5 w-[7px] h-[7px] rounded-full bg-[#e50914]" />
                        </button>

                        {/* Profile avatar */}
                        <div className="flex items-center gap-1.5 cursor-pointer group/profile">
                            <div className="w-8 h-8 rounded-[4px] overflow-hidden" style={{ background: 'linear-gradient(135deg, #8D42DD, #e50914)' }}>
                                <div className="w-full h-full flex items-center justify-center">
                                    <GraduationCap className="h-5 w-5 text-white" />
                                </div>
                            </div>
                            <ChevronDown className="h-3.5 w-3.5 text-white transition-transform duration-200 group-hover/profile:rotate-180" />
                        </div>
                    </div>
                </div>
            </nav>

            {/* ═══════════════════════════════════════════
                HERO BILLBOARD — full viewport, cinematic
               ═══════════════════════════════════════════ */}
            <section className="relative w-full" style={{ height: 'clamp(500px, 56.25vw, 800px)' }}>
                {/* Background Image */}
                <div className="absolute inset-0">
                    <img
                        src={heroBg}
                        alt=""
                        className="w-full h-full object-cover"
                        style={{ objectPosition: 'center 20%' }}
                    />
                </div>

                {/* Vignette overlays — exactly like Netflix */}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(77deg, rgba(0,0,0,0.6) 0%, transparent 85%)' }} />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, #141414 0%, rgba(20,20,20,0) 50%, rgba(20,20,20,0.05) 100%)' }} />
                <div className="absolute bottom-0 left-0 right-0 h-[15vw]" style={{ background: 'linear-gradient(0deg, #141414, transparent)' }} />

                {/* Content */}
                <div className="absolute bottom-[30%] left-[4%] z-10 max-w-[36%] min-w-[260px] fade-up">
                    {/* Series badge */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-1.5">
                            <GraduationCap className="h-4 w-4 text-[#e50914]" />
                            <span className="text-[13px] font-medium text-[#bcbcbc] tracking-wide uppercase">T R I L H A &nbsp; D E S T A Q U E</span>
                        </div>
                    </div>

                    {/* Title — giant, bold */}
                    <h1
                        className="mb-2 leading-[0.95] tracking-tight"
                        style={{
                            fontSize: 'clamp(2rem, 3.8vw, 4rem)',
                            fontWeight: 900,
                            color: 'white',
                            textShadow: '2px 2px 12px rgba(0,0,0,0.8)',
                        }}
                    >
                        {heroTrail.title.toUpperCase().split('').join('')}
                    </h1>

                    {/* Rank badge — Netflix style */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center">
                            <img src={logoCircular} alt="" className="h-[22px] w-[22px]" />
                            <span className="text-[13px] font-bold text-white ml-1.5">Top 4 na Rede</span>
                        </div>
                    </div>

                    {/* Description */}
                    <p
                        className="text-[#d2d2d2] leading-relaxed mb-5 line-clamp-3"
                        style={{
                            fontSize: 'clamp(0.85rem, 1.2vw, 1.1rem)',
                            textShadow: '1px 1px 6px rgba(0,0,0,0.5)',
                        }}
                    >
                        {heroTrail.description} Aprenda o padrão de montagem das receitas da franquia com {heroTrail.lessons} aulas práticas em vídeo.
                    </p>

                    {/* Action buttons */}
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-7 py-2 bg-white text-[#141414] rounded-[4px] font-bold text-base hover:bg-white/75 transition-all duration-200 active:scale-95">
                            <Play className="h-6 w-6 fill-[#141414]" />
                            Assistir
                        </button>
                        <button className="flex items-center gap-2 px-7 py-2 bg-[rgba(109,109,110,0.7)] text-white rounded-[4px] font-bold text-base hover:bg-[rgba(109,109,110,0.4)] transition-all duration-200 backdrop-blur-sm active:scale-95">
                            <Info className="h-6 w-6" />
                            Mais Informações
                        </button>
                    </div>
                </div>

                {/* Maturity + Mute button on bottom right */}
                <div className="absolute bottom-[30%] right-[4%] flex items-center gap-3 z-10">
                    <button
                        onClick={() => setMuted(!muted)}
                        className="w-9 h-9 rounded-full border-2 border-white/40 flex items-center justify-center hover:border-white/80 transition-colors"
                    >
                        {muted ? <VolumeX className="h-4 w-4 text-white/70" /> : <Volume2 className="h-4 w-4 text-white/70" />}
                    </button>
                    <div className="bg-[#333]/60 border-l-[3px] border-white/40 text-white/90 text-[14px] px-3.5 py-1 font-medium">
                        {heroTrail.level}
                    </div>
                </div>
            </section>

            {/* ═══════════════════════════════════════════
                CONTENT ROWS — Netflix scroll sections
               ═══════════════════════════════════════════ */}
            <div className="relative z-20 pb-16 space-y-10" style={{ marginTop: '-6vw' }}>
                {sections.map((section, idx) => {
                    const sectionTrails = section.trails
                        .map(id => allTrails.find(t => t.id === id)!)
                        .filter(Boolean);

                    if (sectionTrails.length === 0) return null;

                    return (
                        <section key={idx}>
                            {/* Section title — Netflix style */}
                            <h2 className="text-[16px] md:text-[20px] font-bold text-[#e5e5e5] px-[60px] mb-1 flex items-center gap-2 cursor-pointer group/title hover:text-white transition-colors">
                                {section.title}
                                <span className="flex items-center gap-0.5 opacity-0 group-hover/title:opacity-100 -translate-x-3 group-hover/title:translate-x-0 transition-all duration-300">
                                    <span className="text-[12px] text-[#54b9c5] font-medium">Ver tudo</span>
                                    <ChevronRight className="h-3 w-3 text-[#54b9c5]" />
                                </span>
                            </h2>

                            {/* Cards */}
                            {section.isTop10 ? (
                                <ScrollableRow>
                                    {sectionTrails.slice(0, 10).map((trail, i) => (
                                        <Top10Card key={trail.id} trail={trail} rank={i + 1} />
                                    ))}
                                </ScrollableRow>
                            ) : (
                                <ScrollableRow>
                                    {sectionTrails.map(trail => (
                                        <TrailCard key={trail.id} trail={trail} large={section.isOriginals} />
                                    ))}
                                </ScrollableRow>
                            )}
                        </section>
                    );
                })}
            </div>

            {/* ═══════════════════════════════════════════
                FOOTER — Netflix-style
               ═══════════════════════════════════════════ */}
            <footer className="px-[60px] pt-10 pb-8 text-[#808080]">
                {/* Social icons */}
                <div className="flex items-center gap-5 mb-7">
                    <a href="#" className="hover:text-white transition-colors">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" /></svg>
                    </a>
                    <a href="#" className="hover:text-white transition-colors">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                    </a>
                    <a href="#" className="hover:text-white transition-colors">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                    </a>
                    <a href="#" className="hover:text-white transition-colors">
                        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M12.53.02C13.84 0 15.14.01 16.44.06c1.75.07 3.5.32 5.06 1.2A5.55 5.55 0 0 1 23.7 3.5c.72 1.28.97 2.61 1.09 4.06.1 1.12.15 2.25.2 3.37v2.14c-.05 1.12-.1 2.25-.2 3.37-.12 1.45-.37 2.78-1.09 4.06a5.55 5.55 0 0 1-2.2 2.24c-1.56.88-3.31 1.13-5.06 1.2-1.3.05-2.6.06-3.91.06h-2.06c-1.31 0-2.61-.01-3.91-.06-1.75-.07-3.5-.32-5.06-1.2A5.55 5.55 0 0 1 .3 20.5c-.72-1.28-.97-2.61-1.09-4.06C-.89 15.32-.94 14.19-.99 13.07v-2.14c.05-1.12.1-2.25.2-3.37C-.67 6.11-.42 4.78.3 3.5A5.55 5.55 0 0 1 2.5 1.26C4.06.38 5.81.13 7.56.06 8.86.01 10.16 0 11.47.02h1.06zm-1.13 6.42c-.27 0-.55.06-.8.17l-.17.1c-.13.1-.24.22-.33.35-.1.15-.17.31-.22.49l-.04.2v9.5l.04.2c.05.18.12.34.22.49.09.13.2.25.33.35l.17.1c.25.11.53.17.8.17.21 0 .42-.04.61-.11l.14-.07 6.82-4.75.12-.1c.13-.12.24-.25.33-.4.08-.14.14-.3.17-.46l.02-.17c0-.16-.02-.32-.06-.47-.05-.18-.13-.35-.23-.5l-.08-.1-.14-.15-.12-.1-6.82-4.75-.14-.07c-.19-.07-.4-.11-.61-.11z" /></svg>
                    </a>
                </div>

                {/* Links grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[13px] mb-7">
                    <div className="space-y-2.5">
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Todas as Trilhas</p>
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Central de Ajuda</p>
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Termos de Uso</p>
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Preferências</p>
                    </div>
                    <div className="space-y-2.5">
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Meu Progresso</p>
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Certificados</p>
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Informações da Conta</p>
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Configurações</p>
                    </div>
                    <div className="space-y-2.5">
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Treinamentos Obrigatórios</p>
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Lançamentos</p>
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Contato Suporte</p>
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Privacidade</p>
                    </div>
                    <div className="space-y-2.5">
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Sobre a Franquia</p>
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Políticas de Privacidade</p>
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Avisos de Cookies</p>
                        <p className="hover:text-[#e5e5e5] cursor-pointer transition-colors underline underline-offset-2 decoration-transparent hover:decoration-[#e5e5e5]">Corporativo</p>
                    </div>
                </div>

                {/* Service code button */}
                <button className="border border-[#808080] text-[13px] text-[#808080] px-2.5 py-1 hover:text-white hover:border-white transition-colors mb-6">
                    Código de Serviço
                </button>

                {/* Copyright */}
                <p className="text-[12px] text-[#808080]/60">
                    © 2026 Universidade no Grau — Açaí no Grau Franchising
                </p>
            </footer>
        </div>
    );
}
