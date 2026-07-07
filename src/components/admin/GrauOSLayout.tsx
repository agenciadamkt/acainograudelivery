import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import { Theme } from '@/components/ui/theme';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    ArrowLeft,
    LogOut,
    Bell,
    Shield,
    Star,
    Trophy,
    Zap,
    GraduationCap,
    BarChart3,
    Bot,
    Users,
    Home,
    Truck,
} from 'lucide-react';
import logoCircular from '@/assets/logo-circular.png';

const LEVELS = [
    { name: 'Bronze', min: 0, max: 999, icon: Shield, textColor: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    { name: 'Prata', min: 1000, max: 4999, icon: Star, textColor: 'text-gray-500', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
    { name: 'Ouro', min: 5000, max: 9999, icon: Trophy, textColor: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    { name: 'Elite', min: 10000, max: Infinity, icon: Zap, textColor: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
];

const moduleConfig: Record<string, { title: string; icon: any; gradient: string }> = {
    '/admin/universidade': { title: 'Universidade no Grau', icon: GraduationCap, gradient: 'from-blue-500 to-cyan-400' },
    '/admin/performance': { title: 'Performance', icon: BarChart3, gradient: 'from-emerald-500 to-green-400' },
    '/admin/assistente': { title: 'Assistente IA', icon: Bot, gradient: 'from-purple-600 to-indigo-500' },
    '/admin/comunidade': { title: 'Comunidade Grau', icon: Users, gradient: 'from-pink-500 to-rose-500' },
    '/admin/frota': { title: 'Controle de Frota', icon: Truck, gradient: 'from-orange-500 to-amber-400' },
};

interface GrauOSLayoutProps {
    children: ReactNode;
}

export function GrauOSLayout({ children }: GrauOSLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { signOut, user } = useAuth();
    const { currentStore } = useStore();
    const isMobile = useIsMobile();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const userPoints = 2350;
    const level = LEVELS.find(l => userPoints >= l.min && userPoints <= l.max) || LEVELS[0];
    const LevelIcon = level.icon;

    const currentModule = moduleConfig[location.pathname] || moduleConfig['/admin/universidade'];
    const ModuleIcon = currentModule.icon;
    if (!isMounted) return null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0F0F14] text-gray-900 dark:text-white transition-colors duration-300">
            {/* Ambient background (Dark mode only) */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden hidden dark:block">
                <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/5 blur-3xl" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
                {/* Top Navigation */}
                <nav className="border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-white/[0.02] backdrop-blur-xl sticky top-0 z-50 transition-colors duration-300">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between h-14">
                            {/* Left: Back + Module */}
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/admin/hub')}
                                    className="text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 gap-1.5"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    <Home className="h-4 w-4" />
                                </Button>

                                <div className="h-5 w-px bg-gray-200 dark:bg-white/10" />

                                <div className="flex items-center gap-2.5">
                                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${currentModule.gradient}`}>
                                        <ModuleIcon className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white/90">{currentModule.title}</span>
                                </div>
                            </div>

                            {/* Right */}
                            <div className="flex items-center gap-3">
                                <Theme variant="button" size="sm" />

                                <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border ${level.borderColor} ${level.bgColor}`}>
                                    <LevelIcon className={`h-3.5 w-3.5 ${level.textColor}`} />
                                    <span className={`text-[11px] font-bold ${level.textColor}`}>{level.name}</span>
                                </div>

                                {currentStore && (
                                    <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                                        <div className="w-2 h-2 rounded-full bg-green-400" />
                                        <span className="text-[11px] text-gray-600 dark:text-white/60 font-medium">{currentStore.name}</span>
                                    </div>
                                )}

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={signOut}
                                    className="text-gray-400 dark:text-white/30 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                                >
                                    <LogOut className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="flex-1">
                    {children}
                </main>

                {/* Footer */}
                <footer className="border-t border-gray-200 dark:border-white/5 py-4">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between text-[11px] text-gray-400 dark:text-white/20">
                            <div className="flex items-center gap-2">
                                <img src={logoCircular} alt="" className="h-4 w-4 opacity-50 dark:opacity-30" />
                                <span>GrauOS<sup className="text-[#7C3AED]">®</sup> v1.0</span>
                            </div>
                            <span>© {new Date().getFullYear()} Açaí no Grau</span>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
}
