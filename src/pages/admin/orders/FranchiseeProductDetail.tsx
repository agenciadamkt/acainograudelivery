import { useParams, useNavigate } from 'react-router-dom';
import { useFranchiseeProduct, useFranchiseeProducts } from '@/hooks/useFranchiseeProducts';
import { useFranchiseeProductReviews, useCreateFranchiseeProductReview } from '@/hooks/useFranchiseeProductReviews';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useFranchiseeCart } from '@/hooks/useFranchiseeCart';
import CartDrawer from './components/CartDrawer';
import { 
    ChevronLeft, 
    ShoppingCart, 
    Star, 
    Info, 
    Apple, 
    Image as ImageIcon, 
    MessageSquare,
    Send,
    ChevronRight,
    ShoppingBag,
    ArrowRight,
    Truck,
    Clock,
    Plus,
    Minus,
    ChefHat,
    ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { formatBRL } from '@/lib/utils';
import { toast } from 'sonner';
import { BrandedLoader } from '@/components/ui/branded-loader';
import { ProductImagePlaceholder } from './components/ProductImagePlaceholder';

export default function FranchiseeProductDetail() {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const [quantity, setQuantity] = useState(1);
    const [activeImage, setActiveImage] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    
    // Review form state
    const [isReviewOpen, setIsReviewOpen] = useState(false);
    const [newRating, setNewRating] = useState(5);
    const [newComment, setNewComment] = useState('');

    // Cart & Auth state
    const { user } = useAuth();
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
    const [paymentMethod] = useState('PIX');

    const { data: product, isLoading } = useFranchiseeProduct(productId!);
    const { data: allProducts } = useFranchiseeProducts();
    const { data: reviews } = useFranchiseeProductReviews(productId!);
    const createReview = useCreateFranchiseeProductReview();

    // Fetch user profile for drawer
    const { data: profile } = useQuery({
        queryKey: ['user_profile', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user?.id)
                .single();
            if (error) throw error;
            return data as any;
        },
        enabled: !!user?.id
    });

    // Fetch franchisee store for drawer
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

    useEffect(() => {
        const getUserId = async () => {
            const { data } = await supabase.auth.getUser();
            setUserId(data.user?.id || null);
        };
        getUserId();
    }, []);

    const averageRating = reviews?.length 
        ? (reviews.reduce((acc, rev) => acc + rev.rating, 0) / reviews.length).toFixed(1)
        : '0.0';

    const relatedProducts = allProducts?.filter(p => 
        product?.related_product_ids?.includes(p.id)
    ) || [];

    const handleAddToCart = () => {
        if (!product) return;
        addToCartHook(product, quantity);
        setIsCartOpen(true);
        toast.success(`${quantity}x ${product.name} adicionado ao carrinho!`, {
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

    const handleSubmitReview = async () => {
        if (!userId) {
            toast.error("Você precisa estar logado para avaliar.");
            return;
        }

        if (!newComment.trim()) {
            toast.error("Por favor, escreva um comentário.");
            return;
        }

        try {
            await createReview.mutateAsync({
                product_id: productId!,
                user_id: userId,
                rating: newRating,
                comment: newComment
            });
            setIsReviewOpen(false);
            setNewComment('');
            setNewRating(5);
        } catch (error) {
            // Error handled by mutation
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50/50 dark:bg-black/50 backdrop-blur-sm">
                <BrandedLoader label="Carregando Produto..." />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold">Produto não encontrado</h1>
                <Button onClick={() => navigate(-1)}>Voltar</Button>
            </div>
        );
    }

    const mainImage = product.image_url || product.gallery_images?.[0] || null;
    const gallery = [product.image_url, ...(product.gallery_images || [])].filter(Boolean) as string[];

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-foreground font-sans selection:bg-purple-500/30">
            {/* Header / Nav */}
            <header className="sticky top-0 z-50 w-full bg-white/60 dark:bg-black/60 backdrop-blur-xl border-b border-gray-200/50 dark:border-white/10 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate(-1)}
                        className="rounded-full gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="font-bold text-xs uppercase tracking-tighter">Voltar</span>
                    </Button>
                    <div className="flex items-center gap-4">
                        <Badge variant="outline" className="rounded-full bg-purple-500/5 border-purple-500/20 text-purple-600 dark:text-purple-400 font-bold px-4 py-1">
                            {product.category?.name || 'Insumo'}
                        </Badge>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">
                {/* Hero Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Left: Image Gallery (Span 7) */}
                    <div className="md:col-span-7 space-y-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative aspect-square rounded-[2.5rem] overflow-hidden bg-white dark:bg-white/5 border border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none transition-all duration-500 overflow-hidden group"
                        >
                            {(activeImage || mainImage) ? (
                                <img
                                    src={activeImage || mainImage || undefined}
                                    alt={product.name}
                                    className="w-full h-full object-contain p-8 md:p-12 transition-transform duration-500 group-hover:scale-105"
                                />
                            ) : (
                                <ProductImagePlaceholder />
                            )}
                            {/* Overlay Badge */}
                            <div className="absolute top-6 left-6">
                                <div className="bg-white/90 dark:bg-black/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 dark:border-white/10 flex items-center gap-2 shadow-xl">
                                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">Produto Verificado</span>
                                </div>
                            </div>
                        </motion.div>

                        <div className="grid grid-cols-4 gap-4">
                            {gallery.slice(0, 4).map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveImage(img)}
                                    className={cn(
                                        "aspect-square rounded-2xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95",
                                        (activeImage || mainImage) === img 
                                            ? "border-purple-500 shadow-lg shadow-purple-500/20" 
                                            : "border-transparent opacity-60 hover:opacity-100"
                                    )}
                                >
                                    <img src={img} alt={`${product.name} gallery ${idx}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right: Info & Actions (Span 5) */}
                    <div className="md:col-span-5 flex flex-col gap-6">
                        <div className="p-8 rounded-[2.5rem] bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    {product.current_stock === 0 ? (
                                        <Badge variant="secondary" className="bg-red-500/10 text-red-600 dark:text-red-400 border-none font-bold">
                                            ⚠ Indisponível
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-bold">
                                            Em Estoque: {product.current_stock} {product.unit}
                                        </Badge>
                                    )}
                                    <div className="flex items-center gap-1 text-amber-500">
                                        <Star className="h-4 w-4 fill-current" />
                                        <span className="text-sm font-black">{averageRating}</span>
                                        <span className="text-gray-400 text-xs text-nowrap">({reviews?.length || 0} avaliações)</span>
                                    </div>
                                </div>
                                <h1 className="text-4xl font-black tracking-tighter leading-[0.9] text-gray-900 dark:text-white">
                                    {product.name}
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-medium">
                                    {product.description || 'Nenhuma descrição detalhada disponível para este produto no momento.'}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                                <div className="flex items-baseline gap-2 mb-6">
                                    <span className="text-4xl font-black text-purple-600 dark:text-purple-400">
                                        {formatBRL(product.price)}
                                    </span>
                                    <span className="text-gray-400 text-sm font-bold uppercase tracking-widest">por {product.unit}</span>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                        <div className="flex items-center justify-center bg-gray-100 dark:bg-white/5 rounded-2xl p-1.5 h-14">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                                className="rounded-xl h-11 w-11 hover:bg-white dark:hover:bg-white/10 transition-all"
                                            >
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="w-12 text-center font-black text-lg">{quantity}</span>
                                            <Button 
                                                variant="ghost" 
                                                size="icon"
                                                onClick={() => setQuantity(quantity + 1)}
                                                className="rounded-xl h-11 w-11 hover:bg-white dark:hover:bg-white/10 transition-all"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <Button 
                                            onClick={handleAddToCart}
                                            disabled={product.current_stock === 0}
                                            className={cn(
                                                "flex-1 h-14 rounded-2xl font-black text-sm sm:text-base shadow-xl active:scale-[0.98] transition-all gap-2 w-full",
                                                product.current_stock === 0
                                                    ? "bg-gray-200 dark:bg-white/10 text-gray-400 cursor-not-allowed shadow-none"
                                                    : "bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20"
                                            )}
                                        >
                                            <ShoppingCart className="h-5 w-5 shrink-0" />
                                            {product.current_stock === 0 ? 'INDISPONÍVEL' : 'ADICIONAR AO PEDIDO'}
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-blue-500/5 border border-blue-500/10 p-3 rounded-2xl flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                                <Truck className="h-4 w-4 text-blue-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase text-blue-500/60 leading-none">Entrega Estimada</span>
                                                <span className="text-xs font-bold">24-48 horas</span>
                                            </div>
                                        </div>
                                        <div className="bg-purple-500/5 border border-purple-500/10 p-3 rounded-2xl flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                                                <Clock className="h-4 w-4 text-purple-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black uppercase text-purple-500/60 leading-none">Disponibilidade</span>
                                                <span className="text-xs font-bold">Imediata</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Sections Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Ingredients Card */}
                    <AnimatePresence>
                        {product.ingredients && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="lg:col-span-2 p-8 rounded-[2.5rem] bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                            >
                                <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400 mb-6">
                                    <ChefHat className="h-5 w-5" />
                                    <h2 className="text-lg font-black uppercase tracking-tighter">Composição & Ingredientes</h2>
                                </div>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                                    {product.ingredients}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Nutrition Card */}
                    <AnimatePresence>
                        {product.has_nutrition_facts && (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-8 rounded-[2.5rem] bg-gradient-to-br from-purple-500/10 to-indigo-500/10 backdrop-blur-xl border border-purple-500/20 dark:border-white/10 shadow-xl"
                            >
                                <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400 mb-6">
                                    <Apple className="h-5 w-5" />
                                    <h2 className="text-lg font-black uppercase tracking-tighter">Informação Nutricional</h2>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        { key: 'calories', label: 'Valor Energético', suffix: 'kcal' },
                                        { key: 'protein',  label: 'Proteínas',        suffix: 'g'    },
                                        { key: 'carbs',    label: 'Carboidratos',      suffix: 'g'    },
                                        { key: 'fat',      label: 'Gorduras Totais',   suffix: 'g'    },
                                        { key: 'fiber',    label: 'Fibras',            suffix: 'g'    },
                                        { key: 'sodium',   label: 'Sódio',             suffix: 'mg'   },
                                    ].filter(({ key }) => product?.nutritional_info?.[key] !== undefined && product?.nutritional_info?.[key] !== '').map(({ key, label, suffix }, idx, arr) => (
                                        <div key={key} className={cn("flex justify-between items-center py-2", idx < arr.length - 1 && "border-b border-purple-500/10")}>
                                            <span className="text-xs font-bold text-gray-400 uppercase">{label}</span>
                                            <span className="font-black">{product?.nutritional_info?.[key]}{suffix}</span>
                                        </div>
                                    ))}
                                    {(!product?.nutritional_info || Object.keys(product.nutritional_info).filter(k => product.nutritional_info[k] !== '' && product.nutritional_info[k] !== undefined).length === 0) && (
                                        <p className="text-sm text-gray-400 text-center py-4">Informações nutricionais não cadastradas.</p>
                                    )}
                                    <p className="text-[10px] text-gray-400 italic pt-4">
                                        * Valores baseados em uma dieta de 2.000 kcal e podem variar conforme o lote.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Reviews Bento Card (Full Width) */}
                    <div className="lg:col-span-3 p-8 rounded-[2.5rem] bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                            <div className="flex items-center gap-3 text-amber-500">
                                <Star className="h-5 w-5 fill-current" />
                                <h2 className="text-lg font-black uppercase tracking-tighter text-gray-900 dark:text-white">Avaliações dos Franqueados</h2>
                                <Badge variant="outline" className="ml-2 rounded-full font-black text-[10px] border-amber-500/20 text-amber-600">
                                    {averageRating}
                                </Badge>
                            </div>
                            
                            <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                                <DialogTrigger asChild>
                                    <Button className="rounded-full font-bold text-[10px] uppercase h-10 px-6 bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-lg shadow-purple-500/20">
                                        <MessageSquare className="h-3 w-3" />
                                        Avaliar Produto
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="rounded-[2.5rem] p-8 border-none bg-white/95 dark:bg-[#09090b]/95 backdrop-blur-2xl shadow-2xl">
                                    <DialogHeader>
                                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Sua Avaliação</DialogTitle>
                                        <DialogDescription className="text-sm font-medium text-gray-500">
                                            Conte-nos o que você achou da qualidade deste insumo.
                                        </DialogDescription>
                                    </DialogHeader>
                                    
                                    <div className="space-y-6 py-4">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Nota</label>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        onClick={() => setNewRating(star)}
                                                        className="hover:scale-110 active:scale-95 transition-transform"
                                                    >
                                                        <Star 
                                                            className={cn(
                                                                "h-8 w-8 transition-colors",
                                                                newRating >= star ? "fill-amber-500 text-amber-500" : "text-gray-200 dark:text-gray-800"
                                                            )} 
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Comentário</label>
                                            <Textarea 
                                                placeholder="Ex: Excelente rendimento e cor bem vibrante..."
                                                className="min-h-[100px] rounded-2xl bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 focus:ring-purple-500/20 transition-all font-medium"
                                                value={newComment}
                                                onChange={(e) => setNewComment(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    
                                    <DialogFooter>
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => setIsReviewOpen(false)}
                                            className="rounded-xl font-bold uppercase text-[10px]"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button 
                                            onClick={handleSubmitReview}
                                            disabled={createReview.isPending}
                                            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white h-11 px-8 font-black uppercase text-[10px] gap-2 shadow-lg shadow-purple-500/20"
                                        >
                                            {createReview.isPending ? "Enviando..." : (
                                                <>
                                                    <Send className="h-3 w-3" />
                                                    Enviar Avaliação
                                                </>
                                            )}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {reviews && reviews.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {reviews.map((rev) => (
                                    <motion.div 
                                        key={rev.id} 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-6 rounded-3xl bg-gray-50/50 dark:bg-white/5 border border-gray-100 dark:border-white/5 space-y-4 hover:shadow-lg transition-all duration-300"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star 
                                                        key={s} 
                                                        className={cn(
                                                            "h-3 w-3",
                                                            rev.rating >= s ? "fill-amber-500 text-amber-500" : "text-gray-200 dark:text-gray-800"
                                                        )} 
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase">
                                                {new Date(rev.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                            </span>
                                        </div>
                                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 italic leading-relaxed">
                                            "{rev.comment}"
                                        </p>
                                        <div className="flex items-center gap-3 pt-2">
                                            <Avatar className="h-8 w-8 border border-white/20">
                                                <AvatarImage src={rev.profiles?.avatar_url || ''} />
                                                <AvatarFallback className="bg-purple-600/10 text-purple-600 font-black text-[10px] uppercase">
                                                    {(rev.profiles?.full_name || 'F').slice(0, 2)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white">
                                                    {rev.profiles?.full_name || 'Franqueado'}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <Badge variant="outline" className="h-4 px-1 rounded-sm border-emerald-500/20 text-[8px] font-bold text-emerald-600 bg-emerald-500/5 uppercase leading-none">Verificado</Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-50/30 dark:bg-white/5 rounded-3xl border border-dashed border-gray-200 dark:border-white/10">
                                <MessageSquare className="h-10 w-10 text-gray-300 mb-4" />
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Nenhuma avaliação ainda</p>
                                <p className="text-[10px] text-gray-500 mt-2">Seja o primeiro a avaliar este produto!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Related Products Section */}
                <AnimatePresence>
                    {relatedProducts.length > 0 && (
                        <div className="space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 text-purple-600 dark:text-purple-400">
                                    <Plus className="h-5 w-5" />
                                    <h2 className="text-lg font-black uppercase tracking-tighter">Produtos Relacionados</h2>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                {relatedProducts.map((p) => (
                                    <motion.div 
                                        key={p.id}
                                        whileHover={{ y: -5 }}
                                        onClick={() => navigate(`/admin/orders/catalog/${p.id}`)}
                                        className="group cursor-pointer p-4 rounded-[2rem] bg-white/60 dark:bg-white/5 backdrop-blur-xl border border-gray-200/50 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-300"
                                    >
                                        <div className="aspect-square rounded-2xl overflow-hidden mb-4 relative">
                                            {p.image_url ? (
                                                <img
                                                    src={p.image_url}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    alt={p.name}
                                                />
                                            ) : (
                                                <ProductImagePlaceholder />
                                            )}
                                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <ArrowRight className="text-white h-8 w-8" />
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-sm leading-tight text-center px-1 truncate">{p.name}</h3>
                                        <p className="text-center font-black text-purple-600 dark:text-purple-400 mt-2 text-sm">{formatBRL(p.price)}</p>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </main>

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
}
