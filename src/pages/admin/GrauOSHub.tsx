'use client';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import {
    Bell,
    LogOut,
    Users,
    ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoCircular from '@/assets/logo-circular.png';
import heroImage from '@/assets/noGrauOS.png';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useHubNotifications } from '@/hooks/useHubNotifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { clsx } from 'clsx';

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
    },
    {
        id: 'pedidos',
        title: 'Pedidos de Insumos',
        subtitle: 'Abasteça sua loja com produtos e materiais',
        path: '/admin/orders/catalog',
        color: '#7C3AED',          // brand purple
        hoverColor: '#6D28D9',
    },
    {
        id: 'gestao-franquia',
        title: 'Gestão de Franquia',
        subtitle: 'Administração da rede e catálogo mestre',
        path: '/admin/orders/management',
        color: '#6D28D9',          // deeper purple
        hoverColor: '#5B21B6',
        isMasterOnly: true
    },
];

/* ────────────────────── component ─────────────────────── */

export default function GrauOSHub() {
    const navigate = useNavigate();
    const { signOut, user } = useAuth();
    const { currentStore } = useStore();
    const isMobile = useIsMobile();
    const [hoveredModule, setHoveredModule] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const { data: notifications } = useHubNotifications();

    const isMasterAdmin = user?.email === 'agenciadamkt@gmail.com';

    // Filter modules based on permission
    const visibleModules = modules.filter(mod => !mod.isMasterOnly || isMasterAdmin);

    if (!isMounted) return null;

    return (
        <div className="min-h-screen bg-[#F3F1F5] font-[Inter,sans-serif] overflow-hidden">
            {/* ─── Top bar ─── */}
            <nav className="relative z-20 flex items-center justify-between px-6 py-4 bg-transparent backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    {currentStore && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-white shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.8)]" />
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                {currentStore.name}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative text-gray-400 hover:text-gray-600"
                    >
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={signOut}
                        className="text-gray-400 hover:text-red-500"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </nav>

            {/* ─── Main split layout ─── */}
            <div className="relative z-10 flex flex-col lg:flex-row min-h-[calc(100vh-72px)] px-6 sm:px-10 lg:px-16 gap-10">

                {/* ─── LEFT COLUMN ─── */}
                <div className="flex-1 flex flex-col justify-center max-w-[580px] py-6 lg:py-10">
                    {/* Header / Brand */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-[#6D28D9] flex items-start">
                                Grau<span className="relative">OS<sup className="absolute -right-[0.5em] top-[0.1em] text-[0.4em]">®</sup></span>
                            </h1>
                            <img
                                src={logoCircular}
                                alt="Açaí no Grau"
                                className="h-10 w-10 lg:h-12 lg:w-12 mt-2"
                            />
                        </div>
                        <p className="text-lg lg:text-xl font-medium italic text-gray-500/80">
                            Sistema Operacional da Franquia
                        </p>
                    </motion.div>

                    {/* ─── Module grid ─── */}
                    <div className="grid grid-cols-2 gap-4 lg:gap-5 mb-10">
                        {visibleModules.map((mod, i) => (
                            <motion.button
                                key={mod.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => navigate(mod.path)}
                                onMouseEnter={() => setHoveredModule(mod.id)}
                                onMouseLeave={() => setHoveredModule(null)}
                                className={clsx(
                                    "group relative rounded-2xl p-6 text-left text-white transition-all duration-300",
                                    "shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
                                )}
                                style={{
                                    backgroundColor: hoveredModule === mod.id ? mod.hoverColor : mod.color,
                                    transform: hoveredModule === mod.id ? 'translateY(-2px)' : 'translateY(0)',
                                }}
                            >
                                <h3 className="text-base lg:text-lg font-bold mb-1.5 leading-tight">{mod.title}</h3>
                                <p className="text-[10px] lg:text-[11px] text-white/80 leading-snug font-medium pr-6 max-w-[180px]">
                                    {mod.subtitle}
                                </p>
                                <ChevronRight className="absolute bottom-6 right-4 h-4 w-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                            </motion.button>
                        ))}
                    </div>

                    {/* ─── Community bar ─── */}
                    <motion.button
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate('/admin/comunidade')}
                        className="group w-full flex items-center gap-4 p-5 rounded-3xl bg-white/70 backdrop-blur-sm border border-white shadow-[0_4px_25px_rgba(0,0,0,0.03)] hover:bg-white/90 transition-all duration-300 text-left"
                    >
                        <div className="p-3 rounded-xl bg-[#F06292] shadow-sm">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-700">Comunidade Grau</h3>
                            <p className="text-xs text-gray-400 font-medium truncate">Feed, desafios, cases de sucesso e ranking geral</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                    </motion.button>
                </div>

                {/* ─── RIGHT COLUMN ─── */}
                <div className={clsx(
                    "hidden lg:flex flex-1 items-center justify-center py-10 pr-6",
                    "animate-in fade-in slide-in-from-right-10 duration-1000"
                )}>
                    <div className="relative w-full aspect-[4/5] max-w-[650px] rounded-[3rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.15)] ring-1 ring-white/20">
                        <img
                            src={heroImage}
                            alt="Açaí no Grau Ambient"
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
