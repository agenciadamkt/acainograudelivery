
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIngredients, Ingredient } from '@/hooks/useIngredients';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

interface IngredientFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    ingredient?: Ingredient | null;
}

interface FormData {
    name: string;
    description: string;
    category: string;
    unit: string;
    purchased_quantity: number; // For cost calculation
    total_cost_paid: number;    // For cost calculation
    current_stock: number;
    minimum_stock: number;
}

export function IngredientFormDialog({ open, onOpenChange, ingredient }: IngredientFormDialogProps) {
    const { createIngredient, updateIngredient } = useIngredients();
    const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormData>();

    // Watch fields for cost calculation
    const purchasedQuantity = watch('purchased_quantity', 0);
    const totalCost = watch('total_cost_paid', 0);
    const costPerUnit = purchasedQuantity > 0 ? totalCost / purchasedQuantity : 0;

    useEffect(() => {
        if (ingredient) {
            // Edit Mode
            setValue('name', ingredient.name);
            setValue('description', ingredient.description || '');
            setValue('category', ingredient.category);
            setValue('unit', ingredient.unit);
            setValue('ticket_cost_unit', ingredient.cost_per_unit || 0); // We set cost directly
            setValue('current_stock', ingredient.current_stock || 0);
            setValue('minimum_stock', ingredient.minimum_stock || 0);
            // For edit, purchased fields are tricky. Maybe just show current cost.
            // If user wants to UPDATE cost, they enter new purchase.
            // Let's reset purchase fields for clarity on edit.
        } else {
            reset({
                name: '',
                category: 'geral',
                unit: 'kg',
                purchased_quantity: 0,
                total_cost_paid: 0,
                current_stock: 0,
                minimum_stock: 0
            });
        }
    }, [ingredient, open, setValue, reset]);

    const onSubmit = (data: FormData) => {
        const payload = {
            name: data.name,
            description: data.description,
            category: data.category,
            unit: data.unit,
            cost_per_unit: costPerUnit, // Calculated
            current_stock: Number(data.current_stock),
            minimum_stock: Number(data.minimum_stock),
            is_active: true
        };

        // If user didn't enter purchase info on edit, keep old cost? 
        // Or if costPerUnit is 0 (and purchasedQuantity is 0), maybe user edited cost manually?
        // Let's assume if purchasedQuantity > 0, we update cost. If 0, we keep old (for edit) or use 0.
        if (ingredient && purchasedQuantity === 0) {
            payload.cost_per_unit = ingredient.cost_per_unit;
        } else if (costPerUnit === 0 && !ingredient) {
            toast.warning("Custo por unidade é zero. Verifique os valores de compra.");
        }

        if (ingredient) {
            updateIngredient.mutate({ id: ingredient.id, ...payload }, {
                onSuccess: () => onOpenChange(false)
            });
        } else {
            createIngredient.mutate(payload as any, { // Type casting due to strict hook types vs partial payload
                onSuccess: () => onOpenChange(false)
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{ingredient ? 'Editar Ingrediente' : 'Novo Ingrediente'}</DialogTitle>
                    <DialogDescription>
                        Cadastre a matéria-prima e calcule o custo automaticamente.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input {...register('name', { required: true })} placeholder="Ex: Polpa de Açaí" />
                            {errors.name && <span className="text-red-500 text-xs">Obrigatório</span>}
                        </div>
                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select onValueChange={(v) => setValue('category', v)} defaultValue={ingredient?.category || "geral"}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="geral">Geral</SelectItem>
                                    <SelectItem value="frutas">Frutas</SelectItem>
                                    <SelectItem value="laticínios">Laticínios</SelectItem>
                                    <SelectItem value="embalagens">Embalagens</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Descrição (Opcional)</Label>
                        <Input {...register('description')} />
                    </div>

                    <div className="grid grid-cols-3 gap-4 border-t pt-4">
                        <div className="col-span-3 font-semibold text-sm">Cálculo de Custo</div>

                        <div className="space-y-2">
                            <Label>Unidade de Medida</Label>
                            <Select onValueChange={(v) => setValue('unit', v)} defaultValue={ingredient?.unit || "kg"}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kg">Quilograma (KG)</SelectItem>
                                    <SelectItem value="g">Grama (G)</SelectItem>
                                    <SelectItem value="L">Litro (L)</SelectItem>
                                    <SelectItem value="ml">Mililitro (ML)</SelectItem>
                                    <SelectItem value="un">Unidade (UN)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Qtd. Comprada</Label>
                            <Input
                                type="number" step="0.01"
                                {...register('purchased_quantity', { valueAsNumber: true })}
                                placeholder="Ex: 10"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Custo Total Pago (R$)</Label>
                            <Input
                                type="number" step="0.01"
                                {...register('total_cost_paid', { valueAsNumber: true })}
                                placeholder="Ex: 250.00"
                            />
                        </div>

                        <div className="col-span-3 bg-muted p-2 rounded text-center">
                            <span className="text-sm font-medium">Custo Calculado: </span>
                            <span className="text-lg font-bold text-primary">
                                R$ {costPerUnit.toFixed(2)} / {watch('unit')}
                            </span>
                            {ingredient && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Atual: R$ {ingredient.cost_per_unit.toFixed(2)}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                        <div className="col-span-2 font-semibold text-sm">Estoque Inicial</div>
                        <div className="space-y-2">
                            <Label>Estoque Atual</Label>
                            <Input
                                type="number" step="0.01"
                                {...register('current_stock', { valueAsNumber: true })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Estoque Mínimo (Alerta)</Label>
                            <Input
                                type="number" step="0.01"
                                {...register('minimum_stock', { valueAsNumber: true })}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit">Salvar</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
