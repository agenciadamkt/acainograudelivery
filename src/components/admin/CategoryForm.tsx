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
import { Category, useUploadCategoryImage } from '@/hooks/useCategories';
import { ImageUpload } from './ImageUpload';
import { useState } from 'react';

const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  icon: z.string().optional(),
  image_url: z.string().optional().nullable(),
  active: z.boolean().default(true),
  display_order: z.number().default(0),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  category?: Category;
  onSubmit: (data: CategoryFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function CategoryForm({
  category,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: CategoryFormProps) {
  const uploadImage = useUploadCategoryImage();
  const [imageUrl, setImageUrl] = useState(category?.image_url || '');

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: category || {
      name: '',
      icon: '',
      image_url: '',
      active: true,
      display_order: 0,
    },
  });

  const handleImageUpload = async (file: File) => {
    const url = await uploadImage.mutateAsync({
      file,
      categoryId: category?.id || 'temp-' + Date.now()
    });
    setImageUrl(url);
    form.setValue('image_url', url);
    return url;
  };

  const handleSubmit = (data: CategoryFormData) => {
    onSubmit({ ...data, image_url: imageUrl });
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
                <Input placeholder="Ex: Açaí, Sorvetes..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ícone (Emoji)</FormLabel>
              <FormControl>
                <Input placeholder="🍦" maxLength={2} {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>Imagem da Categoria</FormLabel>
          <ImageUpload
            currentImageUrl={imageUrl}
            onUpload={handleImageUpload}
            isUploading={uploadImage.isPending}
            onRemove={() => {
              setImageUrl('');
              form.setValue('image_url', '');
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
          <Button type="submit" disabled={isSubmitting || uploadImage.isPending}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
