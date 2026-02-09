
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useIngredients } from '@/hooks/useIngredients';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const ingredientSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    category: z.string().min(1, 'Categoria é obrigatória'),
    unit: z.enum(['kg', 'g', 'l', 'ml', 'un']).default('kg'),
    cost_per_unit: z.number().min(0, 'Custo deve ser maior ou igual a 0'),
    current_stock: z.number().default(0),
    minimum_stock: z.number().default(0),
    description: z.string().optional().nullable(),
    supplier: z.string().optional().nullable(),
    is_active: z.boolean().default(true),
});

type IngredientFormData = z.infer<typeof ingredientSchema>;

interface IngredientFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ingredient?: any | null; // Ingredient type to be defined better
    onSuccess: () => void;
}

export function IngredientForm({
    open,
    onOpenChange,
    ingredient,
    onSuccess,
}: IngredientFormProps) {
    const { createIngredient, updateIngredient } = useIngredients();
    const { user } = useAuth();

    // Internal state for cost calculation
    const [purchasedQty, setPurchasedQty] = useState<number>(1);
    const [totalCost, setTotalCost] = useState<number>(0);

    const form = useForm<IngredientFormData>({
        resolver: zodResolver(ingredientSchema),
        defaultValues: {
            name: '',
            category: '',
            unit: 'kg',
            cost_per_unit: 0,
            current_stock: 0,
            minimum_stock: 5,
            description: '',
            supplier: '',
            is_active: true,
        },
    });

    // Calculate cost per unit when inputs change
    useEffect(() => {
        if (purchasedQty > 0 && totalCost >= 0) {
            const calculatedCost = totalCost / purchasedQty;
            form.setValue('cost_per_unit', parseFloat(calculatedCost.toFixed(4)));
        }
    }, [purchasedQty, totalCost, form]);

    // Load ingredient data on edit
    useEffect(() => {
        if (ingredient) {
            form.reset({
                name: ingredient.name,
                category: ingredient.category,
                unit: ingredient.unit as any,
                cost_per_unit: ingredient.cost_per_unit,
                current_stock: ingredient.current_stock,
                minimum_stock: ingredient.minimum_stock,
                description: ingredient.description || '',
                supplier: ingredient.supplier || '',
                is_active: ingredient.is_active,
            });
            // Reset calculation fields (optional, maybe set cost based on existing unit cost)
            setTotalCost(ingredient.cost_per_unit);
            setPurchasedQty(1);
        } else {
            form.reset({
                name: '',
                category: '',
                unit: 'kg',
                cost_per_unit: 0,
                current_stock: 0,
                minimum_stock: 5,
                description: '',
                supplier: '',
                is_active: true,
            });
            setTotalCost(0);
            setPurchasedQty(1);
        }
    }, [ingredient, form, open]);

    const handleSubmit = async (data: IngredientFormData) => {
        try {
            if (ingredient?.id) {
                await updateIngredient.mutateAsync({
                    id: ingredient.id,
                    ...data,
                });
            } else {
                if (!user?.id) {
                    toast.error("Erro de autenticação: Usuário não identificado.");
                    return;
                }

                await createIngredient.mutateAsync({
                    ...data,
                    user_id: user.id
                } as any);
            }
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving ingredient:", error);
            // toast error handled in hook
        }
    };

    const isSubmitting = createIngredient.isPending || updateIngredient.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {ingredient ? 'Editar Ingrediente' : 'Novo Ingrediente'}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

                        {/* Basic Info */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Açaí Tradicional" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categoria</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Frutas">Frutas</SelectItem>
                                                <SelectItem value="Complementos">Complementos</SelectItem>
                                                <SelectItem value="Caldas">Caldas</SelectItem>
                                                <SelectItem value="Outros">Outros</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unidade *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="kg">Quilograma (kg)</SelectItem>
                                                <SelectItem value="g">Grama (g)</SelectItem>
                                                <SelectItem value="l">Litro (l)</SelectItem>
                                                <SelectItem value="ml">Mililitro (ml)</SelectItem>
                                                <SelectItem value="un">Unidade (un)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Cost Calculation */}
                        <div className="bg-muted/30 p-4 rounded-lg border space-y-3">
                            <h4 className="text-sm font-medium">Cálculo de Custo</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <FormLabel className="text-xs">Qtd. Comprada ({form.watch('unit')}) *</FormLabel>
                                    <Input
                                        type="number"
                                        step="0.001"
                                        min="0.001"
                                        value={purchasedQty}
                                        onChange={(e) => setPurchasedQty(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <FormLabel className="text-xs">Custo Total (R$) *</FormLabel>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={totalCost}
                                        onChange={(e) => setTotalCost(parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            <FormField
                                control={form.control}
                                name="cost_per_unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Custo por {form.watch('unit')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                readOnly
                                                className="bg-muted font-mono"
                                                value={`R$ ${field.value?.toFixed(2) || '0.00'}`}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="supplier"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fornecedor</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: AmazFrut" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Creating a collapsible section for stock implies simple grouping for now */}
                        <div className="border rounded-lg p-4 space-y-3">
                            <h4 className="text-sm font-medium flex justify-between items-center">
                                Opções Avançadas
                            </h4>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="current_stock"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estoque Atual</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.001"
                                                    {...field}
                                                    onChange={e => field.onChange(parseFloat(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="minimum_stock"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estoque Mínimo</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.001"
                                                    {...field}
                                                    onChange={e => field.onChange(parseFloat(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Observações sobre o ingrediente"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-base">Ativo</FormLabel>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : 'Salvar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
