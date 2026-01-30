import { useState } from 'react';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { useToppingCategories } from '@/hooks/useToppingCategories';
import {
    useProductToppingCategories,
    useAddProductToppingCategory,
    useRemoveProductToppingCategory,
    useUpdateProductToppingCategory,
    ProductToppingCategory
} from '@/hooks/useProductToppingCategories';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface ProductToppingsManagerProps {
    productId: string;
}

export function ProductToppingsManager({ productId }: ProductToppingsManagerProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [editingLink, setEditingLink] = useState<ProductToppingCategory | null>(null);

    const { data: allCategories } = useToppingCategories();
    const { data: linkedCategories, isLoading } = useProductToppingCategories(productId);

    const addCategory = useAddProductToppingCategory();
    const removeCategory = useRemoveProductToppingCategory();
    const updateCategory = useUpdateProductToppingCategory();

    const availableCategories = allCategories?.filter(
        (cat) => !linkedCategories?.some((linked) => linked.topping_category_id === cat.id)
    );

    const handleAddCategory = async (categoryId: string) => {
        await addCategory.mutateAsync({ productId, categoryId });
        setIsAddDialogOpen(false);
    };

    const handleRemoveCategory = async (categoryId: string) => {
        if (confirm('Tem certeza que deseja desvincular este grupo?')) {
            await removeCategory.mutateAsync({ productId, categoryId });
        }
    };



    const saveConfig = async (data: Partial<ProductToppingCategory>) => {
        if (!editingLink) return;
        await updateCategory.mutateAsync({ id: editingLink.id, updates: data });
        setEditingLink(null);
    };

    if (isLoading) {
        return <div>Carregando complementos...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Grupos de Adicionais</h3>
                    <p className="text-sm text-muted-foreground">
                        Gerencie os grupos de complementos e suas regras para este produto.
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {linkedCategories?.length === 0 ? (
                    <EmptyState
                        onOpenAdd={() => setIsAddDialogOpen(true)}
                    />
                ) : (
                    <div className="space-y-4">
                        {linkedCategories?.map((item) => (
                            <Card key={item.id}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base font-medium flex items-center gap-2">
                                            {item.topping_category.name}
                                            {!item.active && <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">Inativo</span>}
                                            {item.required && <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">Obrigatório</span>}
                                        </CardTitle>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditingLink(item)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive"
                                            onClick={() => handleRemoveCategory(item.topping_category_id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground flex gap-4">
                                        <span>Min: {item.min_quantity}</span>
                                        <span>Max: {item.max_quantity}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        <div className="flex justify-end pt-4">
                            <Button onClick={() => setIsAddDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Vincular novo grupo
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Vincular Grupo de Adicionais</DialogTitle>
                    </DialogHeader>
                    <Command>
                        <CommandInput placeholder="Buscar categoria..." />
                        <CommandList>
                            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                            <CommandGroup>
                                {availableCategories?.map((category) => (
                                    <CommandItem
                                        key={category.id}
                                        value={category.name}
                                        onSelect={() => handleAddCategory(category.id)}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex flex-col">
                                            <span>{category.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {category.max_selections
                                                    ? `Máx: ${category.max_selections}`
                                                    : 'Ilimitado'}
                                            </span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </DialogContent>
            </Dialog>

            {/* Edit Configuration Dialog */}
            {editingLink && (
                <EditConfigDialog
                    link={editingLink}
                    open={!!editingLink}
                    onOpenChange={(open) => !open && setEditingLink(null)}
                    onSave={saveConfig}
                />
            )}
        </div>
    );
}

function EmptyState({ onOpenAdd }: { onOpenAdd: () => void }) {
    return (
        <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
            <p className="text-muted-foreground mb-4">Nenhum grupo vinculado a este produto.</p>
            <Button variant="outline" onClick={onOpenAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Vincular Grupo
            </Button>
        </div>
    );
}

function EditConfigDialog({
    link,
    open,
    onOpenChange,
    onSave
}: {
    link: ProductToppingCategory;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: Partial<ProductToppingCategory>) => void;
}) {
    const [minQty, setMinQty] = useState(link.min_quantity);
    const [maxQty, setMaxQty] = useState(link.max_quantity);
    const [required, setRequired] = useState(link.required);
    const [active, setActive] = useState(link.active);

    const handleSave = () => {
        onSave({
            min_quantity: minQty,
            max_quantity: maxQty,
            required,
            active
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Configurar: {link.topping_category.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">

                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label>Disponibilidade</Label>
                            <p className="text-sm text-muted-foreground">O grupo está ativo para este produto?</p>
                        </div>
                        <Switch checked={active} onCheckedChange={setActive} />
                    </div>

                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label>Obrigatório</Label>
                            <p className="text-sm text-muted-foreground">O cliente deve selecionar opções?</p>
                        </div>
                        <Switch checked={required} onCheckedChange={setRequired} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Quantidade Mínima</Label>
                            <Input
                                type="number"
                                min={0}
                                value={minQty}
                                onChange={(e) => setMinQty(parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Quantidade Máxima</Label>
                            <Input
                                type="number"
                                min={1}
                                value={maxQty}
                                onChange={(e) => setMaxQty(parseInt(e.target.value) || 1)}
                            />
                        </div>
                    </div>

                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
