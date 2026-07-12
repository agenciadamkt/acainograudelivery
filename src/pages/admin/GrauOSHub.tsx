'use client';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { setActiveModule, type ModuleId } from '@/config/adminModules';

// Mapeia o id do cartão do Hub para o módulo de navegação correspondente.
const HUB_ID_TO_MODULE: Record<string, ModuleId> = {
  operacao: 'operacao', estoque: 'estoque', universidade: 'universidade',
  performance: 'performance', assistente: 'assistente', financeiro: 'financeiro',
  pedidos: 'pedidos', frota: 'frota', crm: 'crm', caf: 'caf', agenda: 'agenda',
  'gestao-franquia': 'pedidos',
};
import {
    Bell,
    LogOut,
    Users,
    ChevronRight,
    Activity,
    GraduationCap,
    TrendingUp,
    Bot,
    CircleDollarSign,
    ShoppingCart,
    Bike,
    Globe,
    BookOpen,
    Package,
    MessageSquare,
    Headphones,
    CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import logoCircular from '@/assets/logo-circular.png';
import logoGrauOS from '@/assets/logo-grauos.png';
import heroImage from '@/assets/noGrauOS.png';
import { ManualProvider, useManual } from '@/contexts/ManualContext';
import { OperationalManualDrawer } from '@/components/admin/OperationalManualDrawer';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useHubNotifications } from '@/hooks/useHubNotifications';
import { useIsMobile } from '@/hooks/use-mobile';
import { clsx } from 'clsx';

/* ───────────────────────── data ───────────────────────── */

const modules = [
    {
        id: 'operacao',
        title: 'Operação PDV',
        subtitle: 'Vendas, Mesas e Caixa',
        path: '/admin/dashboard',
        color: '#D4A438',
        hoverColor: '#c09530',
        icon: Activity,
    },
    {
        id: 'estoque',
        title: 'Estoque & Operações',
        subtitle: 'Gestão completa de insumos',
        path: '/admin/stock/dashboard',
        color: '#8b5cf6',
        hoverColor: '#7c3aed',
        icon: Package,
    },
    {
        id: 'universidade',
        title: 'Universidade no Grau',
        subtitle: 'Capacitação exclusiva',
        path: '/admin/universidade',
        color: '#2AABB3',
        hoverColor: '#239aa1',
        icon: GraduationCap,
    },
    {
        id: 'performance',
        title: 'Performance',
        subtitle: 'Métricas e ranking',
        path: '/admin/performance',
        color: '#2AABB3',
        hoverColor: '#239aa1',
        icon: TrendingUp,
    },
    {
        id: 'assistente',
        title: 'Assistente IA',
        subtitle: 'GrauBot 24/7',
        path: '/admin/assistente',
        color: '#2AABB3',
        hoverColor: '#239aa1',
        icon: Bot,
    },
    {
        id: 'financeiro',
        title: 'Financeiro no Grau',
        subtitle: 'Controle Distribuidora',
        path: '/admin/financeiro',
        color: '#10B981',
        hoverColor: '#059669',
        icon: CircleDollarSign,
    },
    {
        id: 'pedidos',
        title: 'Pedidos de Insumos',
        subtitle: 'Loja e materiais',
        path: '/admin/orders/catalog',
        color: '#7C3AED',
        hoverColor: '#6D28D9',
        icon: ShoppingCart,
    },
    {
        id: 'frota',
        title: 'Controle de Frota',
        subtitle: 'Gestão de veículos',
        path: '/admin/frota',
        color: '#4F46E5',
        hoverColor: '#4338CA',
        icon: Bike,
    },
    {
        id: 'gestao-franquia',
        title: 'Gestão de Franquia',
        subtitle: 'Administração da rede',
        path: '/admin/orders/management',
        color: '#6D28D9',
        hoverColor: '#5B21B6',
        isMasterOnly: true,
        icon: Globe,
    },
    {
        id: 'crm',
        title: 'CRM & Marketing',
        subtitle: 'Pipeline de leads e scripts',
        path: '/admin/crm/pipeline',
        color: '#E11D48',
        hoverColor: '#BE123C',
        isMasterOnly: true,
        icon: MessageSquare,
    },
    {
        id: 'caf',
        title: 'Atendimento CAF',
        subtitle: 'Central de atendimento',
        path: '/admin/caf/dashboard',
        color: '#0EA5E9',
        hoverColor: '#0284C7',
        isMasterOnly: true,
        icon: Headphones,
    },
    {
        id: 'agenda',
        title: 'Agenda',
        subtitle: 'Calendário e compromissos',
        path: '/admin/agenda/calendario',
        color: '#F59E0B',
        hoverColor: '#D97706',
        isMasterOnly: true,
        icon: CalendarDays,
    },
];

/* ────────────────────── component ─────────────────────── */

export default function GrauOSHub() {
    return (
        <ManualProvider>
            <GrauOSHubContent />
        </ManualProvider>
    );
}

function GrauOSHubContent() {
    const navigate = useNavigate();
    const { signOut, user } = useAuth();
    const { currentStore } = useStore();
    const { toggleManual } = useManual();
    const isMobile = useIsMobile();
    const [hoveredModule, setHoveredModule] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const isMasterAdmin = user?.email === 'agenciadamkt@gmail.com';
    const visibleModules = modules.filter(mod => !mod.isMasterOnly || isMasterAdmin);

    if (!isMounted) return null;

    return (
        <div className="min-h-screen bg-[#F8F9FA] pb-6">
            <nav className="flex items-center justify-between px-6 sm:px-10 lg:px-16 py-2.5">
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
                    <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-gray-600">
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={signOut} className="text-gray-400 hover:text-red-500">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </nav>

            <header className="px-6 sm:px-10 lg:px-16 pt-0 mb-1">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <img 
                            src={logoGrauOS} 
                            alt="GrauOS - Sistema Operacional da Franquia" 
                            className="h-12 lg:h-16 w-auto object-contain" 
                        />
                    </div>
                </motion.div>
            </header>

            <div className="relative z-10 flex flex-col lg:flex-row px-6 sm:px-10 lg:px-16 gap-8 items-start">
                <div className="flex-1 flex flex-col max-w-[580px]">
                    <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-4 w-full">
                        {visibleModules.map((mod, i) => (
                            <motion.button
                                key={mod.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => {
                                    const targetModule = HUB_ID_TO_MODULE[mod.id];
                                    if (targetModule) setActiveModule(targetModule);
                                    navigate(mod.path!);
                                }}
                                onMouseEnter={() => setHoveredModule(mod.id)}
                                onMouseLeave={() => setHoveredModule(null)}
                                className={clsx(
                                    "p-4 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] flex flex-col items-start gap-2.5 min-h-[105px] w-full"
                                )}
                                style={{
                                    backgroundColor: hoveredModule === mod.id ? mod.hoverColor : mod.color,
                                    transform: hoveredModule === mod.id ? 'translateY(-4px)' : 'translateY(0)',
                                }}
                            >
                                <div className="flex justify-between items-start w-full">
                                    <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md">
                                        <mod.icon className="h-5 w-5 text-white" />
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                                </div>
                                
                                <div className="text-left">
                                    <h3 className="text-sm lg:text-[15px] font-bold mb-0.5 leading-tight tracking-tight text-white">{mod.title}</h3>
                                    <p className="text-[10px] lg:text-[10.5px] text-white/80 leading-snug font-bold uppercase tracking-wide opacity-80 whitespace-pre-wrap">
                                        {mod.subtitle}
                                    </p>
                                </div>
                            </motion.button>
                        ))}
                    </div>

                    {/* ─── Game Banner ─── */}
                    <motion.button 
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/admin/grauzinho')}
                        className="group w-full relative overflow-hidden rounded-2xl border border-purple-400/20 shadow-[0_8px_30px_rgba(83,32,137,0.2)] hover:shadow-[0_12px_40px_rgba(83,32,137,0.3)] transition-all duration-300 mb-4 bg-purple-900/10"
                    >
                        <img src="/game/banner_final.png?v=final" alt="GrauRunner Banner" className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.01]" />
                    </motion.button>

                    {/* ─── Community bar ─── */}
                    <motion.button
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => navigate('/admin/comunidade')}
                        className="group w-full flex items-center gap-4 p-3.5 rounded-2xl bg-white/70 backdrop-blur-sm border border-white shadow-[0_4px_25px_rgba(0,0,0,0.03)] hover:bg-white/90 transition-all duration-300 text-left"
                    >
                        <div className="p-2 rounded-xl bg-[#F06292] shadow-sm">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-700">Comunidade Grau</h3>
                            <p className="text-xs text-gray-400 font-medium truncate">Feed, desafios, cases de sucesso e ranking geral</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                    </motion.button>
                </div>

                {/* ─── RIGHT COLUMN (Now Aligned to Grid Top) ─── */}
                <div className={clsx(
                    "hidden lg:flex flex-1 items-start justify-center pr-6 sticky top-10",
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
