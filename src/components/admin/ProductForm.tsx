import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2 } from 'lucide-react';
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
import { useCategories } from '@/hooks/useCategories';
import { useUploadProductImage } from '@/hooks/useProducts';
import { useState, useEffect } from 'react';

const productSizeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome é obrigatório'),
  ml_size: z.number().nullable().optional(),
  price: z.number().min(0, 'Preço deve ser maior que 0'),
  active: z.boolean().default(true),
  display_order: z.number().default(0),
});

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  category_id: z.string().min(1, 'Categoria é obrigatória'),
  base_image_url: z.string().optional(),
  active: z.boolean().default(true),
  display_order: z.number().default(0),
  sizes: z.array(productSizeSchema).min(1, 'Adicione pelo menos um tamanho'),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: any;
  onSubmit: (data: ProductFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ProductForm({
  product,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ProductFormProps) {
  const { data: categories } = useCategories();
  const uploadImage = useUploadProductImage();
  const [imageUrl, setImageUrl] = useState(product?.base_image_url || '');

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product || {
      name: '',
      description: '',
      category_id: '',
      base_image_url: '',
      active: true,
      display_order: 0,
      sizes: [{ name: 'Padrão', price: 0, active: true, display_order: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'sizes',
  });

  // Reset form when product changes (for editing)
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name || '',
        description: product.description || '',
        category_id: product.category?.id || product.category_id || '',
        base_image_url: product.base_image_url || '',
        active: product.active ?? true,
        display_order: product.display_order ?? 0,
        sizes: product.sizes?.map((size: any) => ({
          id: size.id,
          name: size.name,
          ml_size: size.ml_size,
          price: size.price,
          active: size.active,
          display_order: size.display_order,
        })) || [{ name: 'Padrão', price: 0, active: true, display_order: 0 }],
      });
      setImageUrl(product.base_image_url || '');
    }
  }, [product, form]);

  const handleImageUpload = async (file: File) => {
    const url = await uploadImage.mutateAsync({ 
      file, 
      productId: product?.id || 'temp-' + Date.now() 
    });
    setImageUrl(url);
    form.setValue('base_image_url', url);
    return url;
  };

  const handleSubmit = (data: ProductFormData) => {
    onSubmit({ ...data, base_image_url: imageUrl });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Produto</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Açaí com Morango" {...field} />
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
                <Textarea
                  placeholder="Descrição do produto..."
                  {...field}
                  rows={3}
                />
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
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>Imagem do Produto</FormLabel>
          <ImageUpload
            currentImageUrl={imageUrl}
            onUpload={handleImageUpload}
            isUploading={uploadImage.isPending}
            onRemove={() => {
              setImageUrl('');
              form.setValue('base_image_url', '');
            }}
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Tamanhos e Preços</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                append({ name: '', price: 0, active: true, display_order: fields.length })
              }
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Tamanho
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start p-4 border rounded-lg">
              <div className="flex-1 grid grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name={`sizes.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Ex: 300ml" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`sizes.${index}.ml_size`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="ML (opcional)"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) =>
                            field.onChange(e.target.value ? parseInt(e.target.value) : null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`sizes.${index}.price`}
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Preço"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
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
