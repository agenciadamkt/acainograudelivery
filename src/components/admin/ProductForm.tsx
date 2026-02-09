
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductRecipeManager } from './ProductRecipeManager';
import { ProductToppingsManager } from './ProductToppingsManager';
import { ProductVideosManager } from './ProductVideosManager';
import { ProductPricingManager } from './ProductPricingManager';
import { ProductSizesManager } from './ProductSizesManager';

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional().nullable(),
  category_id: z.string().min(1, 'Selecione uma categoria válida'),
  code: z.string().optional().nullable(),
  sale_price: z.number().min(0, 'Preço de venda deve ser maior que 0'),
  cost_price: z.number().min(0, 'Preço de custo deve ser maior ou igual a 0').default(0),
  profit_margin: z.number().optional(), // Calculated, but can be submitted
  sale_type: z.enum(['unidade', 'peso']).default('unidade'),
  unit: z.string().min(1, 'Unidade é obrigatória').default('un'),
  current_stock: z.number().default(0),
  minimum_stock: z.number().default(0),
  base_image_url: z.string().optional().nullable(),
  active: z.boolean().default(true),
  display_order: z.number().default(0),
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
  const { data: categories, isLoading: isLoadingCategories } = useCategories(true);
  const uploadImage = useUploadProductImage();
  const [imageUrl, setImageUrl] = useState(product?.base_image_url || '');

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      category_id: '',
      code: '',
      sale_price: 0,
      cost_price: 0,
      sale_type: 'unidade',
      unit: 'un',
      current_stock: 0,
      minimum_stock: 5,
      base_image_url: '',
      active: true,
      display_order: 0,
    },
  });

  // Reset form when product changes (for editing)
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name || '',
        description: product.description || '',
        category_id: product.category?.id || product.category_id || '',
        code: product.code || '',
        sale_price: product.sale_price || 0,
        cost_price: product.cost_price || 0,
        sale_type: product.sale_type || 'unidade',
        unit: product.unit || 'un',
        current_stock: product.current_stock || 0,
        minimum_stock: product.minimum_stock || 0,
        base_image_url: product.base_image_url || '',
        active: product.active ?? true,
        display_order: product.display_order ?? 0,
      });
      setImageUrl(product.base_image_url || '');
    }
  }, [product, form]);

  // Calculate profit margin on price change
  const salePrice = form.watch('sale_price');
  const costPrice = form.watch('cost_price');

  useEffect(() => {
    if (salePrice > 0 && costPrice >= 0) {
      const margin = ((salePrice - costPrice) / salePrice) * 100;
      form.setValue('profit_margin', parseFloat(margin.toFixed(2)));
    }
  }, [salePrice, costPrice, form]);

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
    <div className="h-full flex flex-col">
      <Tabs defaultValue="details" className="w-full flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="recipe" disabled={!product?.id}>
            Receita
          </TabsTrigger>
          <TabsTrigger value="pricing" disabled={!product?.id}>
            Preços
          </TabsTrigger>
          <TabsTrigger value="toppings" disabled={!product?.id}>
            Complementos
          </TabsTrigger>
          <TabsTrigger value="videos" disabled={!product?.id}>
            Vídeos
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto py-4 px-1">
          <TabsContent value="details" className="mt-0 space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Nome do Produto <span className="text-destructive">*</span></FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Açaí com Morango" {...field} />
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
                        <FormLabel>Categoria <span className="text-destructive">*</span></FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className={!field.value ? "text-muted-foreground" : ""}>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingCategories ? (
                              <div className="p-2 text-sm text-center text-muted-foreground">Carregando...</div>
                            ) : categories?.length === 0 ? (
                              <div className="p-2 text-sm text-center text-muted-foreground">Nenhuma categoria cadastrada</div>
                            ) : (
                              categories?.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código / SKU</FormLabel>
                        <FormControl>
                          <Input placeholder="Opcional" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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
                          value={field.value || ''}
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pricing & Unit */}
                <div className="grid grid-cols-3 gap-4 p-4 border rounded-md">
                  <div className="col-span-3 font-medium mb-2">Precificação</div>

                  <FormField
                    control={form.control}
                    name="sale_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço de Venda (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
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
                    name="cost_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço de Custo (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          {product?.id ? 'Pode ser atualizado pela ficha técnica.' : 'Estimado.'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem>
                    <FormLabel>Margem (%)</FormLabel>
                    <FormControl>
                      <Input
                        value={form.watch('profit_margin')?.toFixed(2) || '0.00'}
                        disabled
                        className="bg-muted"
                      />
                    </FormControl>
                  </FormItem>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 border rounded-md">
                  <div className="col-span-2 font-medium mb-2">Estoque e Unidade</div>

                  <FormField
                    control={form.control}
                    name="sale_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Venda</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unidade">Por Unidade</SelectItem>
                            <SelectItem value="peso">Por Peso (kg)</SelectItem>
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
                        <FormLabel>Unidade de Medida</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="un">Unidade (un)</SelectItem>
                            <SelectItem value="kg">Quilograma (kg)</SelectItem>
                            <SelectItem value="l">Litro (l)</SelectItem>
                            <SelectItem value="ml">Mililitro (ml)</SelectItem>
                            <SelectItem value="g">Grama (g)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="current_stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estoque Atual</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
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
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Product Sizes - Only for existing products */}
                {product?.id && (
                  <ProductSizesManager productId={product.id} />
                )}

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

                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel className="m-0">Produto Ativo</FormLabel>
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
                            min={0}
                            className="w-24"
                            placeholder="0"
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Menor número = aparece primeiro no PDV
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t mt-8">
                  <Button type="button" variant="outline" onClick={onCancel}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Salvando...' : 'Salvar Produto'}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="toppings" className="mt-0 h-full">
            {product?.id ? (
              <ProductToppingsManager productId={product.id} />
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                Salve o produto primeiro para configurar os complementos.
              </div>
            )}
          </TabsContent>

          <TabsContent value="videos" className="mt-0 h-full">
            {product?.id ? (
              <ProductVideosManager productId={product.id} />
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                Salve o produto primeiro para adicionar vídeos.
              </div>
            )}
          </TabsContent>

          <TabsContent value="recipe" className="mt-0 h-full">
            {product?.id ? (
              <ProductRecipeManager productId={product.id} />
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                Salve o produto primeiro para configurar a receita.
              </div>
            )}
          </TabsContent>

          <TabsContent value="pricing" className="mt-0 h-full">
            {product?.id ? (
              <ProductPricingManager
                productId={product.id}
                costPrice={form.watch('cost_price')}
                salePrice={form.watch('sale_price')}
                onPriceChange={(price) => form.setValue('sale_price', price)}
              />
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                Salve o produto primeiro para configurar os preços.
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
