import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Minus, X, Check } from 'lucide-react';
import { useProductToppingCategories } from '@/hooks/useProductToppingCategories';
import { useToppings } from '@/hooks/useToppings';
import { useParentToppingCategoriesLimits } from '@/hooks/useToppingCategories';
import { cn } from '@/lib/utils';

interface SelectedTopping {
    id: string;
    name: string;
    price: number;
    quantity: number;
    categoryId: string;
}

interface ToppingSelectionModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: {
        id: string;
        name: string;
        sale_price: number;
        base_image_url?: string;
    };
    onConfirm: (data: {
        product: any;
        quantity: number;
        selectedToppings: SelectedTopping[];
        observations: string;
        totalPrice: number;
    }) => void;
}

export function ToppingSelectionModal({
    open,
    onOpenChange,
    product,
    onConfirm
}: ToppingSelectionModalProps) {
    const [quantity, setQuantity] = useState(1);
    const [observations, setObservations] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedToppings, setSelectedToppings] = useState<SelectedTopping[]>([]);

    // Fetch product's topping categories with their configuration
    const { data: toppingCategories, isLoading: loadingCategories } = useProductToppingCategories(product?.id);

    // Fetch all toppings (we'll filter by category)
    const { data: allToppings, isLoading: loadingToppings } = useToppings(undefined, true);

    // Reset state when modal opens
    useEffect(() => {
        if (open) {
            setQuantity(1);
            setObservations('');
            setSearchTerm('');
            setSelectedToppings([]);
        }
    }, [open, product?.id]);

    // Group toppings by category
    const toppingsByCategory = useMemo(() => {
        if (!toppingCategories || !allToppings) return new Map();

        const grouped = new Map<string, {
            category: typeof toppingCategories[0];
            toppings: typeof allToppings;
        }>();

        toppingCategories.forEach(cat => {
            const categoryToppings = allToppings.filter(t => t.category_id === cat.topping_category_id);
            grouped.set(cat.topping_category_id, {
                category: cat,
                toppings: categoryToppings
            });
        });

        return grouped;
    }, [toppingCategories, allToppings]);

    // Calculate how many toppings are selected per category
    const getSelectedCountForCategory = (categoryId: string) => {
        return selectedToppings
            .filter(t => t.categoryId === categoryId)
            .reduce((sum, t) => sum + t.quantity, 0);
    };

    // Categorias que são subcategorias (têm parent_id) compartilham o limite
    // máximo de seleções da Categoria Pai entre si — mesma regra do site do cliente.
    const parentCategoryIds = useMemo(() => {
        if (!toppingCategories) return [];
        return toppingCategories
            .map(cat => cat.topping_category?.parent_id)
            .filter((id): id is string => !!id);
    }, [toppingCategories]);

    const { data: parentCategoryLimits } = useParentToppingCategoriesLimits(parentCategoryIds);

    // Para uma categoria com parent_id, retorna a contagem/limite agregados entre
    // todas as subcategorias-irmãs do mesmo pai. Sem parent_id, retorna a
    // contagem/limite de sempre (próprios da categoria no produto).
    const getCategoryLimitInfo = (categoryId: string) => {
        const category = toppingCategories?.find(c => c.topping_category_id === categoryId);
        const parentId = category?.topping_category?.parent_id;

        if (parentId) {
            const parent = parentCategoryLimits?.find(p => p.id === parentId);
            const siblingCategoryIds = (toppingCategories || [])
                .filter(c => c.topping_category?.parent_id === parentId)
                .map(c => c.topping_category_id);
            const count = selectedToppings
                .filter(t => siblingCategoryIds.includes(t.categoryId))
                .reduce((sum, t) => sum + t.quantity, 0);
            return { count, max: parent?.max_selections || 0, isShared: true, parentName: parent?.name as string | undefined };
        }

        return {
            count: getSelectedCountForCategory(categoryId),
            max: category?.max_quantity || 0,
            isShared: false,
            parentName: undefined as string | undefined,
        };
    };

    // Check if a category's requirements are met
    const isCategoryValid = (cat: any) => {
        const count = getSelectedCountForCategory(cat.topping_category_id);
        if (cat.required && count < cat.min_quantity) return false;
        return true;
    };

    // Check if all required categories are satisfied
    const allRequirementsMet = useMemo(() => {
        if (!toppingCategories) return true;
        return toppingCategories.every(cat => {
            if (!cat.required) return true;
            const count = getSelectedCountForCategory(cat.topping_category_id);
            return count >= cat.min_quantity;
        });
    }, [toppingCategories, selectedToppings]);

    // Add topping
    const addTopping = (topping: any, categoryId: string) => {
        const category = toppingCategories?.find(c => c.topping_category_id === categoryId);
        if (!category) return;

        const { count, max } = getCategoryLimitInfo(categoryId);
        if (max > 0 && count >= max) return; // Max reached (own or shared with parent group)

        setSelectedToppings(prev => {
            const existing = prev.find(t => t.id === topping.id);
            if (existing) {
                return prev.map(t =>
                    t.id === topping.id
                        ? { ...t, quantity: t.quantity + 1 }
                        : t
                );
            }
            return [...prev, {
                id: topping.id,
                name: topping.name,
                price: topping.price || 0,
                quantity: 1,
                categoryId
            }];
        });
    };

    // Remove topping
    const removeTopping = (toppingId: string) => {
        setSelectedToppings(prev => {
            const existing = prev.find(t => t.id === toppingId);
            if (!existing) return prev;

            if (existing.quantity > 1) {
                return prev.map(t =>
                    t.id === toppingId
                        ? { ...t, quantity: t.quantity - 1 }
                        : t
                );
            }
            return prev.filter(t => t.id !== toppingId);
        });
    };

    // Calculate total price
    const toppingsTotal = selectedToppings.reduce((sum, t) => sum + (t.price * t.quantity), 0);
    const totalPrice = (product.sale_price + toppingsTotal) * quantity;

    // Handle confirm
    const handleConfirm = () => {
        onConfirm({
            product,
            quantity,
            selectedToppings,
            observations,
            totalPrice
        });
        onOpenChange(false);
    };

    // Filter toppings by search
    const filterToppings = (toppings: any[]) => {
        if (!searchTerm) return toppings;
        return toppings.filter(t =>
            t.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const isLoading = loadingCategories || loadingToppings;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
                {/* Header */}
                <DialogHeader className="p-4 pb-0 border-b">
                    <div className="flex items-start gap-4">
                        {product.base_image_url ? (
                            <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                                <img
                                    src={product.base_image_url}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (
                            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center text-3xl flex-shrink-0">
                                🍦
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <DialogTitle className="text-lg font-semibold line-clamp-2">
                                {product.name}
                            </DialogTitle>
                            <p className="text-primary font-bold text-lg mt-1">
                                R$ {product.sale_price.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative py-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Nome do complemento"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </DialogHeader>

                {/* Content */}
                <div className="flex-1 px-4 overflow-y-auto min-h-0">
                    {isLoading ? (
                        <div className="py-8 text-center text-muted-foreground">
                            Carregando complementos...
                        </div>
                    ) : toppingCategories?.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            Este produto não possui complementos configurados.
                        </div>
                    ) : (
                        <div className="space-y-6 py-4">
                            {Array.from(toppingsByCategory.entries()).map(([categoryId, { category, toppings }]) => {
                                const { count: selectedCount, max: maxQty, isShared, parentName } = getCategoryLimitInfo(categoryId);
                                const isRequired = category.required;
                                const minQty = category.min_quantity;
                                const isValid = isCategoryValid(category);
                                const filteredToppings = filterToppings(toppings);

                                return (
                                    <div key={categoryId} className="space-y-3">
                                        {/* Category Header */}
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-semibold text-foreground">
                                                    {category.topping_category.name}
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {isRequired
                                                        ? `Escolha ${minQty === maxQty ? minQty : `${minQty} a ${maxQty}`} opção${maxQty > 1 ? 'es' : ''}.`
                                                        : `Escolha até ${maxQty} opção${maxQty > 1 ? 'es' : ''}.`
                                                    }
                                                    {isShared && ` (compartilhado com "${parentName}")`}
                                                </p>
                                            </div>
                                            <Badge
                                                variant={isRequired && !isValid ? "destructive" : "secondary"}
                                                className={cn(
                                                    isRequired && !isValid && "bg-red-100 text-red-700 hover:bg-red-100"
                                                )}
                                            >
                                                {isRequired ? 'Obrigatório' : 'Opcional'}
                                            </Badge>
                                        </div>

                                        {/* Toppings List */}
                                        <div className="space-y-2">
                                            {filteredToppings.length === 0 ? (
                                                <p className="text-sm text-muted-foreground py-2">
                                                    Nenhum complemento encontrado nesta categoria.
                                                </p>
                                            ) : (
                                                filteredToppings.map(topping => {
                                                    const selected = selectedToppings.find(t => t.id === topping.id);
                                                    const canAdd = selectedCount < maxQty;

                                                    return (
                                                        <div
                                                            key={topping.id}
                                                            className={cn(
                                                                "flex items-center justify-between p-3 rounded-lg border transition-colors",
                                                                selected
                                                                    ? "border-primary/50 bg-primary/5"
                                                                    : "border-border hover:border-primary/30"
                                                            )}
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-medium text-sm">
                                                                    {topping.name}
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {topping.price > 0
                                                                        ? `R$ ${topping.price.toFixed(2)}`
                                                                        : 'R$ 0,00'
                                                                    }
                                                                </p>
                                                            </div>

                                                            {selected ? (
                                                                <div className="flex items-center gap-1">
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 rounded-full text-primary"
                                                                        onClick={() => removeTopping(topping.id)}
                                                                    >
                                                                        <Minus className="h-4 w-4" />
                                                                    </Button>
                                                                    <span className="w-6 text-center font-semibold">
                                                                        {selected.quantity}
                                                                    </span>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 rounded-full text-primary"
                                                                        onClick={() => addTopping(topping, categoryId)}
                                                                        disabled={!canAdd}
                                                                    >
                                                                        <Plus className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90"
                                                                    onClick={() => addTopping(topping, categoryId)}
                                                                    disabled={!canAdd}
                                                                >
                                                                    <Plus className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Observations */}
                            <div className="space-y-2 pb-2">
                                <Textarea
                                    placeholder="Observações do cliente"
                                    value={observations}
                                    onChange={(e) => setObservations(e.target.value)}
                                    className="resize-none"
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t p-4 bg-background">
                    <div className="flex items-center justify-between gap-4">
                        {/* Quantity Control */}
                        <div className="flex items-center gap-2">
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-10 w-10 rounded-full"
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                            <Button
                                size="icon"
                                className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
                                onClick={() => setQuantity(q => q + 1)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Add Button */}
                        <Button
                            className="flex-1 h-12 text-base font-bold gap-2"
                            disabled={!allRequirementsMet}
                            onClick={handleConfirm}
                        >
                            <Check className="h-5 w-5" />
                            Adicionar R$ {totalPrice.toFixed(2)}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
