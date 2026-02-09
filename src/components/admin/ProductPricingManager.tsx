import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Settings2, Plus, Pencil, Trash2, DollarSign, Percent, Store, Truck, Package } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useProductRecipes } from '@/hooks/useProductRecipes';
import { useProductSizes, useCreateProductSize, useUpdateProductSize, useDeleteProductSize, ProductSize } from '@/hooks/useProductSizes';

interface ProductPricingManagerProps {
    productId: string;
    costPrice: number;
    salePrice: number;
    onPriceChange: (newPrice: number) => void;
}

interface DeliveryPlatform {
    id: string;
    name: string;
    icon: string;
    is_active: boolean;
}

interface PlatformPrice {
    id: string;
    product_id: string;
    platform_id: string;
    price: number;
    is_active: boolean;
    platform?: DeliveryPlatform;
}

export function ProductPricingManager({
    productId,
    costPrice: propCostPrice,
    salePrice: propSalePrice,
    onPriceChange
}: ProductPricingManagerProps) {
    const queryClient = useQueryClient();
    const [desiredMargin, setDesiredMargin] = useState(45);
    const [storePrice, setStorePrice] = useState(propSalePrice);
    const [marginMultiplier, setMarginMultiplier] = useState(15);
    const [isPlatformDialogOpen, setIsPlatformDialogOpen] = useState(false);
    const [newPlatformName, setNewPlatformName] = useState('');

    // Product sizes hooks
    const { data: sizes } = useProductSizes(productId);
    const createSize = useCreateProductSize();
    const updateSize = useUpdateProductSize();
    const deleteSize = useDeleteProductSize();

    // New size form state
    const [newSizeName, setNewSizeName] = useState('');
    const [newSizeMl, setNewSizeMl] = useState<number | ''>('');
    const [newSizePrice, setNewSizePrice] = useState<number | ''>(0);
    const [newSizePromoPrice, setNewSizePromoPrice] = useState<number | ''>('');

    // Get recipe cost
    const { recipes } = useProductRecipes(productId);

    const recipeCost = useMemo(() => {
        if (!recipes?.length) return propCostPrice;
        return recipes.reduce((sum, r) => sum + ((r.cost_per_unit || 0) * r.quantity), 0);
    }, [recipes, propCostPrice]);

    const costPrice = recipeCost > 0 ? recipeCost : propCostPrice;

    // Calculate suggested price based on margin
    const suggestedPrice = useMemo(() => {
        if (costPrice <= 0) return 0;
        return costPrice / (1 - (desiredMargin / 100));
    }, [costPrice, desiredMargin]);

    // Calculate real margin
    const realMargin = useMemo(() => {
        if (storePrice <= 0) return 0;
        return ((storePrice - costPrice) / storePrice) * 100;
    }, [storePrice, costPrice]);

    // Update store price when prop changes
    useEffect(() => {
        if (propSalePrice > 0 && storePrice === 0) {
            setStorePrice(propSalePrice);
        }
    }, [propSalePrice]);

    // Fetch delivery platforms
    const { data: platforms } = useQuery({
        queryKey: ['delivery-platforms'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('delivery_platforms' as any)
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) {
                console.error('Error fetching platforms:', error);
                return [];
            }
            return data as unknown as DeliveryPlatform[];
        }
    });

    // Fetch product platform prices
    const { data: platformPrices } = useQuery({
        queryKey: ['product-platform-prices', productId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('product_platform_prices' as any)
                .select(`
                    *,
                    platform:delivery_platforms(id, name, icon)
                `)
                .eq('product_id', productId);

            if (error) {
                console.error('Error fetching platform prices:', error);
                return [];
            }
            return data as unknown as PlatformPrice[];
        },
        enabled: !!productId
    });

    // Create platform mutation
    const createPlatform = useMutation({
        mutationFn: async (name: string) => {
            const { data, error } = await supabase
                .from('delivery_platforms' as any)
                .insert({ name, icon: '🚚' })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery-platforms'] });
            toast.success('Plataforma adicionada!');
            setNewPlatformName('');
        },
        onError: (error: Error) => {
            toast.error(`Erro: ${error.message}`);
        }
    });

    // Delete platform mutation
    const deletePlatform = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('delivery_platforms' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery-platforms'] });
            toast.success('Plataforma removida!');
        }
    });

    // Update platform price mutation
    const updatePlatformPrice = useMutation({
        mutationFn: async ({ platformId, price }: { platformId: string; price: number }) => {
            // Check if price already exists
            const existing = platformPrices?.find(p => p.platform_id === platformId);

            if (existing) {
                const { error } = await supabase
                    .from('product_platform_prices' as any)
                    .update({ price })
                    .eq('id', existing.id);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('product_platform_prices' as any)
                    .insert({
                        product_id: productId,
                        platform_id: platformId,
                        price
                    });

                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product-platform-prices', productId] });
        }
    });

    // Use margin multiplier to set store price
    const applyMarginMultiplier = () => {
        const newPrice = suggestedPrice * (1 + marginMultiplier / 100);
        setStorePrice(parseFloat(newPrice.toFixed(2)));
        onPriceChange(parseFloat(newPrice.toFixed(2)));
    };

    // Get platform price
    const getPlatformPrice = (platformId: string): number => {
        const found = platformPrices?.find(p => p.platform_id === platformId);
        return found?.price || 0;
    };

    // Add new size
    const handleAddSize = () => {
        if (!newSizeName.trim()) {
            toast.error('Digite o nome do tamanho');
            return;
        }

        createSize.mutate({
            product_id: productId,
            name: newSizeName.trim(),
            ml_size: typeof newSizeMl === 'number' ? newSizeMl : null,
            price: typeof newSizePrice === 'number' ? newSizePrice : 0,
            promotional_price: typeof newSizePromoPrice === 'number' && newSizePromoPrice > 0 ? newSizePromoPrice : null,
            active: true,
            display_order: (sizes?.length || 0) + 1,
        }, {
            onSuccess: () => {
                setNewSizeName('');
                setNewSizeMl('');
                setNewSizePrice(0);
                setNewSizePromoPrice('');
                toast.success('Tamanho adicionado!');
            },
            onError: (error: any) => {
                toast.error('Erro ao adicionar tamanho: ' + error.message);
            }
        });
    };

    // Update size field
    const handleUpdateSizeField = (size: ProductSize, field: keyof ProductSize, value: any) => {
        updateSize.mutate({
            id: size.id,
            product_id: size.product_id,
            [field]: value
        });
    };

    // Delete size
    const handleDeleteSize = (size: ProductSize) => {
        if (confirm(`Excluir tamanho "${size.name}"?`)) {
            deleteSize.mutate({ id: size.id, product_id: size.product_id });
        }
    };

    // Calculate discount percentage
    const getDiscountPercent = (originalPrice: number, promoPrice: number | null) => {
        if (!promoPrice || promoPrice <= 0 || originalPrice <= 0) return null;
        return Math.round(((originalPrice - promoPrice) / originalPrice) * 100);
    };

    return (
        <div className="space-y-6">
            {/* Sizes Section - Tamanhos e Preços */}
            <Card className="border-purple-500/20">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Package className="h-5 w-5 text-purple-500" />
                            Tamanhos e Preços
                        </CardTitle>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddSize}
                            className="gap-1"
                            disabled={createSize.isPending}
                        >
                            <Plus className="h-4 w-4" />
                            Adicionar Tamanho
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Sizes Header */}
                    {(sizes && sizes.length > 0) && (
                        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                            <div className="col-span-3">Nome</div>
                            <div className="col-span-2">ML</div>
                            <div className="col-span-2">Preço Original</div>
                            <div className="col-span-3">Preço Promo</div>
                            <div className="col-span-2"></div>
                        </div>
                    )}

                    {/* Existing Sizes */}
                    {sizes?.map((size) => {
                        const discount = getDiscountPercent(size.price, size.promotional_price);
                        return (
                            <div key={size.id} className="grid grid-cols-12 gap-2 items-center bg-muted/30 rounded-lg p-2">
                                <div className="col-span-3">
                                    <Input
                                        value={size.name}
                                        onChange={(e) => handleUpdateSizeField(size, 'name', e.target.value)}
                                        className="h-9 bg-background"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input
                                        type="number"
                                        placeholder="Opcional"
                                        value={size.ml_size || ''}
                                        onChange={(e) => handleUpdateSizeField(size, 'ml_size', e.target.value ? parseInt(e.target.value) : null)}
                                        className="h-9 bg-background"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={size.price}
                                        onChange={(e) => handleUpdateSizeField(size, 'price', parseFloat(e.target.value) || 0)}
                                        className="h-9 bg-background"
                                    />
                                </div>
                                <div className="col-span-3 flex items-center gap-1">
                                    {discount && (
                                        <span className="text-xs text-green-600 font-semibold whitespace-nowrap">
                                            -{discount}%
                                        </span>
                                    )}
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="Deixe vazio se não há"
                                        value={size.promotional_price || ''}
                                        onChange={(e) => handleUpdateSizeField(size, 'promotional_price', e.target.value ? parseFloat(e.target.value) : null)}
                                        className="h-9 bg-background"
                                    />
                                </div>
                                <div className="col-span-2 flex justify-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteSize(size)}
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}

                    {/* New Size Form */}
                    <div className="grid grid-cols-12 gap-2 items-center border-2 border-dashed border-muted-foreground/20 rounded-lg p-2">
                        <div className="col-span-3">
                            <Input
                                placeholder="Ex: 300ml"
                                value={newSizeName}
                                onChange={(e) => setNewSizeName(e.target.value)}
                                className="h-9"
                            />
                        </div>
                        <div className="col-span-2">
                            <Input
                                type="number"
                                placeholder="Opcional"
                                value={newSizeMl}
                                onChange={(e) => setNewSizeMl(e.target.value ? parseInt(e.target.value) : '')}
                                className="h-9"
                            />
                        </div>
                        <div className="col-span-2">
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="0"
                                value={newSizePrice}
                                onChange={(e) => setNewSizePrice(e.target.value ? parseFloat(e.target.value) : 0)}
                                className="h-9"
                            />
                        </div>
                        <div className="col-span-3">
                            <Input
                                type="number"
                                step="0.01"
                                placeholder="Deixe vazio se não"
                                value={newSizePromoPrice}
                                onChange={(e) => setNewSizePromoPrice(e.target.value ? parseFloat(e.target.value) : '')}
                                className="h-9"
                            />
                        </div>
                        <div className="col-span-2 flex justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled
                                className="h-8 w-8 opacity-30"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {sizes?.length === 0 && !newSizeName && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Adicione tamanhos para configurar diferentes preços e opções para este produto.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Store Pricing Section */}
            <Card className="border-primary/20">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Store className="h-5 w-5 text-primary" />
                        Precificação Loja
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Recipe Cost */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                                Custo Total (da Receita)
                            </Label>
                            <div className="h-10 px-3 flex items-center bg-muted/50 rounded-md border text-primary font-semibold">
                                R$ {costPrice.toFixed(2)}
                            </div>
                        </div>

                        {/* Desired Margin */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                                Margem Desejada (%)
                            </Label>
                            <Input
                                type="number"
                                min={0}
                                max={99}
                                value={desiredMargin}
                                onChange={(e) => setDesiredMargin(parseFloat(e.target.value) || 0)}
                                className="h-10"
                            />
                        </div>

                        {/* Suggested Price */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                                Preço Sugerido
                            </Label>
                            <div className="h-10 px-3 flex items-center bg-muted/50 rounded-md border text-primary font-semibold">
                                R$ {suggestedPrice.toFixed(2)}
                            </div>
                        </div>

                        {/* Store Price with Multiplier */}
                        <div className="space-y-2">
                            <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                                Preço Loja (R$) *
                            </Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-10 px-3"
                                    onClick={applyMarginMultiplier}
                                >
                                    Usar
                                </Button>
                                <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={marginMultiplier}
                                    onChange={(e) => setMarginMultiplier(parseFloat(e.target.value) || 0)}
                                    className="h-10 w-20"
                                />
                                <span className="flex items-center text-sm text-muted-foreground">%</span>
                            </div>
                        </div>
                    </div>

                    {/* Store Price Input */}
                    <div className="space-y-2">
                        <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                            Preço Final da Loja
                        </Label>
                        <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={storePrice}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setStorePrice(val);
                                onPriceChange(val);
                            }}
                            className="h-12 text-lg font-bold"
                        />
                    </div>

                    {/* Real Margin */}
                    <div className="flex items-center gap-2 pt-2">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Margem Real:</span>
                        <Badge
                            variant={realMargin >= 30 ? "default" : realMargin >= 15 ? "secondary" : "destructive"}
                            className={realMargin >= 30 ? "bg-green-500/20 text-green-700" : ""}
                        >
                            {realMargin.toFixed(1)}%
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Delivery Pricing Section */}
            <Card className="border-orange-500/20">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Truck className="h-5 w-5 text-orange-500" />
                            Preços Delivery (por plataforma)
                        </CardTitle>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsPlatformDialogOpen(true)}
                            className="gap-1"
                        >
                            <Settings2 className="h-4 w-4" />
                            Gerenciar Plataformas
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {platforms?.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Nenhuma plataforma cadastrada.</p>
                            <Button
                                variant="link"
                                onClick={() => setIsPlatformDialogOpen(true)}
                                className="mt-2"
                            >
                                Adicionar plataformas
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {platforms?.map((platform) => (
                                <div key={platform.id} className="space-y-2">
                                    <Label className="text-sm flex items-center gap-1">
                                        <span>{platform.icon}</span>
                                        {platform.name}
                                    </Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        placeholder="R$ 0,00"
                                        value={getPlatformPrice(platform.id) || ''}
                                        onChange={(e) => {
                                            const price = parseFloat(e.target.value) || 0;
                                            updatePlatformPrice.mutate({
                                                platformId: platform.id,
                                                price
                                            });
                                        }}
                                        className="h-10"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Platform Management Dialog */}
            <Dialog open={isPlatformDialogOpen} onOpenChange={setIsPlatformDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5" />
                            Gerenciar Plataformas de Delivery
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Add new platform */}
                        <div className="flex gap-2">
                            <Input
                                placeholder="Ex: iFood, Rappi, WhatsApp..."
                                value={newPlatformName}
                                onChange={(e) => setNewPlatformName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newPlatformName.trim()) {
                                        createPlatform.mutate(newPlatformName.trim());
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                onClick={() => {
                                    if (newPlatformName.trim()) {
                                        createPlatform.mutate(newPlatformName.trim());
                                    }
                                }}
                                disabled={!newPlatformName.trim()}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* List platforms */}
                        <div className="space-y-2 max-h-60 overflow-auto">
                            {platforms?.map((platform) => (
                                <div
                                    key={platform.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{platform.icon}</span>
                                        <span className="font-medium">{platform.name}</span>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => {
                                                if (confirm('Remover esta plataforma?')) {
                                                    deletePlatform.mutate(platform.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPlatformDialogOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
