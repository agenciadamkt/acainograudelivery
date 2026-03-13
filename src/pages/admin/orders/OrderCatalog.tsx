'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    ShoppingCart,
    ChevronRight,
    Package,
    Filter,
    Plus,
    Minus,
    Check,
    Clock,
    LayoutGrid,
    ArrowRight,
    Sparkles,
    ShoppingBag,
    Star,
    Zap,
    LogOut
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { formatBRL } from '@/lib/utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

import CartDrawer from './components/CartDrawer';

/* ─── Types ─── */
interface Category {
    id: string;
    name: string;
    icon_url: string | null;
}

interface Product {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: number;
    unit: string;
    image_url: string | null;
    taxa: number;
    has_advertising_fee: boolean;
    advertising_fee_percentage: number;
}

interface CartItem extends Product {
    quantity: number;
}

const OrderCatalog = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [cart, setCart] = useState<Record<string, CartItem>>(() => {
        const saved = localStorage.getItem('franchisee_cart');
        return saved ? JSON.parse(saved) : {};
    });
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('PIX');

    // Fetch user profile
    const { data: profile } = useQuery({
        queryKey: ['user_profile', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();
            if (error) throw error;
            return data as {
                full_name: string;
                avatar_url: string;
                is_franchisee: boolean;
                email: string;
                phone: string;
                created_at: string;
                updated_at: string;
                id: string;
            };
        },
        enabled: !!user?.id
    });

    const isFranchisee = profile?.is_franchisee || false;

    /* ─── Queries ─── */
    const { data: categories, isLoading: loadingCategories } = useQuery({
        queryKey: ['franchisee_categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('franchisee_product_categories' as any)
                .select('*')
                .eq('active', true)
                .order('display_order', { ascending: true });
            if (error) throw error;
            return (data as unknown) as Category[];
        }
    });

    const { data: products, isLoading: loadingProducts } = useQuery({
        queryKey: ['franchisee_products', selectedCategory],
        queryFn: async () => {
            let query = supabase
                .from('franchisee_products' as any)
                .select('*')
                .eq('active', true);

            if (selectedCategory) {
                query = query.eq('category_id', selectedCategory);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data as unknown) as Product[];
        }
    });

    /* ─── Logic ─── */
    useEffect(() => {
        localStorage.setItem('franchisee_cart', JSON.stringify(Object.values(cart)));
    }, [cart]);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        return products.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [products, searchQuery]);

    const addToCart = (product: Product) => {
        setCart(prev => ({
            ...prev,
            [product.id]: {
                ...product,
                quantity: (prev[product.id]?.quantity || 0) + 1
            }
        }));
        toast.success(`${product.name} adicionado ao carrinho`, {
            icon: <ShoppingBag className="h-4 w-4 text-purple-600" />,
            position: 'top-center'
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart(prev => {
            const item = prev[productId];
            if (!item) return prev;
            const newQty = Math.max(0, item.quantity + delta);

            if (newQty === 0) {
                const { [productId]: _, ...rest } = prev;
                return rest;
            }

            return {
                ...prev,
                [productId]: { ...item, quantity: newQty }
            };
        });
    };

    const totalItems = Object.values(cart).reduce((acc, item) => acc + item.quantity, 0);
    const totalPrice = Object.values(cart).reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return (
        <div className="min-h-screen bg-white dark:bg-[#030303] text-gray-900 dark:text-gray-100 flex flex-col overflow-x-hidden">
            {/* Mesh Background */}
            <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-400 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400 blur-[120px] rounded-full animate-pulse decoration-1000" />
            </div>

            {/* Header Content */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-32">

                {/* Hero Section - Desktop Header */}
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-2"
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-0 flex gap-1.5 items-center px-4 py-1.5 rounded-full font-bold">
                                <Sparkles className="h-3.5 w-3.5" />
                                ÁREA DO FRANQUEADO
                            </Badge>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight flex items-center gap-3">
                            Olá, {profile?.full_name?.split(' ')[0] || 'Franqueado'}
                            <span className="hidden sm:inline animate-bounce">👋</span>
                        </h1>
                        <p className="text-gray-500 font-medium text-lg leading-relaxed">Prepare sua unidade para um dia de sucesso. 🍦</p>
                    </motion.div>

                    <div className="flex items-center gap-3">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-3 bg-white/50 dark:bg-white/5 backdrop-blur-xl p-3 rounded-[1.5rem] border border-gray-200/50 dark:border-white/10 shadow-sm"
                        >
                            <div className="relative h-12 w-12 rounded-xl overflow-hidden border-2 border-purple-500/20 p-0.5">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} className="w-full h-full rounded-lg object-cover" alt="User" />
                                ) : (
                                    <div className="w-full h-full rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center font-black text-purple-600">
                                        {profile?.full_name?.charAt(0) || 'U'}
                                    </div>
                                )}
                                {isFranchisee && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border border-white dark:border-black flex items-center justify-center">
                                        <Check className="w-2 h-2 text-white stroke-[3]" />
                                    </div>
                                )}
                            </div>
                            <div className="hidden sm:block mr-2 text-right">
                                <p className="text-sm font-black leading-tight">{profile?.full_name || 'Franqueado'}</p>
                                <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">Unidade Teresina</p>
                            </div>
                        </motion.div>

                        <Button
                            variant="outline"
                            size="icon"
                            className="h-14 w-14 rounded-[1.5rem] border-gray-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 shadow-sm hover:bg-white dark:hover:bg-white/10"
                            onClick={() => supabase.auth.signOut()}
                        >
                            <LogOut className="h-5 w-5 text-rose-500" />
                        </Button>
                    </div>
                </header>

                {/* Bento Summary Section */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-12">
                    {/* Main Banner */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="md:col-span-8 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-purple-600 via-indigo-600 to-indigo-900 text-white relative p-8 md:p-12 shadow-2xl shadow-purple-500/20 group order-2 md:order-1"
                    >
                        <div className="relative z-20 flex h-full flex-col justify-between">
                            <div>
                                <h3 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter max-w-md leading-[0.9]">Estoque em baixa? Reponha agora.</h3>
                                <p className="text-white/70 font-medium text-lg max-w-sm mb-8">Todos os insumos da rede Açaí no Grau com logística integrada e preços exclusivos.</p>
                            </div>
                            <Button className="w-fit h-14 px-8 rounded-2xl bg-white text-purple-600 font-black text-lg hover:bg-gray-100 transition-all hover:translate-x-1 group">
                                Iniciar Pedido
                                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </div>
                        <div className="absolute -right-12 -bottom-12 w-80 h-80 opacity-20 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                            <Package className="w-full h-full -rotate-12" />
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-[100px]" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/20 rounded-full -ml-24 -mb-24 blur-[80px]" />
                    </motion.div>

                    {/* Stats */}
                    <div className="md:col-span-4 flex flex-col gap-6 order-1 md:order-2">
                        <motion.div
                            whileHover={{ y: -5 }}
                            className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-[2rem] border border-gray-200/50 dark:border-white/10 p-6 shadow-sm flex items-center gap-6 cursor-pointer group"
                            onClick={() => navigate('/admin/orders/history')}
                        >
                            <div className="h-14 w-14 rounded-2xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Clock className="h-7 w-7 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Seu Último Pedido</p>
                                <p className="text-xl font-black">Previsão 24h</p>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 mt-0.5">
                                    <span className="h-2 w-2 rounded-full bg-orange-600 animate-pulse" />
                                    EM PROCESSAMENTO
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            whileHover={{ y: -5 }}
                            className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-[2rem] border border-gray-200/50 dark:border-white/10 p-6 shadow-sm flex items-center gap-6"
                        >
                            <div className="h-14 w-14 rounded-2xl bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center">
                                <Star className="h-7 w-7 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">Itens Favoritos</p>
                                <p className="text-xl font-black">12 Insumos</p>
                                <p className="text-xs text-gray-500 font-medium">Os mais comprados</p>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                    {/* Left Sidebar - Categories & Filters (Desktop) */}
                    <aside className="lg:col-span-3 lg:sticky lg:top-8 space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Categorias</h2>
                            <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar pb-2">
                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedCategory(null)}
                                    className={cn(
                                        "flex-shrink-0 px-6 py-4 rounded-2xl font-black text-sm transition-all text-left flex items-center gap-3",
                                        selectedCategory === null
                                            ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                                            : "bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200/50 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10"
                                    )}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                    Todos os Insumos
                                </motion.button>
                                {loadingCategories ? (
                                    [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full rounded-2xl" />)
                                ) : (
                                    categories?.map(cat => (
                                        <motion.button
                                            key={cat.id}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={cn(
                                                "flex-shrink-0 px-6 py-4 rounded-2xl font-black text-sm transition-all text-left flex items-center gap-3",
                                                selectedCategory === cat.id
                                                    ? "bg-purple-600 text-white shadow-lg shadow-purple-500/30"
                                                    : "bg-white dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200/50 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-white/10"
                                            )}
                                        >
                                            <div className="h-5 w-5 bg-gray-100 dark:bg-white/10 rounded-lg flex items-center justify-center text-[10px]">
                                                {cat.name.substring(0, 1)}
                                            </div>
                                            {cat.name}
                                        </motion.button>
                                    ))
                                )}
                            </nav>
                        </div>

                        <div className="p-6 rounded-[2rem] bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 hidden lg:block">
                            <div className="flex items-center gap-2 text-purple-600 mb-3">
                                <Zap className="h-4 w-4 fill-purple-600" />
                                <span className="font-black text-[10px] uppercase tracking-widest">Entrega Rápida</span>
                            </div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Pedidos aprovados até as 11h são despachados no mesmo dia.</p>
                        </div>
                    </aside>

                    {/* Main Feed */}
                    <main className="lg:col-span-9 space-y-8">
                        {/* Interactive Search & Filters */}
                        <div className="flex flex-col sm:flex-row items-center gap-4 bg-white/40 dark:bg-white/5 backdrop-blur-2xl p-2 rounded-[2rem] border border-gray-200/50 dark:border-white/5 shadow-sm">
                            <div className="relative flex-1 w-full">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    placeholder="O que você precisa hoje?"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-transparent border-0 rounded-2xl pl-16 h-14 focus-visible:ring-0 text-lg font-bold placeholder:text-gray-400"
                                />
                            </div>
                            <Button variant="ghost" className="h-14 px-6 rounded-2xl border-0 bg-transparent hover:bg-gray-100 dark:hover:bg-white/10 font-black gap-2">
                                <Filter className="h-5 w-5" />
                                <span className="hidden sm:inline">Filtros Avançados</span>
                            </Button>
                        </div>

                        {/* Product Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                            {loadingProducts ? (
                                [1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="space-y-4">
                                        <Skeleton className="aspect-square rounded-[2.5rem]" />
                                        <div className="px-2 space-y-2">
                                            <Skeleton className="h-4 w-3/4 rounded-full" />
                                            <Skeleton className="h-8 w-1/2 rounded-full" />
                                        </div>
                                    </div>
                                ))
                            ) : filteredProducts.length > 0 ? (
                                filteredProducts.map((p, idx) => (
                                    <motion.div
                                        key={p.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: (idx % 9) * 0.05 }}
                                    >
                                        <Card className="group border-0 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 relative flex flex-col h-full border border-gray-100 dark:border-white/5">
                                            {/* Badge or Meta */}
                                            {idx === 0 && (
                                                <div className="absolute top-4 left-4 z-20">
                                                    <Badge className="bg-emerald-500 text-white border-0 font-black text-[10px] px-3 py-1 uppercase tracking-widest rounded-full">Destaque</Badge>
                                                </div>
                                            )}

                                            {/* Image container */}
                                            <div className="aspect-[4/5] sm:aspect-square bg-gray-50 dark:bg-white/2 relative overflow-hidden p-4">
                                                <img
                                                    src={p.image_url || `https://images.unsplash.com/photo-1579954115545-a95291e68b98?auto=format&fit=crop&w=800&q=80`}
                                                    className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                                                    alt={p.name}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent group-hover:opacity-100 opacity-0 transition-opacity" />
                                            </div>

                                            <CardContent className="p-6 flex flex-col flex-1 h-full">
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between gap-4 mb-2">
                                                        <h4 className="font-black text-lg leading-tight line-clamp-2 md:group-hover:text-purple-600 transition-colors uppercase tracking-tight">{p.name}</h4>
                                                    </div>
                                                    <p className="text-xs text-gray-500 font-bold mb-4 uppercase tracking-wider">{p.unit}</p>
                                                </div>

                                                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5 mt-auto">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Preço unit.</p>
                                                        <p className="text-2xl font-black text-gray-900 dark:text-white">{formatBRL(p.price)}</p>
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        onClick={() => addToCart(p)}
                                                        className="h-14 w-14 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white shadow-xl shadow-purple-500/20 active:scale-95 transition-all"
                                                    >
                                                        <Plus className="h-6 w-6" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="col-span-full py-32 text-center rounded-[3rem] border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/2">
                                    <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-6">
                                        <Search className="h-10 w-10 text-gray-300" />
                                    </div>
                                    <h3 className="text-xl font-black mb-2 uppercase tracking-tight">Carga não localizada</h3>
                                    <p className="text-gray-500 font-medium">Não encontramos insumos para "{searchQuery}"</p>
                                    <Button variant="link" onClick={() => setSearchQuery('')} className="mt-4 text-purple-600 font-bold uppercase tracking-widest text-xs">Limpar Busca</Button>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>

            {/* Premium Mobile App Navigation - Floating Style */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-4 bg-white/80 dark:bg-black/80 backdrop-blur-3xl border border-white/20 dark:border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-2 md:gap-12 min-w-[320px] transition-transform duration-500">
                <button className="flex flex-col items-center gap-1.5 px-6 py-2 rounded-full bg-purple-600 text-white shadow-lg shadow-purple-500/20 group animate-in slide-in-from-bottom-2">
                    <LayoutGrid className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Catálogo</span>
                </button>
                <button
                    onClick={() => navigate('/admin/orders/history')}
                    className="flex flex-col items-center gap-1.5 px-6 py-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
                >
                    <Check className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Histórico</span>
                </button>
                <div className="h-8 w-[1px] bg-gray-200 dark:bg-white/10 mx-2" />
                <button
                    onClick={() => setIsCartOpen(true)}
                    className="flex flex-col items-center gap-1.5 px-6 py-2 rounded-full relative text-gray-400 hover:bg-purple-50 dark:hover:bg-white/5 transition-colors group"
                >
                    <ShoppingCart className="h-5 w-5 group-hover:text-purple-600 transition-colors" />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Carrinho</span>
                    {totalItems > 0 && (
                        <span className="absolute top-1 right-3 h-5 w-5 rounded-full bg-purple-600 text-[10px] font-black text-white flex items-center justify-center border-2 border-white dark:border-black animate-in zoom-in">
                            {totalItems}
                        </span>
                    )}
                </button>
            </div>

            {/* Quick Summary Floating Bar (Desktop/Tablets) */}
            <AnimatePresence>
                {totalItems > 0 && (
                    <motion.div
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 100, opacity: 0 }}
                        className="fixed right-8 top-32 z-40 hidden xl:block"
                    >
                        <div className="bg-white/80 dark:bg-black/80 backdrop-blur-3xl border border-white/20 dark:border-white/10 p-8 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.2)] dark:shadow-purple-500/5 flex flex-col gap-6 w-[320px]">
                            <div className="flex items-center justify-between">
                                <h4 className="font-black text-sm uppercase tracking-widest text-gray-400">Pagar em {paymentMethod}</h4>
                                <Button variant="ghost" size="icon" onClick={() => navigate('/admin/orders/checkout')} className="rounded-full bg-purple-600 h-10 w-10 text-white hover:bg-purple-700">
                                    <ArrowRight className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <span className="text-xs font-bold text-gray-500">Itens Selecionados</span>
                                    <span className="font-black">{totalItems} unidades</span>
                                </div>
                                <div className="p-6 bg-purple-500/5 rounded-3xl border border-purple-500/10">
                                    <p className="text-[11px] font-black text-purple-600/60 uppercase tracking-widest mb-1">Total Estimado</p>
                                    <p className="text-4xl font-black text-purple-600 tracking-tight leading-none">{formatBRL(totalPrice)}</p>
                                </div>
                            </div>

                            <Button
                                onClick={() => setIsCartOpen(true)}
                                className="h-16 rounded-[1.5rem] bg-purple-600 hover:bg-purple-700 text-white font-black text-lg shadow-2xl shadow-purple-500/30 w-full group"
                            >
                                <ShoppingCart className="mr-3 h-5 w-5" />
                                Ver Sacola
                                <ChevronRight className="ml-auto h-5 w-5 group-hover:translate-x-1" />
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <CartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                items={Object.values(cart)}
                paymentMethod={paymentMethod}
                isFranchisee={isFranchisee}
                onUpdateQuantity={updateQuantity}
                onCheckout={() => {
                    setIsCartOpen(false);
                    navigate('/admin/orders/checkout');
                }}
            />
        </div>
    );
};

export default OrderCatalog;
