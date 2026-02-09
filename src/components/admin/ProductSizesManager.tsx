import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import {
    useProductSizes,
    useCreateProductSize,
    useUpdateProductSize,
    useDeleteProductSize,
    ProductSize
} from '@/hooks/useProductSizes';

interface ProductSizesManagerProps {
    productId: string;
}

export function ProductSizesManager({ productId }: ProductSizesManagerProps) {
    const { data: sizes, isLoading } = useProductSizes(productId);
    const createSize = useCreateProductSize();
    const updateSize = useUpdateProductSize();
    const deleteSize = useDeleteProductSize();

    // New size form state
    const [newSizeName, setNewSizeName] = useState('');
    const [newSizeMl, setNewSizeMl] = useState<number | ''>('');
    const [newSizePrice, setNewSizePrice] = useState<number | ''>(0);
    const [newSizePromoPrice, setNewSizePromoPrice] = useState<number | ''>('');

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

    if (isLoading) {
        return (
            <div className="border rounded-md p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
                <div className="h-10 bg-muted rounded"></div>
            </div>
        );
    }

    return (
        <div className="border rounded-md p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                    <Package className="h-4 w-4 text-purple-500" />
                    Tamanhos e Preços
                </div>
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

            {/* Sizes Header */}
            {sizes && sizes.length > 0 && (
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
                                placeholder="Deixe vazio se não"
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

            {(!sizes || sizes.length === 0) && !newSizeName && (
                <p className="text-sm text-muted-foreground text-center py-2">
                    Adicione tamanhos para configurar diferentes preços e opções para este produto.
                </p>
            )}
        </div>
    );
}
