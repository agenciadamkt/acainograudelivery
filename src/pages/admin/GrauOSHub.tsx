'use client';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import {
    LayoutDashboard,
    GraduationCap,
    BarChart3,
    Bot,
    Users,
    Bell,
    LogOut,
    Store,
    ChevronRight,
    Clock,
    AlertCircle,
    CheckCircle2,
    Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoCircular from '@/assets/logo-circular.png';
import heroImage from '@/assets/noGrauOS.png';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useHubNotifications } from '@/hooks/useHubNotifications';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

/* ───────────────────────── data ───────────────────────── */

const modules = [
    {
        id: 'operacao',
        title: 'Operação',
        subtitle: 'PDV, Delivery, Estoque e Financeiro',
        path: '/admin/dashboard',
        color: '#D4A438',          // warm gold
        hoverColor: '#c09530',
    },
    {
        id: 'universidade',
        title: 'Universidade no Grau',
        subtitle: 'Capacite sua equipe com conteúdos exclusivos da franquia.',
        path: '/admin/universidade',
        color: '#2AABB3',          // teal
        hoverColor: '#239aa1',
    },
    {
        id: 'performance',
        title: 'Performance',
        subtitle: 'Métricas e ranking da unidade',
        path: '/admin/performance',
        color: '#2AABB3',          // teal
        hoverColor: '#239aa1',
    },
    {
        id: 'assistente',
        title: 'Assistente IA',
        subtitle: 'GrauBot — seu consultor 24/7',
        path: '/admin/assistente',
        color: '#2AABB3',          // teal
        hoverColor: '#239aa1',
    },
    {
        id: 'financeiro',
        title: 'Financeiro no Grau',
        subtitle: 'Controle Distribuidora',
        path: '/admin/financeiro',
        color: '#10B981', // emerald
        hoverColor: '#059669',
        adminOnly: true, // Custom flag to handle visibility logic in render
    },
];

/* ────────────────────── component ─────────────────────── */

export default function GrauOSHub() {
    const navigate = useNavigate();
    const { signOut } = useAuth();
    const { currentStore } = useStore();
    const isMobile = useIsMobile();
    const [hoveredModule, setHoveredModule] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);
    const { user: authUser } = useAuth(); // Get user from context if available, or we can fetch. 
    // Looking at `useAuth` usage in imports: `import { useAuth } from '@/contexts/AuthContext';`
    // and usage: `const { signOut } = useAuth();`
    // effectively `useAuth` returns the context. Let's assume it has `user`.
    // If not, we can use the `useQuery` pattern from `ComunidadePage`.

    // Copied pattern from ComunidadePage for consistency and safety
    const { data: user } = useQuery({ // Using react-query to ensure we have the user and it's cached/managed
        queryKey: ['check-admin-hub'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        },
        initialData: authUser as any // Fallback/Initial
    });

    const isAdmin = user?.email === 'agenciadamkt@gmail.com' || user?.email === 'acainograuwagner@gmail.com';

    // Fetch dynamic notifications
    const { data: notifications, isLoading: loadingNotifications } = useHubNotifications();
    if (!isMounted) return null;

    return (
        <div className="min-h-screen bg-[#EDE8F0] font-[Inter,sans-serif] overflow-hidden">
            {/* ─── Top bar (subtle) ─── */}
            <nav className="relative z-20 flex items-center justify-between px-6 py-3 bg-white/40 backdrop-blur-md border-b border-white/60">
                <div className="flex items-center gap-2">
                    {currentStore && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-gray-200/60 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,.5)]" />
                            <span className="text-xs font-medium text-gray-600">{currentStore.name}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative text-gray-500 hover:text-gray-700 hover:bg-white/60"
                    >
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={signOut}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </nav>

            {/* ─── Main split layout ─── */}
            <div className="relative z-10 flex flex-col lg:flex-row min-h-[calc(100vh-56px)]">
                {/* ─── LEFT COLUMN ─── */}
                <div className="flex-1 flex flex-col justify-between px-6 sm:px-10 lg:px-14 py-8 lg:py-12 lg:max-w-[58%]">
                    {/* Header / Brand */}
                    <motion.div
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="mb-8 lg:mb-10"
                    >
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight text-gray-800 leading-none">
                                Grau<span className="text-[#7B5EA7]">OS</span>
                            </h1>
                            <img
                                src={logoCircular}
                                alt="Açaí no Grau"
                                className="h-10 w-10 sm:h-12 sm:w-12 -mt-1"
                            />
                        </div>
                        <p className="text-base sm:text-lg font-medium italic text-gray-500/80 tracking-wide">
                            Sistema Operacional da Franquia
                        </p>
                    </motion.div>

                    {/* ─── Module grid (2×2) ─── */}
                    <div className="grid grid-cols-2 gap-4 sm:gap-5 mb-8 lg:mb-10">
                        {modules.map((mod, i) => {
                            // Hide admin-only modules if not admin
                            // Assuming 'currentStore' logic or 'user' email check is needed here
                            // For now, let's use the 'isAdmin' check we can derive or prop drill
                            // Actually, let's check user email from auth context or similar?
                            // 'useAuth' gives signOut. 'useHubNotifications' might help or we need a new check.
                            // Let's stick to the existing pattern: if we don't have user in context, we might need to fetch it or use a simple heuristic.
                            // START_ADJUSTMENT: We need to know if user is admin. 
                            // In ComunidadePage we checked `user?.email === 'agenciadamkt@gmail.com'`.
                            // Let's add that check here.

                            // (Implementation detail: I need to add the user check hook first, but `replace_file_content` is local. 
                            // I will add the logic inside the component body in a separate step if needed, or inline it here if I can accesses user).
                            // `useAuth` returns { user, ... } usually. Let's check `useAuth` definition or just use supabase directly?
                            // `useAuth` comes from `@/contexts/AuthContext`.

                            // Let's assume we can get user from useAuth() or we fetch it.
                            // Getting user from `useAuth`...
                            // const { user } = useAuth(); // Need to verify if useAuth exposes user.

                            // If mod.adminOnly and !isAdmin, return null.
                            if (mod.adminOnly && !isAdmin) return null;

                            return (
                                <motion.button
                                    key={mod.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                                    onClick={() => navigate(mod.path)}
                                    onMouseEnter={() => setHoveredModule(mod.id)}
                                    onMouseLeave={() => setHoveredModule(null)}
                                    className="group relative rounded-2xl p-5 sm:p-6 text-left text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-400"
                                    style={{
                                        backgroundColor: hoveredModule === mod.id ? mod.hoverColor : mod.color,
                                        boxShadow: hoveredModule === mod.id
                                            ? `0 12px 32px ${mod.color}55`
                                            : `0 6px 20px ${mod.color}30`,
                                        transform: hoveredModule === mod.id ? 'translateY(-2px)' : 'translateY(0)',
                                    }}
                                >
                                    {/* title */}
                                    <h3 className="text-sm sm:text-base font-bold mb-1 leading-tight">{mod.title}</h3>
                                    {/* subtitle */}
                                    <p className="text-[11px] sm:text-xs text-white/80 leading-snug">{mod.subtitle}</p>

                                    {/* arrow hint */}
                                    <ChevronRight className="absolute bottom-4 right-4 h-4 w-4 text-white/40 group-hover:text-white/80 group-hover:translate-x-0.5 transition-all" />
                                </motion.button>
                            )
                        })}
                    </div>

                    {/* ─── Community bar ─── */}
                    <motion.button
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        onClick={() => navigate('/admin/comunidade')}
                        className="group w-full flex items-center gap-4 p-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:bg-white/90 transition-all duration-300 text-left mb-6"
                    >
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-400 shadow-md">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-700">Comunidade Grau</h3>
                            <p className="text-xs text-gray-400 truncate">Feed, desafios, cases de sucesso e ranking geral</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                    </motion.button>


                    {/* ─── Notifications ─── */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="rounded-2xl bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-[0_4px_20px_rgba(0,0,0,0.04)] overflow-hidden"
                    >
                        <div className="space-y-0">
                            {loadingNotifications ? (
                                <div className="p-4 text-center text-gray-400 text-sm">Carregando avisos...</div>
                            ) : notifications && notifications.length > 0 ? (
                                notifications.map((n, idx) => {
                                    const isWarning = n.type === 'warning';
                                    return (
                                        <div
                                            key={n.id}
                                            onClick={() => n.link && navigate(n.link)}
                                            className={clsx(
                                                'flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-white/60 transition-colors',
                                                'border-l-4',
                                                isWarning ? 'border-l-amber-400' : 'border-l-emerald-400',
                                                idx !== notifications.length - 1 && 'border-b border-gray-100',
                                            )}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {isWarning
                                                    ? <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                                    : <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                                }
                                                <span className="text-sm text-gray-600 truncate">{n.text}</span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0 ml-4 text-gray-400">
                                                <span className="text-xs whitespace-nowrap">| {n.time}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="p-4 text-center text-gray-400 text-sm flex items-center justify-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Tudo certo por aqui!
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* ─── RIGHT COLUMN (hero image) ─── */}
                <motion.div
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="hidden lg:flex flex-1 items-center justify-center p-8 lg:p-12 relative"
                >
                    {/* Subtle background glow behind the image */}
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple-300/15 blur-3xl" />
                        <div className="absolute top-[30%] right-[10%] w-[200px] h-[200px] rounded-full bg-cyan-300/10 blur-3xl" />
                    </div>

                    <img
                        src={heroImage}
                        alt="Açaí no Grau — produto da marca"
                        className="relative z-10 w-full max-w-[520px] h-auto object-contain drop-shadow-2xl rounded-3xl"
                    />
                </motion.div>
            </div>

            {/* ─── Mobile hero image (below content) ─── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="lg:hidden flex justify-center px-6 pb-8"
            >
                <img
                    src={heroImage}
                    alt="Açaí no Grau — produto da marca"
                    className="w-full max-w-xs h-auto object-contain drop-shadow-xl rounded-2xl"
                />
            </motion.div>

            {/* ─── Footer ─── */}
            <footer className="relative z-10 border-t border-gray-300/30 bg-white/30 backdrop-blur-md px-6 py-4">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                        <img src={logoCircular} alt="" className="h-4 w-4 opacity-40" />
                        <span>GrauOS v1.0 — Açaí no Grau</span>
                    </div>
                    <span>© {new Date().getFullYear()} Todos os direitos reservados</span>
                </div>
            </footer>
        </div >
    );
}
