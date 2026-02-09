
import { useState } from 'react';
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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useStockMovements } from '@/hooks/useStockMovements';
import { useIngredients } from '@/hooks/useIngredients';

const movementSchema = z.object({
    ingredient_id: z.string().min(1, 'Selecione um ingrediente'),
    movement_type: z.enum(['entrada', 'saida', 'ajuste', 'perda']),
    quantity: z.number().min(0.001, 'Quantidade deve ser maior que 0'),
    reason: z.string().optional(),
});

type MovementFormData = z.infer<typeof movementSchema>;

interface StockMovementDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    defaultIngredientId?: string;
}

export function StockMovementDialog({
    open,
    onOpenChange,
    defaultIngredientId,
}: StockMovementDialogProps) {
    const { ingredients } = useIngredients();
    const { addMovement } = useStockMovements();

    const form = useForm<MovementFormData>({
        resolver: zodResolver(movementSchema),
        defaultValues: {
            ingredient_id: defaultIngredientId || '',
            movement_type: 'entrada',
            quantity: 0,
            reason: '',
        },
    });

    const onSubmit = async (data: MovementFormData) => {
        try {
            await addMovement.mutateAsync({
                ingredient_id: data.ingredient_id,
                movement_type: data.movement_type,
                quantity: data.quantity,
                reason: data.reason,
                user_id: 'current_user_id', // This should come from auth context normally
            });
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="ingredient_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ingrediente</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        disabled={!!defaultIngredientId}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {ingredients?.map((ing) => (
                                                <SelectItem key={ing.id} value={ing.id}>
                                                    {ing.name} ({ing.unit})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="movement_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Movimentação</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="entrada">Entrada (+)</SelectItem>
                                            <SelectItem value="saida">Saída (-)</SelectItem>
                                            <SelectItem value="perda">Perda (-)</SelectItem>
                                            <SelectItem value="ajuste">Ajuste (Correção)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Quantidade</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.001"
                                            {...field}
                                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Motivo (Opcional)</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" disabled={addMovement.isPending}>
                                {addMovement.isPending ? 'Salvando...' : 'Confirmar'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
