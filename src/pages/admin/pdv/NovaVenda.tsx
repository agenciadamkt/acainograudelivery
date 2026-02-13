
import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ShoppingCart, CreditCard, Trash, Plus, Minus, Check, ChevronRight, Maximize, Minimize } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { usePdvOrders } from '@/hooks/pdv/usePdvOrders';
import { usePdvSettings } from '@/hooks/pdv/usePdvSettings';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { qzPrinter } from '@/lib/qz-printer';
import { generateReceiptHtml } from '@/lib/receipt-generator';
import { ToppingSelectionModal } from '@/components/pdv/ToppingSelectionModal';
import { WeightInputModal } from '@/components/pdv/WeightInputModal';
import { useProductToppingCategories } from '@/hooks/useProductToppingCategories';
import { useCategories } from '@/hooks/useCategories';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export default function NovaVenda() {
    const { user } = useAuth();
    const { currentStore } = useStore();
    const { data: products, isLoading } = useProducts(undefined, true); // Active only
    const { data: categories, isLoading: isLoadingCategories } = useCategories(true); // Active categories
    const { createSale } = usePdvOrders();
    const { settings } = usePdvSettings();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [cart, setCart] = useState<any[]>([]);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('money');
    const [customerName, setCustomerName] = useState('');

    // Topping selection modal state
    const [isToppingModalOpen, setIsToppingModalOpen] = useState(false);
    const [selectedProductForToppings, setSelectedProductForToppings] = useState<any>(null);

    // Weight input modal state
    const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
    const [selectedProductForWeight, setSelectedProductForWeight] = useState<any>(null);

    // Fullscreen Logic
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Filter products by search term and category
    const filteredProducts = products?.filter(p => {
        const matchesSearch = searchTerm
            ? p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code?.toLowerCase().includes(searchTerm.toLowerCase())
            : true;
        const matchesCategory = selectedCategoryId
            ? p.category_id === selectedCategoryId
            : true;
        return matchesSearch && matchesCategory;
    }) || [];

    // Group products by category for organized display
    const productsByCategory = categories?.reduce((acc, category) => {
        const categoryProducts = filteredProducts.filter(p => p.category_id === category.id);
        if (categoryProducts.length > 0) {
            acc.push({ category, products: categoryProducts });
        }
        return acc;
    }, [] as { category: any; products: any[] }[]) || [];

    // Check if product has toppings configured
    const checkProductToppings = async (productId: string): Promise<boolean> => {
        try {
            const { data, error } = await (await import('@/integrations/supabase/client')).supabase
                .from('product_topping_categories' as any)
                .select('id')
                .eq('product_id', productId)
                .limit(1);

            if (error) {
                console.error('Error checking toppings:', error);
                return false;
            }
            return (data?.length || 0) > 0;
        } catch {
            return false;
        }
    };

    const handleProductClick = async (product: any) => {
        // Check if product is weight-based
        if (product.sale_type === 'peso') {
            setSelectedProductForWeight(product);
            setIsWeightModalOpen(true);
            return;
        }

        // Check if product has toppings
        const hasToppings = await checkProductToppings(product.id);

        if (hasToppings) {
            // Open topping selection modal
            setSelectedProductForToppings(product);
            setIsToppingModalOpen(true);
        } else {
            // Add directly to cart
            addToCartSimple(product);
        }
    };

    // Add weight-based product to cart
    const addToCartWithWeight = (data: {
        product: any;
        weight: number;
        unitPrice: number;
        totalPrice: number;
    }) => {
        setCart(currentCart => [...currentCart, {
            product_id: data.product.id,
            product_name: `${data.product.name} (${data.weight.toFixed(3)} kg)`,
            unit_price: data.unitPrice,
            quantity: data.weight,
            total_price: data.totalPrice,
            toppings: [],
            observations: '',
            is_weight_based: true
        }]);

        toast.success(`${data.product.name} adicionado (${data.weight.toFixed(3)} kg)!`);
    };

    // Simple add to cart (no toppings)
    const addToCartSimple = (product: any) => {
        setCart(currentCart => {
            const existingItem = currentCart.find(item =>
                item.product_id === product.id && !item.toppings?.length
            );
            if (existingItem) {
                return currentCart.map(item =>
                    item.product_id === product.id && !item.toppings?.length
                        ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * item.unit_price }
                        : item
                );
            }
            return [...currentCart, {
                product_id: product.id,
                product_name: product.name,
                unit_price: product.sale_price,
                quantity: 1,
                total_price: product.sale_price,
                toppings: [],
                observations: ''
            }];
        });
        toast.success(`${product.name} adicionado!`);
    };

    // Add to cart with toppings
    const addToCartWithToppings = (data: {
        product: any;
        quantity: number;
        selectedToppings: any[];
        observations: string;
        totalPrice: number;
    }) => {
        const toppingNames = data.selectedToppings.map(t => t.name).join(', ');
        const toppingsText = toppingNames ? ` (${toppingNames})` : '';

        setCart(currentCart => [...currentCart, {
            product_id: data.product.id,
            product_name: data.product.name + toppingsText,
            unit_price: data.totalPrice / data.quantity,
            quantity: data.quantity,
            total_price: data.totalPrice,
            toppings: data.selectedToppings,
            observations: data.observations
        }]);

        toast.success(`${data.product.name} adicionado com complementos!`);
    };

    // Legacy addToCart for compatibility
    const addToCart = (product: any) => {
        handleProductClick(product);
    };

    const removeFromCart = (index: number) => {
        setCart(current => current.filter((_, i) => i !== index));
    };

    const updateQuantity = (index: number, delta: number) => {
        setCart(current => current.map((item, i) => {
            if (i === index) {
                const newQuantity = Math.max(1, item.quantity + delta);
                return {
                    ...item,
                    quantity: newQuantity,
                    total_price: newQuantity * item.unit_price
                };
            }
            return item;
        }));
    };

    const cartTotal = cart.reduce((acc, item) => acc + item.total_price, 0);

    const handleFinalizeSale = () => {
        if (!user || !currentStore?.id) {
            toast.error('Loja ou usuário não autenticado');
            return;
        }

        const salePayload = {
            user_id: user.id,
            store_id: currentStore.id,
            items: cart,
            subtotal: cartTotal,
            discount: 0,
            total: cartTotal,
            payment_method: paymentMethod,
            amount_paid: cartTotal, // Auto-fill for now
            change_amount: 0,
            sales_channel: 'store' as const,
            status: 'paid' as const,
            customer_name: customerName,
        };

        createSale.mutate(salePayload, {
            onSuccess: async (createdOrder) => {
                setCart([]);
                setCustomerName('');
                setIsPaymentOpen(false);
                setSearchTerm('');

                // Auto-print Logic
                if (settings?.auto_print && settings?.use_qz_tray && settings?.qz_printer_name) {
                    try {
                        const html = generateReceiptHtml({ ...createdOrder, items: cart }); // merge items back
                        await qzPrinter.printHtml(settings.qz_printer_name, html);
                        toast.success("Cupom enviado para impressão!");
                    } catch (err) {
                        toast.error("Erro ao imprimir cupom automático.");
                    }
                }
            }
        });
    };

    return (
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${isFullscreen ? 'h-screen p-6 bg-background fixed inset-0 z-50 overflow-hidden' : 'h-[calc(100vh-100px)]'}`}>
            {/* Product Selection Area */}
            <div className="lg:col-span-2 flex flex-col gap-4 h-full min-h-0">
                <Card className="flex-1 flex flex-col shadow-md border-0 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm h-full">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <span>Catálogo de Produtos</span>
                                <Button variant="ghost" size="icon" onClick={toggleFullscreen} title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"}>
                                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                                </Button>
                            </div>
                            <span className="text-sm font-normal text-muted-foreground">{filteredProducts.length} itens encontrados</span>
                        </CardTitle>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nome ou código (SKU/EAN)..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-background/50"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Category Filter Tabs */}
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex gap-2 py-2">
                                <Button
                                    variant={selectedCategoryId === null ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedCategoryId(null)}
                                    className="shrink-0 rounded-full"
                                >
                                    <span className="mr-1">🏠</span> Todos
                                </Button>
                                {categories?.map((category) => (
                                    <Button
                                        key={category.id}
                                        variant={selectedCategoryId === category.id ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedCategoryId(category.id)}
                                        className="shrink-0 rounded-full pl-1.5"
                                    >
                                        {category.image_url ? (
                                            <img
                                                src={category.image_url}
                                                alt={category.name}
                                                className="w-5 h-5 rounded-full object-cover mr-1"
                                            />
                                        ) : (
                                            <span className="mr-1">{category.icon || '📦'}</span>
                                        )}
                                        {category.name}
                                    </Button>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-4 pt-0">
                        {isLoading || isLoadingCategories ? (
                            <div className="flex items-center justify-center h-48">Carregando produtos...</div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                <Search className="h-8 w-8 mb-2 opacity-50" />
                                <p>Nenhum produto encontrado</p>
                            </div>
                        ) : selectedCategoryId || searchTerm ? (
                            // Show flat grid when a specific category is selected or searching
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                                {filteredProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        className="group relative flex flex-col justify-between border rounded-xl p-4 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer bg-card"
                                        onClick={() => addToCart(product)}
                                    >
                                        <div className="flex flex-col items-center text-center space-y-2 mb-3">
                                            {product.base_image_url ? (
                                                <div className="h-20 w-20 rounded-full overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                                                    <img src={product.base_image_url} alt={product.name} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                                                    🍦
                                                </div>
                                            )}
                                            <h3 className="font-semibold text-sm line-clamp-2 leading-tight min-h-[2.5rem]">{product.name}</h3>
                                        </div>

                                        <div className="flex items-center justify-between border-t border-dashed pt-3 mt-auto">
                                            <span className="text-xs text-muted-foreground">{product.unit || 'un'}</span>
                                            <p className="text-primary font-bold text-lg">R$ {Number(product.sale_price).toFixed(2)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Show products grouped by category
                            <div className="space-y-6 pb-4">
                                {productsByCategory.map(({ category, products: catProducts }) => (
                                    <div key={category.id}>
                                        <div className="flex items-center gap-2 mb-3 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10">
                                            {category.image_url ? (
                                                <img
                                                    src={category.image_url}
                                                    alt={category.name}
                                                    className="w-7 h-7 rounded-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-xl">{category.icon || '📦'}</span>
                                            )}
                                            <h2 className="font-bold text-lg">{category.name}</h2>
                                            <span className="text-xs text-muted-foreground">({catProducts.length})</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                            {catProducts.map((product) => (
                                                <div
                                                    key={product.id}
                                                    className="group relative flex flex-col justify-between border rounded-xl p-4 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer bg-card"
                                                    onClick={() => addToCart(product)}
                                                >
                                                    <div className="flex flex-col items-center text-center space-y-2 mb-3">
                                                        {product.base_image_url ? (
                                                            <div className="h-20 w-20 rounded-full overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                                                                <img src={product.base_image_url} alt={product.name} className="w-full h-full object-cover" />
                                                            </div>
                                                        ) : (
                                                            <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                                                                🍦
                                                            </div>
                                                        )}
                                                        <h3 className="font-semibold text-sm line-clamp-2 leading-tight min-h-[2.5rem]">{product.name}</h3>
                                                    </div>

                                                    <div className="flex items-center justify-between border-t border-dashed pt-3 mt-auto">
                                                        <span className="text-xs text-muted-foreground">{product.unit || 'un'}</span>
                                                        <p className="text-primary font-bold text-lg">R$ {Number(product.sale_price).toFixed(2)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Cart & Checkout Area */}
            <div className="flex flex-col gap-4 h-full min-h-0">
                <Card className="flex-1 flex flex-col h-full border-0 shadow-xl bg-white dark:bg-zinc-900 border-l border-zinc-100 dark:border-zinc-800">
                    <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
                        <div className="flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <ShoppingCart className="h-5 w-5" />
                                Carrinho de Compras
                            </CardTitle>
                            <span className="bg-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-bold">{cart.length} itens</span>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto pt-4 space-y-3 px-3">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 p-8 text-center">
                                <ShoppingCart className="h-16 w-16 mb-4 stroke-1" />
                                <p className="text-lg font-medium">Seu carrinho está vazio</p>
                                <p className="text-sm">Selecione produtos ao lado para iniciar a venda</p>
                            </div>
                        ) : (
                            cart.map((item, idx) => (
                                <div key={idx} className="group flex justify-between items-center bg-muted/30 p-3 rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 transition-colors">
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm line-clamp-1 text-foreground/90">{item.product_name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border shadow-sm">R$ {item.unit_price.toFixed(2)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center bg-background rounded-md border shadow-sm h-8">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-full w-8 rounded-none rounded-l-md hover:bg-zinc-100 text-muted-foreground"
                                                onClick={() => updateQuantity(idx, -1)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-full w-8 rounded-none rounded-r-md hover:bg-zinc-100 text-primary"
                                                onClick={() => updateQuantity(idx, 1)}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>

                                        <div className="w-20 text-right">
                                            <span className="font-bold text-sm block">R$ {item.total_price.toFixed(2)}</span>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removeFromCart(idx)}
                                        >
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>

                    <div className="shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10 bg-background">
                        <div className="p-4 bg-primary/5 space-y-3">
                            <div className="space-y-1">
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>R$ {cartTotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground/80">
                                    <span>Desconto</span>
                                    <span>- R$ 0,00</span>
                                </div>
                                <div className="flex justify-between items-baseline pt-2 border-t border-primary/20 mt-2">
                                    <span className="text-lg font-medium text-foreground">Total a Pagar</span>
                                    <span className="text-3xl font-extrabold text-primary tracking-tight">R$ {cartTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <AlertDialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        size="lg"
                                        className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow gap-2 mt-2"
                                        disabled={cart.length === 0}
                                    >
                                        <Check className="h-6 w-6" />
                                        Receber Pagamento
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Finalizar Venda</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Confirme os dados do pagamento para encerrar o pedido.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>

                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="method" className="text-right">Pagamento</Label>
                                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                                <SelectTrigger className="col-span-3">
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="money">Dinheiro</SelectItem>
                                                    <SelectItem value="credit">Cartão de Crédito</SelectItem>
                                                    <SelectItem value="debit">Cartão de Débito</SelectItem>
                                                    <SelectItem value="pix">PIX</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="customer" className="text-right">Cliente</Label>
                                            <Input
                                                id="customer"
                                                placeholder="Nome (Opcional)"
                                                className="col-span-3"
                                                value={customerName}
                                                onChange={(e) => setCustomerName(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleFinalizeSale();
                                            }}
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            disabled={createSale.isPending}
                                        >
                                            {createSale.isPending ? 'Processando...' : 'Confirmar Venda'}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Topping Selection Modal */}
            {selectedProductForToppings && (
                <ToppingSelectionModal
                    open={isToppingModalOpen}
                    onOpenChange={(open) => {
                        setIsToppingModalOpen(open);
                        if (!open) setSelectedProductForToppings(null);
                    }}
                    product={selectedProductForToppings}
                    onConfirm={addToCartWithToppings}
                />
            )}

            {/* Weight Input Modal */}
            {selectedProductForWeight && (
                <WeightInputModal
                    open={isWeightModalOpen}
                    onOpenChange={(open) => {
                        setIsWeightModalOpen(open);
                        if (!open) setSelectedProductForWeight(null);
                    }}
                    product={selectedProductForWeight}
                    onConfirm={addToCartWithWeight}
                />
            )}
        </div>
    );
}
