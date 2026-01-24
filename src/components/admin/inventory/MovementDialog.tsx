import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateInventoryMovement } from '@/hooks/useInventoryMovements';
import { InventoryItem } from '@/hooks/useInventoryItems';

const movementSchema = z.object({
  movement_type: z.enum(['entrada', 'saida', 'ajuste', 'perda']),
  quantity: z.coerce.number().min(0.01, 'Quantidade deve ser maior que zero'),
  unit_cost: z.coerce.number().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

type MovementFormData = z.infer<typeof movementSchema>;

interface MovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
}

export function MovementDialog({ open, onOpenChange, item }: MovementDialogProps) {
  const createMovement = useCreateInventoryMovement();
  
  const form = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      movement_type: 'entrada',
      quantity: 0,
      unit_cost: undefined,
      reason: '',
      notes: '',
    },
  });

  const movementType = form.watch('movement_type');
  const quantity = form.watch('quantity');
  const unitCost = form.watch('unit_cost');

  const handleSubmit = async (data: MovementFormData) => {
    const totalCost = data.unit_cost ? data.unit_cost * data.quantity : null;
    
    await createMovement.mutateAsync({
      item_id: item.id,
      movement_type: data.movement_type,
      quantity: data.quantity,
      unit_cost: data.unit_cost || null,
      total_cost: totalCost,
      reason: data.reason || null,
      reference_id: null,
      reference_type: null,
      created_by: null,
      notes: data.notes || null,
    });

    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Movimentação de Estoque</DialogTitle>
          <p className="text-sm text-muted-foreground">{item.name}</p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                      <SelectItem value="ajuste">Ajuste</SelectItem>
                      <SelectItem value="perda">Perda</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade ({item.unit})</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} placeholder="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo Unitário (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} placeholder="Opcional" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {unitCost && quantity > 0 && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm text-muted-foreground">Custo Total</p>
                <p className="text-lg font-bold">R$ {(unitCost * quantity).toFixed(2)}</p>
              </div>
            )}

            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Estoque após movimentação</p>
              <p className="text-lg font-bold">
                {movementType === 'entrada' || movementType === 'ajuste'
                  ? (item.current_stock + quantity).toFixed(2)
                  : (item.current_stock - quantity).toFixed(2)
                } {item.unit}
              </p>
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Compra de insumos" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Observações adicionais..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMovement.isPending}>
                {createMovement.isPending ? 'Salvando...' : 'Registrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
