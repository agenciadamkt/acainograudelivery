import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { InventoryItem } from '@/hooks/useInventoryItems';

const itemSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unidade é obrigatória'),
  current_stock: z.coerce.number().min(0, 'Estoque não pode ser negativo'),
  min_stock: z.coerce.number().min(0, 'Estoque mínimo não pode ser negativo'),
  max_stock: z.coerce.number().optional(),
  unit_cost: z.coerce.number().min(0, 'Custo não pode ser negativo'),
  supplier: z.string().optional(),
  active: z.boolean().default(true),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface InventoryItemFormProps {
  item?: InventoryItem;
  onSubmit: (data: ItemFormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function InventoryItemForm({ item, onSubmit, onCancel, isSubmitting }: InventoryItemFormProps) {
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: item?.name || '',
      description: item?.description || '',
      unit: item?.unit || 'unidade',
      current_stock: item?.current_stock || 0,
      min_stock: item?.min_stock || 0,
      max_stock: item?.max_stock || undefined,
      unit_cost: item?.unit_cost || 0,
      supplier: item?.supplier || '',
      active: item?.active ?? true,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Item</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ex: Açaí Polpa" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Descrição do item..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidade</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="kg">Quilograma (kg)</SelectItem>
                    <SelectItem value="g">Grama (g)</SelectItem>
                    <SelectItem value="L">Litro (L)</SelectItem>
                    <SelectItem value="ml">Mililitro (ml)</SelectItem>
                    <SelectItem value="unidade">Unidade</SelectItem>
                  </SelectContent>
                </Select>
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
                  <Input type="number" step="0.01" {...field} placeholder="0.00" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="current_stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estoque Atual</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} placeholder="0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="min_stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estoque Mínimo</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} placeholder="0" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estoque Máximo</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" {...field} placeholder="Opcional" />
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
                <Input {...field} placeholder="Nome do fornecedor" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Ativo</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Item disponível para uso
                </div>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
