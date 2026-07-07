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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToppingCategory, useToppingCategories } from '@/hooks/useToppingCategories';

const NO_PARENT = '__none__';

const toppingCategorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  parent_id: z.string().nullable().optional(),
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
  const { data: allCategories } = useToppingCategories();

  // Só categorias principais (sem pai) podem ser escolhidas como pai, para manter
  // no máximo 2 níveis (categoria -> subcategoria). Uma categoria não pode ser
  // pai dela mesma.
  const parentOptions = (allCategories || []).filter(
    (cat) => !cat.parent_id && cat.id !== category?.id
  );

  const form = useForm<ToppingCategoryFormData>({
    resolver: zodResolver(toppingCategorySchema),
    defaultValues: category || {
      name: '',
      parent_id: null,
      max_selections: null,
      display_order: 0,
    },
  });

  const handleSubmit = (data: ToppingCategoryFormData) => {
    onSubmit({ ...data, parent_id: data.parent_id || null });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
          name="parent_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria Pai</FormLabel>
              <Select
                value={field.value || NO_PARENT}
                onValueChange={(value) =>
                  field.onChange(value === NO_PARENT ? null : value)
                }
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhuma (categoria principal)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>Nenhuma (categoria principal)</SelectItem>
                  {parentOptions.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Escolha uma categoria existente para criar esta como subcategoria dela
              </FormDescription>
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
