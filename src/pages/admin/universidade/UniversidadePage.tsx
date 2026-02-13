'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
    Play, Info, ChevronLeft, ChevronRight, Search, Bell, Clock,
    CheckCircle2, BookOpen, GraduationCap, TrendingUp, Plus, ThumbsUp,
    ChevronDown, Volume2, VolumeX, Loader2
} from 'lucide-react';
import logoCircular from '@/assets/logo-circular.png';
import heroBg from '@/assets/hero-universidade.png';
import { useTrails, Trail } from '@/hooks/useUniversity';
import { Button } from '@/components/ui/button';

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
        setShowLeft(scrollLeft > 0);
        setShowRight(scrollLeft + clientWidth < scrollWidth - 1);
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            el.addEventListener('scroll', checkScroll);
            // Check initially
            checkScroll();
            // Check on resize
            window.addEventListener('resize', checkScroll);
            return () => {
                el.removeEventListener('scroll', checkScroll);
                window.removeEventListener('resize', checkScroll);
            };
        }
    }, [checkScroll]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { clientWidth } = scrollRef.current;
            const scrollAmount = clientWidth * 0.8;
            scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className={`relative group/row ${className}`}>
            {showLeft && (
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-0 bottom-0 z-40 w-12 bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"
                >
                    <ChevronLeft className="text-white h-8 w-8" />
                </button>
            )}

            <div
                ref={scrollRef}
                className="flex overflow-x-auto gap-2 px-4 md:px-12 pb-8 scrollbar-hide snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {children}
            </div>

            {showRight && (
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-0 bottom-0 z-40 w-12 bg-black/50 hover:bg-black/70 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity duration-300"
                >
                    <ChevronRight className="text-white h-8 w-8" />
                </button>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════════════
   CARD COMPONENT
   ══════════════════════════════════════════════════ */
function TrailCard({ trail, large = false }: { trail: Trail; large?: boolean }) {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout>();

    // Clear timeout on unmount or hover change
    useEffect(() => () => clearTimeout(timeoutRef.current), []);

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            setHovered(true);
        }, 400); // Delay hover expansion
    };

    const handleMouseLeave = () => {
        clearTimeout(timeoutRef.current);
        setHovered(false);
    };

    // Calculate progress (mock for now if undefined)
    const progress = 0; // trail.progress || 0;
    const lessonsCount = trail.lessons_count || 0;
    // Duration is not directly available on list (could sum lessons or use field), using mock default
    const duration = '30min';

    return (
        <div
            onClick={() => navigate(`/admin/universidade/${trail.id}`)}
            className="relative flex-shrink-0 cursor-pointer group/card snap-start"
            style={{
                width: large ? 'clamp(140px, 13vw, 210px)' : 'clamp(140px, 16.5vw, 260px)',
                height: large ? 'clamp(210px, 19.5vw, 315px)' : 'auto',
                transition: 'transform 300ms cubic-bezier(.4,0,.2,1), z-index 0ms',
                transform: hovered ? 'scale(1.45)' : 'scale(1)',
                zIndex: hovered ? 40 : 1,
                transformOrigin: 'center center',
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Base Card (Visible always) */}
            <div
                className="relative overflow-hidden transition-all duration-300 shadow-lg"
                style={{
                    aspectRatio: large ? '2/3' : '16/9',
                    borderRadius: hovered ? '4px 4px 0 0' : '4px',
                    background: `linear-gradient(145deg, ${trail.color}55, ${trail.color}18, #181818)`,
                }}
            >
                {/* Thumbnail Image */}
                {trail.thumbnail ? (
                    <img
                        src={trail.thumbnail}
                        alt={trail.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ filter: 'brightness(0.85)' }}
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl">
                        🎬
                    </div>
                )}

                {/* Title Overlay (only if not hovered) */}
                {!hovered && (
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                        <h3 className="text-white font-bold text-sm md:text-base leading-tight drop-shadow-md">
                            {trail.title}
                        </h3>
                        {/* Progress bar (mini) */}
                        {progress > 0 && (
                            <div className="mt-2 h-0.5 bg-gray-600 rounded-full overflow-hidden w-full">
                                <div className="h-full bg-red-600" style={{ width: `${progress}%` }} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* HOVER DETAILS (Expanded Card) */}
            {hovered && (
                <div
                    className="absolute top-full left-0 right-0 bg-[#181818] rounded-b-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    style={{ zIndex: 50 }}
                >
                    <div className="p-3 space-y-3">
                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/universidade/${trail.id}`); }}
                                className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:bg-gray-200 transition-colors"
                            >
                                <Play className="h-4 w-4 text-black fill-black ml-0.5" />
                            </button>
                            <button className="w-8 h-8 rounded-full border-2 border-gray-400 flex items-center justify-center hover:border-white hover:bg-white/10 transition-colors text-white">
                                <Plus className="h-4 w-4" />
                            </button>
                            <button className="w-8 h-8 rounded-full border-2 border-gray-400 flex items-center justify-center hover:border-white hover:bg-white/10 transition-colors text-white ml-auto">
                                <ChevronDown className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Metadata */}
                        <div>
                            <h4 className="font-bold text-white text-sm mb-1">{trail.title}</h4>
                            <div className="flex items-center gap-2 text-[10px] font-semibold text-white/70">
                                <span className="text-green-400">98% relevante</span>
                                <span className="border border-white/40 px-1 rounded text-[9px] uppercase">{trail.level}</span>
                                <span>{duration}</span>
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="flex items-center gap-2 text-[10px] text-white/50">
                            <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {lessonsCount} aulas</span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span>{trail.category}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Top10Card({ trail, rank }: { trail: Trail; rank: number }) {
    const navigate = useNavigate();
    const [hovered, setHovered] = useState(false);

    return (
        <div
            onClick={() => navigate(`/admin/universidade/${trail.id}`)}
            className="relative flex-shrink-0 flex items-end cursor-pointer snap-start"
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
            {/* Rank Number (Hollow style) */}
            <div className="absolute left-[-10px] bottom-[-20px] text-[10rem] font-black leading-none z-10 select-none"
                style={{
                    color: '#141414', // Match background for hollow effect
                    WebkitTextStroke: '2px #a3a3a3',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                }}>
                {rank}
            </div>

            {/* Image Card */}
            <div className="relative z-0 h-full w-[70%] ml-auto rounded-md overflow-hidden shadow-lg border border-white/10">
                {trail.thumbnail ? (
                    <img
                        src={trail.thumbnail}
                        alt={trail.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center text-4xl">🏆</div>
                )}
            </div>
        </div>
    );
}


/* ══════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ══════════════════════════════════════════════════ */
export default function UniversidadePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isMuted, setIsMuted] = useState(true);
    const [scrolled, setScrolled] = useState(false);

    // Fetch trails from Supabase
    const { data: trails, isLoading, error } = useTrails();

    // Scroll listener
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 0);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#141414] flex items-center justify-center">
                <Loader2 className="h-10 w-10 text-red-600 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#141414] text-white flex flex-col items-center justify-center gap-4">
                <p className="text-red-500">Erro ao carregar conteúdo.</p>
                <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
            </div>
        );
    }

    const availableTrails = trails || [];
    const heroTrail = availableTrails.find(t => t.active) || availableTrails[0];

    // Categorize trails for rows
    const onboardingTrails = availableTrails.filter(t => t.category === 'onboarding');
    const operationTrails = availableTrails.filter(t => t.category === 'operacao');
    const marketingTrails = availableTrails.filter(t => t.category === 'marketing');
    const financeTrails = availableTrails.filter(t => t.category === 'financeiro');
    const managementTrails = availableTrails.filter(t => t.category === 'gestao' || t.category === 'lideranca');

    // Top 10 (mock order or by some metric)
    const top10Trails = [...availableTrails].slice(0, 10);

    return (
        <div className="min-h-screen bg-[#141414] text-white overflow-x-hidden" style={{ fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif" }}>

            {/* ════ Navbar ════ */}
            <nav className={`fixed top-0 w-full z-50 transition-colors duration-500 px-4 md:px-12 h-16 flex items-center justify-between ${scrolled ? 'bg-[#141414]' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
                <div className="flex items-center gap-8">
                    <img src={logoCircular} alt="Logo" className="h-8 md:h-10 w-auto cursor-pointer" onClick={() => navigate('/hub')} />
                    <ul className="hidden md:flex items-center gap-5 text-sm font-medium text-white/80">
                        <li className="text-white font-bold cursor-pointer">Início</li>
                        <li className="hover:text-white/60 transition-colors cursor-pointer">Séries</li>
                        <li className="hover:text-white/60 transition-colors cursor-pointer">Filmes</li>
                        <li className="hover:text-white/60 transition-colors cursor-pointer">Minha Lista</li>
                    </ul>
                </div>

                <div className="flex items-center gap-5 text-white/90">
                    <Search className="w-5 h-5 cursor-pointer hover:text-white" />
                    <Bell className="w-5 h-5 cursor-pointer hover:text-white" />
                    <div className="flex items-center gap-2 cursor-pointer group">
                        <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-xs font-bold">
                            {user?.email?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                    </div>
                </div>
            </nav>

            {/* ════ Hero Section ════ */}
            {heroTrail && (
                <div className="relative w-full h-[85vh] md:h-[95vh]">
                    {/* Background Image / Video */}
                    <div className="absolute inset-0">
                        {/* Fallback to image if no video */}
                        <img
                            src={heroBg}
                            alt="Hero Background"
                            className="w-full h-full object-cover opacity-60"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/40 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
                    </div>

                    {/* Hero Content */}
                    <div className="absolute inset-0 flex flex-col justify-center px-4 md:px-12 pt-12 md:pt-0 max-w-2xl space-y-4 md:space-y-6">
                        <div className="flex items-center gap-2 mb-2 animate-in fade-in slide-in-from-left-4 duration-700">
                            <img src={logoCircular} className="w-6 h-6 md:w-8 md:h-8" />
                            <span className="text-xs md:text-sm font-bold tracking-[4px] uppercase text-white/70">Original Açaí no Grau</span>
                        </div>

                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-none drop-shadow-lg animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
                            {heroTrail.title}
                        </h1>

                        <div className="flex items-center gap-3 text-sm font-semibold text-green-400 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                            <span>98% relevante</span>
                            <span className="text-white/60">{heroTrail.lessons_count || 0} aulas</span>
                            <span className="border border-white/40 px-2 py-0.5 rounded text-xs text-white uppercase">{heroTrail.level}</span>
                        </div>

                        <p className="text-sm md:text-lg text-white/90 font-medium drop-shadow-md line-clamp-3 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-400">
                            {heroTrail.description}
                        </p>

                        <div className="flex flex-row gap-3 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                            <button
                                onClick={() => navigate(`/admin/universidade/${heroTrail.id}`)}
                                className="bg-white text-black px-6 md:px-8 py-2 md:py-3 rounded flex items-center gap-2 font-bold hover:bg-white/90 transition-colors"
                            >
                                <Play className="w-5 h-5 md:w-6 md:h-6 fill-black" />
                                Assistir
                            </button>
                            <button className="bg-white/20 backdrop-blur-sm text-white px-6 md:px-8 py-2 md:py-3 rounded flex items-center gap-2 font-bold hover:bg-white/30 transition-colors">
                                <Info className="w-5 h-5 md:w-6 md:h-6" />
                                Mais Informações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ════ Content Rows ════ */}
            <div className="relative z-10 -mt-32 md:-mt-48 pb-20 space-y-8 md:space-y-12">

                {/* 1. Onboarding */}
                {onboardingTrails.length > 0 && (
                    <div className="animate-in fade-in-0 slide-in-from-bottom-8 duration-700 delay-300">
                        <h2 className="text-lg md:text-xl font-bold text-white mb-3 px-4 md:px-12 hover:text-[#e50914] cursor-pointer transition-colors inline-flex items-center gap-2 group">
                            Onboarding Inicial <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#e50914]" />
                        </h2>
                        <ScrollableRow>
                            {onboardingTrails.map(trail => <TrailCard key={trail.id} trail={trail} />)}
                        </ScrollableRow>
                    </div>
                )}

                {/* 2. Top 10 */}
                {top10Trails.length > 0 && (
                    <div className="animate-in fade-in-0 slide-in-from-bottom-8 duration-700 delay-500">
                        <h2 className="text-lg md:text-xl font-bold text-white mb-3 px-4 md:px-12">Top 10 no Brasil hoje</h2>
                        <ScrollableRow>
                            {top10Trails.map((trail, idx) => <Top10Card key={trail.id} trail={trail} rank={idx + 1} />)}
                        </ScrollableRow>
                    </div>
                )}

                {/* 3. Operação */}
                {operationTrails.length > 0 && (
                    <div className="animate-in fade-in-0 slide-in-from-bottom-8 duration-700 delay-700">
                        <h2 className="text-lg md:text-xl font-bold text-white mb-3 px-4 md:px-12">Excelência Operacional</h2>
                        <ScrollableRow>
                            {operationTrails.map(trail => <TrailCard key={trail.id} trail={trail} />)}
                        </ScrollableRow>
                    </div>
                )}

                {/* 4. Marketing & Vendas */}
                {marketingTrails.length > 0 && (
                    <div className="animate-in fade-in-0 slide-in-from-bottom-8 duration-700">
                        <h2 className="text-lg md:text-xl font-bold text-white mb-3 px-4 md:px-12">Marketing & Vendas</h2>
                        <ScrollableRow>
                            {marketingTrails.map(trail => <TrailCard key={trail.id} trail={trail} />)}
                        </ScrollableRow>
                    </div>
                )}

                {/* 5. Todas as Trilhas (Fallback row) */}
                {availableTrails.length > 0 && (
                    <div className="animate-in fade-in-0 slide-in-from-bottom-8 duration-700">
                        <h2 className="text-lg md:text-xl font-bold text-white mb-3 px-4 md:px-12">Catálogo Completo</h2>
                        <ScrollableRow>
                            {availableTrails.map(trail => <TrailCard key={trail.id} trail={trail} />)}
                        </ScrollableRow>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="px-4 md:px-12 py-10 max-w-5xl mx-auto text-white/40 text-sm">
                <div className="flex items-center gap-4 mb-4 text-xl text-white/50">
                    <i className="fab fa-facebook-f hover:text-white cursor-pointer transition-colors"></i>
                    <i className="fab fa-instagram hover:text-white cursor-pointer transition-colors"></i>
                    <i className="fab fa-twitter hover:text-white cursor-pointer transition-colors"></i>
                    <i className="fab fa-youtube hover:text-white cursor-pointer transition-colors"></i>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <span className="hover:underline cursor-pointer">Início</span>
                    <span className="hover:underline cursor-pointer">Termos de Uso</span>
                    <span className="hover:underline cursor-pointer">Privacidade</span>
                    <span className="hover:underline cursor-pointer">Central de Ajuda</span>
                </div>
                <div className="border border-white/40 inline-block px-2 py-1 mb-4 text-xs hover:border-white hover:text-white cursor-pointer transition-colors">
                    Código de Serviço
                </div>
                <p>© 2026 Universidade Açaí no Grau Inc.</p>
            </footer>
        </div>
    );
}
