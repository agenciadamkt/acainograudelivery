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
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { CategorySection } from './components/CategorySection';
import { ProductImagePlaceholder } from './components/ProductImagePlaceholder';
import { useFranchiseeCart } from '@/hooks/useFranchiseeCart';
import { SpringElement } from '@/components/ui/spring-element';
import { MASCOTE_BASE64 } from '@/assets/mascote-data';

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
    display_order: number;
    current_stock: number;
    brand?: string | null;
}

const OrderCatalog = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const selectedCategory = searchParams.get('category');
    const selectedBrand = searchParams.get('brand');
    const setSelectedCategory = (id: string | null) => {
        if (id) setSearchParams({ category: id });
        else setSearchParams({});
    };
    const setSelectedBrand = (brand: string | null) => {
        if (brand) setSearchParams({ brand });
        else setSearchParams({});
    };
    const [searchQuery, setSearchQuery] = useState('');
    const { 
        cart, 
        totalItems, 
        totalPrice, 
        addToCart: addToCartHook, 
        updateQuantity, 
        removeItem, 
        clearCart 
    } = useFranchiseeCart();
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

    // Nome de exibição do usuário logado: prioriza user_profiles.nome (RBAC
    // novo, mantido ativamente via tela de Usuários) sobre profiles.full_name
    // — esse último é um campo legado que já apareceu vazio ou com o nome da
    // unidade em vez do nome da pessoa, dependendo de como a conta foi
    // criada.
    const { data: userProfileNome } = useQuery({
        queryKey: ['user_profile_nome', user?.id],
        queryFn: async () => {
            const { data } = await (supabase as any)
                .from('user_profiles')
                .select('nome')
                .eq('id', user?.id)
                .single();
            return data?.nome as string | undefined;
        },
        enabled: !!user?.id
    });

    const displayName = userProfileNome || profile?.full_name || 'Franqueado';

    // Fetch franchisee store
    const { data: store } = useQuery({
        queryKey: ['franchisee_store', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stores')
                .select('*, distribution_center:distribution_centers(name)')
                .eq('franchisee_user_id', user?.id)
                .single();
            if (error) return null;
            return data as any;
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
        queryKey: ['franchisee_products_all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('franchisee_products' as any)
                .select('*')
                .eq('active', true)
                .order('display_order', { ascending: true })
                .order('name', { ascending: true });
            if (error) throw error;
            return (data as unknown) as Product[];
        }
    });

    /* ─── Logic ─── */
    const isHomepage = !selectedCategory && !selectedBrand && !searchQuery;

    const PRODUCTS_PER_PAGE = 12;
    const [currentPage, setCurrentPage] = useState(1);

    const filteredProducts = useMemo(() => {
        if (!products) return [];
        let list = products;

        if (selectedCategory) {
            list = list.filter(p => p.category_id === selectedCategory);
        }
        if (selectedBrand) {
            list = list.filter(p => p.brand === selectedBrand);
        }
        if (searchQuery) {
            list = list.filter(p =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return [...list].sort((a, b) => {
            const orderA = a.display_order ?? 999;
            const orderB = b.display_order ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            return a.name.localeCompare(b.name);
        });
    }, [products, searchQuery, selectedCategory, selectedBrand]);

    // Products grouped by category for homepage
    const groupedByCategory = useMemo(() => {
        if (!products || !categories) return [];
        return categories
            .map(cat => ({
                category: cat,
                products: products
                    .filter(p => p.category_id === cat.id)
                    .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))
            }))
            .filter(g => g.products.length > 0);
    }, [products, categories]);

    // Unique brands
    const uniqueBrands = useMemo(() => {
        if (!products) return [];
        const brands = products
            .map(p => p.brand)
            .filter((b): b is string => !!b && b.trim() !== '');
        return [...new Set(brands)].sort();
    }, [products]);

    // Reset page when filters change
    useEffect(() => { setCurrentPage(1); }, [selectedCategory, selectedBrand, searchQuery]);

    const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * PRODUCTS_PER_PAGE,
        currentPage * PRODUCTS_PER_PAGE
    );

    const addToCart = (product: Product) => {
        addToCartHook(product);
        toast.success(`${product.name} adicionado ao carrinho`, {
            icon: <ShoppingBag className="h-4 w-4 text-purple-600" />,
            position: 'top-center'
        });
    };

    const handleRemoveItem = (productId: string) => {
        const removedItem = cart[productId];
        if (removedItem) {
            removeItem(productId);
            toast.error(`${removedItem.name} removido do carrinho`, {
                position: 'top-center'
            });
        }
    };

    const handleClearCart = () => {
        clearCart();
        toast.info('Carrinho limpo', {
            position: 'top-center'
        });
    };

    return (
        <div className="min-h-screen bg-white dark:bg-[#030303] text-gray-900 dark:text-gray-100 flex flex-col overflow-x-hidden">
            {/* Mesh Background */}
            <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-400 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400 blur-[120px] rounded-full animate-pulse decoration-1000" />
            </div>

            {/* Hub Navigation Bar */}
            <div className="sticky top-0 z-50 w-full bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/10">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-10 flex items-center">
                    <a
                        href="https://app.acainograu.com.br/admin/hub"
                        className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors uppercase tracking-widest"
                    >
                        <ChevronRight className="h-3 w-3 rotate-180" />
                        Voltar ao Hub
                    </a>
                </div>
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
                            Olá, {displayName.split(' ')[0]}
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
                                        {displayName.charAt(0)}
                                    </div>
                                )}
                                {isFranchisee && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border border-white dark:border-black flex items-center justify-center">
                                        <Check className="w-2 h-2 text-white stroke-[3]" />
                                    </div>
                                )}
                            </div>
                            <div className="hidden sm:block mr-2 text-right">
                                <p className="text-sm font-black leading-tight">{displayName}</p>
                                <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">
                                    {store?.name || 'Carregando...'} • CD: {store?.distribution_center?.name || 'Geral'}
                                </p>
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
                        className="md:col-span-8 rounded-[2.5rem] bg-[#532089] text-white relative p-8 md:p-12 shadow-2xl shadow-purple-500/20 group order-2 md:order-1"
                    >
                        {/* Mascote Peeking Draggable */}
                        <SpringElement
                            className="absolute bottom-[calc(100%-25px)] right-2 md:right-8 w-48 h-48 z-40"
                            springClassName="stroke-purple-400 dark:stroke-purple-300 opacity-40 shadow-sm"
                            dragElastic={0.4}
                            springConfig={{ stiffness: 300, damping: 20 }}
                            whileHover={{ y: -10 }}
                        >
                             <img 
                                src={MASCOTE_BASE64} 
                                alt="Mascote" 
                                className="w-full h-full object-contain pointer-events-none drop-shadow-2xl" 
                             />
                        </SpringElement>

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
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-[100px]" />
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-[80px]" />
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

                        {/* ─── HOMEPAGE MODE: Sections by Category + Brands ─── */}
                        {isHomepage ? (
                            <div className="space-y-10">
                                {/* Navegue por Marcas */}
                                {uniqueBrands.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-4"
                                    >
                                        <div>
                                            <h2 className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
                                                Navegue por Marcas
                                            </h2>
                                            <p className="text-xs text-gray-400 font-medium mt-0.5">Filtre pelos fornecedores</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {uniqueBrands.map(brand => (
                                                <button
                                                    key={brand}
                                                    onClick={() => setSelectedBrand(brand)}
                                                    className="h-9 px-4 rounded-2xl text-xs font-black uppercase tracking-widest border border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/5 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-500/10 hover:text-purple-600 transition-all"
                                                >
                                                    {brand}
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                {/* Category Sections */}
                                {loadingProducts ? (
                                    <div className="space-y-8">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="space-y-3">
                                                <Skeleton className="h-6 w-40 rounded-2xl" />
                                                <div className="flex gap-4">
                                                    {[1, 2, 3, 4].map(j => (
                                                        <Skeleton key={j} className="flex-none w-44 aspect-square rounded-[1.5rem]" />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    groupedByCategory.map((group, idx) => (
                                        <CategorySection
                                            key={group.category.id}
                                            categoryName={group.category.name}
                                            products={group.products}
                                            cart={cart}
                                            onAddToCart={addToCart}
                                            onUpdateQuantity={updateQuantity}
                                            onViewAll={() => setSelectedCategory(group.category.id)}
                                            onProductClick={(id) => navigate(`/admin/orders/catalog/${id}`)}
                                            animationDelay={idx * 0.08}
                                        />
                                    ))
                                )}
                            </div>
                        ) : (
                            /* ─── GRID MODE: Filtrada (categoria, marca, busca) ─── */
                            <div className="space-y-6">
                                {/* Active filter breadcrumb */}
                                <div className="flex items-center gap-2 flex-wrap">
                                    {selectedBrand && (
                                        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-2 rounded-2xl">
                                            <span className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-widest">
                                                🏷 Marca: {selectedBrand}
                                            </span>
                                            <button onClick={() => setSelectedBrand(null)} className="text-purple-400 hover:text-purple-600 ml-1 font-black text-xs">✕</button>
                                        </div>
                                    )}
                                    {selectedCategory && (
                                        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 px-4 py-2 rounded-2xl">
                                            <span className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase tracking-widest">
                                                📦 {categories?.find(c => c.id === selectedCategory)?.name}
                                            </span>
                                            <button onClick={() => setSelectedCategory(null)} className="text-purple-400 hover:text-purple-600 ml-1 font-black text-xs">✕</button>
                                        </div>
                                    )}
                                    {searchQuery && (
                                        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 px-4 py-2 rounded-2xl">
                                            <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest">
                                                🔍 "{searchQuery}"
                                            </span>
                                            <button onClick={() => setSearchQuery('')} className="text-blue-400 hover:text-blue-600 ml-1 font-black text-xs">✕</button>
                                        </div>
                                    )}
                                    <span className="text-xs text-gray-400 font-medium">{filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''}</span>
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
                                        paginatedProducts.map((p, idx) => (
                                            <motion.div
                                                key={p.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: (idx % 9) * 0.05 }}
                                            >
                                                <Card className={cn(
                                                    "group border-0 backdrop-blur-xl rounded-[2.5rem] overflow-hidden shadow-sm transition-all duration-500 relative flex flex-col h-full border",
                                                    p.current_stock === 0
                                                        ? "bg-gray-100/60 dark:bg-white/3 border-gray-200 dark:border-white/5 hover:shadow-none"
                                                        : "bg-white/40 dark:bg-white/5 border-gray-100 dark:border-white/5 hover:shadow-2xl hover:shadow-purple-500/10"
                                                )}>
                                                    {/* Indisponível overlay badge */}
                                                    {p.current_stock === 0 && (
                                                        <div className="absolute top-4 left-4 z-20">
                                                            <Badge className="bg-gray-400 text-white border-0 font-black text-[10px] px-3 py-1 uppercase tracking-widest rounded-full">Indisponível</Badge>
                                                        </div>
                                                    )}

                                                    {/* Image container */}
                                                    <div
                                                        className={cn(
                                                            "aspect-[4/5] sm:aspect-square bg-gray-50 dark:bg-white/2 relative overflow-hidden p-4",
                                                            p.current_stock === 0 ? "cursor-default" : "cursor-pointer"
                                                        )}
                                                        onClick={() => p.current_stock > 0 && navigate(`/admin/orders/catalog/${p.id}`)}
                                                    >
                                                        {p.image_url ? (
                                                            <img
                                                                src={p.image_url}
                                                                loading="lazy"
                                                                className={cn(
                                                                    "w-full h-full object-contain transition-transform duration-700",
                                                                    p.current_stock === 0 ? "opacity-40 grayscale" : "group-hover:scale-110"
                                                                )}
                                                                alt={p.name}
                                                            />
                                                        ) : (
                                                            <ProductImagePlaceholder className={cn(p.current_stock === 0 && "opacity-60")} />
                                                        )}
                                                        {p.current_stock > 0 && <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent group-hover:opacity-100 opacity-0 transition-opacity" />}
                                                    </div>

                                                    <CardContent className="p-6 flex flex-col flex-1 h-full">
                                                        <div
                                                            className={cn("flex-1", p.current_stock > 0 ? "cursor-pointer" : "cursor-default")}
                                                            onClick={() => p.current_stock > 0 && navigate(`/admin/orders/catalog/${p.id}`)}
                                                        >
                                                            {p.brand && (
                                                                <p className="text-[9px] font-black text-purple-500/70 uppercase tracking-widest leading-none mb-1">{p.brand}</p>
                                                            )}
                                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                                <h4 className={cn(
                                                                    "font-black text-lg leading-tight line-clamp-2 transition-colors uppercase tracking-tight",
                                                                    p.current_stock === 0 ? "text-gray-400" : "md:group-hover:text-purple-600"
                                                                )}>{p.name}</h4>
                                                            </div>
                                                            <p className="text-xs text-gray-500 font-bold mb-4 uppercase tracking-wider">{p.unit}</p>
                                                        </div>

                                                        <div className="pt-4 border-t border-gray-100 dark:border-white/5 mt-auto flex items-center justify-between">
                                                            <div>
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Preço unit.</p>
                                                                <p className={cn(
                                                                    "text-xl md:text-2xl font-black leading-tight",
                                                                    p.current_stock === 0 ? "text-gray-400" : "text-gray-900 dark:text-white"
                                                                )}>{formatBRL(p.price)}</p>
                                                            </div>

                                                            {p.current_stock === 0 ? (
                                                                <Button size="icon" disabled className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed shadow-none">
                                                                    <Plus className="h-4 w-4 opacity-40" />
                                                                </Button>
                                                            ) : cart[p.id]?.quantity > 0 ? (
                                                                <div className="flex items-center gap-2 animate-in zoom-in duration-300">
                                                                    <Button size="icon" variant="outline" onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, -1); }} className="h-7 w-7 md:h-8 md:w-8 rounded-lg border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 active:scale-90 transition-all p-0">
                                                                        <Minus className="h-3 w-3 md:h-3.5 md:w-3.5 text-gray-700 dark:text-gray-300" />
                                                                    </Button>
                                                                    <span className="text-xs md:text-sm font-black min-w-[1rem] text-center">{cart[p.id].quantity}</span>
                                                                    <Button size="icon" variant="outline" onClick={(e) => { e.stopPropagation(); updateQuantity(p.id, 1); }} className="h-7 w-7 md:h-8 md:w-8 rounded-lg border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 active:scale-90 transition-all p-0">
                                                                        <Plus className="h-3 w-3 md:h-3.5 md:w-3.5 text-gray-700 dark:text-gray-300" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button size="icon" onClick={(e) => { e.stopPropagation(); addToCart(p); }} className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 active:scale-95 transition-all animate-in fade-in duration-300">
                                                                    <Plus className="h-4.5 w-4.5 md:h-5 md:w-5" />
                                                                </Button>
                                                            )}
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
                                            <p className="text-gray-500 font-medium">Nenhum produto encontrado para o filtro selecionado.</p>
                                            <Button variant="link" onClick={() => { setSearchQuery(''); setSelectedBrand(null); setSelectedCategory(null); }} className="mt-4 text-purple-600 font-bold uppercase tracking-widest text-xs">Limpar Filtros</Button>
                                        </div>
                                    )}
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-3 mt-8">
                                        <Button
                                            variant="outline"
                                            onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                            disabled={currentPage === 1}
                                            className="rounded-2xl border-gray-200 dark:border-white/10 font-bold text-sm gap-2 h-11 px-5 disabled:opacity-40"
                                        >
                                            <ChevronRight className="h-4 w-4 rotate-180" />
                                            Anterior
                                        </Button>
                                        <div className="flex items-center gap-2">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                <button
                                                    key={page}
                                                    onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                                    className={cn(
                                                        "w-9 h-9 rounded-xl text-sm font-black transition-all",
                                                        page === currentPage
                                                            ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20"
                                                            : "bg-white dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/10 hover:border-purple-400"
                                                    )}
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                        </div>
                                        <Button
                                            variant="outline"
                                            onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                            disabled={currentPage === totalPages}
                                            className="rounded-2xl border-gray-200 dark:border-white/10 font-bold text-sm gap-2 h-11 px-5 disabled:opacity-40"
                                        >
                                            Próximo
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

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
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                onCheckout={() => {
                    setIsCartOpen(false);
                    navigate('/admin/orders/checkout');
                }}
            />
        </div>
    );
};

export default OrderCatalog;
