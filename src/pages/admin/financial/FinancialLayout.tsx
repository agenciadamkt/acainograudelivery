'use client';

import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    LayoutDashboard,
    Landmark,
    Receipt,
    FolderOpen,
    TrendingUp,
    FileBarChart,
    Settings,
    HelpCircle,
    LogOut,
    Search,
    Bell,
    ChevronLeft,
    Menu,
    X,
    Wallet,
    BarChart3,
    CalendarRange,
    Banknote,
} from 'lucide-react';
import logoCircular from '@/assets/logo-circular.png';
import CopilotPanel from '@/components/copilot/CopilotPanel';

/* ─── Sidebar Navigation Items ─── */
const navItems = [
    { label: 'Dashboard', path: '/admin/financeiro', icon: LayoutDashboard, end: true },
    { label: 'Caixa & Contas', path: '/admin/financeiro/caixa', icon: Landmark },
    { label: 'Fechamento de Caixa', path: '/admin/financeiro/fluxo', icon: TrendingUp },
    { label: 'Fluxo Semanal', path: '/admin/financeiro/fluxo-semanal', icon: CalendarRange },
    { label: 'PixPag', path: '/admin/financeiro/lancamentos', icon: Receipt },
    { label: 'Contas a Receber', path: '/admin/financeiro/receber', icon: Banknote },
    { label: 'Despesas', path: '/admin/financeiro/despesas', icon: Wallet },
    { label: 'DRE', path: '/admin/financeiro/dre', icon: BarChart3 },
    { label: 'Relatórios', path: '/admin/financeiro/relatorios', icon: FileBarChart },
    { label: 'Receitas x Despesas', path: '/admin/financeiro/receitas-despesas', icon: LayoutDashboard },
    { label: 'Despesas Detalhadas', path: '/admin/financeiro/despesas-detalhadas', icon: BarChart3 },
    { label: 'Cadastros', path: '/admin/financeiro/cadastros', icon: FolderOpen },
    { label: 'Configurações', path: '/admin/financeiro/configuracoes', icon: Settings },
];

/* ─── Component ─── */
export default function FinancialLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { signOut, user } = useAuth();
    const isMobile = useIsMobile();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
    const userInitial = userName.charAt(0).toUpperCase();

    const currentPageTitle = navItems.find(
        (item) => item.end ? location.pathname === item.path : location.pathname.startsWith(item.path)
    )?.label || 'Dashboard';

    const handleLogout = async () => {
        await signOut();
        navigate('/admin/login');
    };

    // Prevenir hydration mismatch
    if (!isMounted) return null;

    return (
        <div className="min-h-screen flex bg-gray-50 dark:bg-[#0F0F14]">
            {/* ─── Desktop Sidebar ─── */}
            {!isMobile && (
                <aside className="flex flex-col w-64 bg-white dark:bg-[#16161D] border-r border-gray-200 dark:border-white/[0.06] fixed inset-y-0 left-0 z-30">
                    {/* Logo */}
                    <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-white/[0.06]">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/admin/hub')}>
                            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                                Grau<span className="text-purple-600">OS</span>
                            </span>
                            <img src={logoCircular} alt="Logo" className="h-6 w-6 rounded-full" />
                        </div>
                    </div>
                    <p className="px-6 pt-2 pb-4 text-[11px] text-gray-400 dark:text-white/30 font-medium tracking-wide uppercase">
                        Financeiro
                    </p>

                    {/* Nav Links */}
                    <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.end}
                                className={({ isActive }) =>
                                    cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                                        isActive
                                            ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/25'
                                            : 'text-gray-600 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                    )
                                }
                            >
                                <item.icon className="h-[18px] w-[18px]" />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Footer */}
                    <div className="px-3 py-4 border-t border-gray-100 dark:border-white/[0.06] space-y-1">
                        <button
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5 w-full transition-colors"
                            onClick={() => navigate('/admin/hub')}
                        >
                            <ChevronLeft className="h-[18px] w-[18px]" />
                            Voltar ao Hub
                        </button>
                        <button
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5 w-full transition-colors"
                        >
                            <HelpCircle className="h-[18px] w-[18px]" />
                            Ajuda
                        </button>
                        <button
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 w-full transition-colors"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-[18px] w-[18px]" />
                            Logout
                        </button>
                    </div>
                </aside>
            )}

            {/* ─── Mobile Header ─── */}
            {isMobile && (
                <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-[#16161D]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/[0.06]">
                    <div className="flex items-center justify-between px-4 h-14">
                        <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
                            <Menu className="h-5 w-5 text-gray-700 dark:text-white/70" />
                        </button>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{currentPageTitle}</span>
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
                            {userInitial}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Mobile Drawer Overlay ─── */}
            {isMobile && mobileOpen && (
                <div className="fixed inset-0 z-50 flex">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
                    <aside className="relative w-72 bg-white dark:bg-[#16161D] flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
                            <span className="text-lg font-bold text-gray-900 dark:text-white">
                                Grau<span className="text-purple-600">OS</span>
                            </span>
                            <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.end}
                                    onClick={() => setMobileOpen(false)}
                                    className={({ isActive }) =>
                                        cn(
                                            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                                            isActive
                                                ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/25'
                                                : 'text-gray-600 dark:text-white/50 hover:bg-gray-100 dark:hover:bg-white/5'
                                        )
                                    }
                                >
                                    <item.icon className="h-[18px] w-[18px]" />
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>
                        <div className="px-3 py-4 border-t border-gray-100 dark:border-white/[0.06]">
                            <button
                                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 w-full"
                                onClick={handleLogout}
                            >
                                <LogOut className="h-[18px] w-[18px]" />
                                Logout
                            </button>
                        </div>
                    </aside>
                </div>
            )}

            {/* ─── Main Content ─── */}
            <main className={cn("flex-1", !isMobile && "ml-64")}>
                {/* Desktop Header */}
                {!isMobile && (
                    <header className="flex items-center justify-between px-8 h-16 bg-white/60 dark:bg-[#16161D]/60 backdrop-blur-xl border-b border-gray-200 dark:border-white/[0.06] sticky top-0 z-20">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            {currentPageTitle === 'PixPag' ? 'Lançamentos PixPag' : currentPageTitle}
                        </h1>
                        <div className="flex items-center gap-4">
                            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                                <Search className="h-5 w-5 text-gray-400" />
                            </button>
                            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors relative">
                                <Bell className="h-5 w-5 text-gray-400" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                            </button>
                            <div className="h-6 w-px bg-gray-200 dark:bg-white/10" />
                            <div className="flex items-center gap-3 cursor-pointer">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                                    {userInitial}
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{userName}</p>
                                    <p className="text-[11px] text-gray-400 dark:text-white/30">Administrador</p>
                                </div>
                            </div>
                        </div>
                    </header>
                )}

                {/* Page Content */}
                <div className={cn(isMobile ? "pt-14" : "pt-0")}>
                    <Outlet />
                </div>
            </main>

            <CopilotPanel />
        </div>
    );
}
