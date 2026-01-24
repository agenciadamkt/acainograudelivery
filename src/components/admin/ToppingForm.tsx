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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from './ImageUpload';
import { useToppingCategories } from '@/hooks/useToppingCategories';
import { useUploadToppingImage } from '@/hooks/useToppings';
import { useState } from 'react';
import { Topping } from '@/hooks/useToppings';

const toppingSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  price: z.number().min(0, 'Preço deve ser maior ou igual a 0').nullable(),
  category_id: z.string().nullable(),
  image_url: z.string().nullable(),
  active: z.boolean().default(true),
  display_order: z.number().default(0),
});

type ToppingFormData = z.infer<typeof toppingSchema>;

interface ToppingFormProps {
  topping?: Topping;
  onSubmit: (data: ToppingFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ToppingForm({
  topping,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ToppingFormProps) {
  const { data: categories } = useToppingCategories();
  const uploadImage = useUploadToppingImage();
  const [imageUrl, setImageUrl] = useState(topping?.image_url || '');

  const form = useForm<ToppingFormData>({
    resolver: zodResolver(toppingSchema),
    defaultValues: topping || {
      name: '',
      price: 0,
      category_id: null,
      image_url: null,
      active: true,
      display_order: 0,
    },
  });

  const handleImageUpload = async (file: File) => {
    const url = await uploadImage.mutateAsync({ 
      file, 
      toppingId: topping?.id || 'temp-' + Date.now() 
    });
    setImageUrl(url);
    form.setValue('image_url', url);
    return url;
  };

  const handleSubmit = (data: ToppingFormData) => {
    onSubmit({ ...data, image_url: imageUrl || null });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Morango, Leite Condensado..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value || undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories && categories.length > 0 ? (
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Nenhuma categoria encontrada
                    </div>
                  )}
                </SelectContent>
              </Select>
              {(!categories || categories.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  Crie categorias de complementos primeiro na{' '}
                  <a href="/admin/menu/toppings" className="text-primary underline">
                    página de categorias
                  </a>
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preço Adicional (R$)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) =>
                    field.onChange(e.target.value ? parseFloat(e.target.value) : null)
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>Imagem</FormLabel>
          <ImageUpload
            currentImageUrl={imageUrl}
            onUpload={handleImageUpload}
            isUploading={uploadImage.isPending}
            onRemove={() => {
              setImageUrl('');
              form.setValue('image_url', null);
            }}
          />
        </div>

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

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Ativo</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
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
