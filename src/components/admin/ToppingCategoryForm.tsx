import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToppingCategory } from '@/hooks/useToppingCategories';

const toppingCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  max_selections: z.number().nullable().optional(),
  display_order: z.number().default(0),
});

type ToppingCategoryFormData = z.infer<typeof toppingCategorySchema>;

interface ToppingCategoryFormProps {
  category?: ToppingCategory;
  onSubmit: (data: ToppingCategoryFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ToppingCategoryForm({
  category,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ToppingCategoryFormProps) {
  const form = useForm<ToppingCategoryFormData>({
    resolver: zodResolver(toppingCategorySchema),
    defaultValues: category || {
      name: '',
      max_selections: null,
      display_order: 0,
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
              <FormLabel>Nome da Categoria</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Frutas, Caldas, Cremes..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="max_selections"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Máximo de Seleções</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Deixe vazio para ilimitado"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) =>
                    field.onChange(e.target.value ? parseInt(e.target.value) : null)
                  }
                />
              </FormControl>
              <FormDescription>
                Quantos toppings desta categoria podem ser selecionados por produto
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="display_order"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ordem de Exibição</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
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
