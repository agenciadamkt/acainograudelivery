'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import GlobalDistributionCenterSelect from '@/components/admin/GlobalDistributionCenterSelect';
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
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import {
    Info,
    DollarSign,
    Percent,
    Package,
    Tag,
    Layers,
    Hash,
    Sparkles,
    CheckCircle2,
    Image as ImageIcon,
    Plus,
    X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { useState } from 'react';

const franchiseeProductSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    brand: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    category_id: z.string().min(1, 'Selecione uma categoria'),
    price: z.number().min(0, 'Preço deve ser maior ou igual a 0'),
    unit: z.string().min(1, 'Unidade é obrigatória').default('un'),
    image_url: z.string().optional().nullable(),
    taxa: z.number().min(0, 'Taxa deve ser maior ou igual a 0').default(0),
    has_advertising_fee: z.boolean().default(false),
    advertising_fee_percentage: z.number().min(0).max(100).default(0),
    active: z.boolean().default(true),
    display_order: z.number().default(0),
    code: z.string().optional().nullable(),
    current_stock: z.number().default(0),
    distribution_center_id: z.string().optional().nullable(),
    ingredients: z.string().optional().nullable(),
    nutritional_info: z.any().optional(),
    has_nutrition_facts: z.boolean().default(false),
    gallery_images: z.array(z.string()).default([]),
    related_product_ids: z.array(z.string()).default([]),
});

type FranchiseeProductFormData = z.infer<typeof franchiseeProductSchema>;

interface FranchiseeProductFormProps {
    product?: any;
    onSubmit: (data: FranchiseeProductFormData) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export function FranchiseeProductForm({
    product,
    onSubmit,
    onCancel,
    isSubmitting = false,
}: FranchiseeProductFormProps) {
    const [isUploading, setIsUploading] = useState(false);

    const { data: categories } = useQuery({
        queryKey: ['franchisee_categories_active'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('franchisee_product_categories' as any)
                .select('*')
                .eq('active', true)
                .order('display_order', { ascending: true });
            if (error) throw error;
            return data as any[];
        }
    });
    
    const { data: allProducts } = useQuery({
        queryKey: ['franchisee_products_all'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('franchisee_products' as any)
                .select('id, name')
                .eq('active', true);
            if (error) throw error;
            return data as any[];
        }
    });

    const form = useForm<FranchiseeProductFormData>({
        resolver: zodResolver(franchiseeProductSchema),
        defaultValues: {
            name: '',
            brand: '',
            description: '',
            category_id: '',
            price: 0,
            unit: 'un',
            image_url: '',
            taxa: 0,
            has_advertising_fee: false,
            advertising_fee_percentage: 0,
            active: true,
            display_order: 0,
            code: '',
            current_stock: 0,
            distribution_center_id: null,
            ingredients: '',
            nutritional_info: {},
            has_nutrition_facts: false,
            gallery_images: [],
            related_product_ids: [],
        },
    });

    useEffect(() => {
        if (product) {
            form.reset({
                name: product.name || '',
                brand: product.brand || '',
                description: product.description || '',
                category_id: product.category_id || '',
                price: product.price || 0,
                unit: product.unit || 'un',
                image_url: product.image_url || '',
                taxa: product.taxa || 0,
                has_advertising_fee: product.has_advertising_fee ?? false,
                advertising_fee_percentage: product.advertising_fee_percentage || 0,
                active: product.active ?? true,
                display_order: product.display_order ?? 0,
                code: product.code || '',
                current_stock: product.current_stock || 0,
                distribution_center_id: product.distribution_center_id || null,
                ingredients: product.ingredients || '',
                nutritional_info: product.nutritional_info || {},
                has_nutrition_facts: product.has_nutrition_facts ?? false,
                gallery_images: product.gallery_images || [],
                related_product_ids: product.related_product_ids || [],
            });
        }
    }, [product, form]);

    const handleImageUpload = async (file: File): Promise<string> => {
        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError, data } = await supabase.storage
                .from('products')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('products')
                .getPublicUrl(filePath);

            form.setValue('image_url', publicUrl);
            return publicUrl;
        } catch (error: any) {
            console.error('Error uploading image:', error);
            throw error;
        } finally {
            setIsUploading(false);
        }
    };

    const handleGalleryUpload = async (file: File) => {
        const url = await handleImageUpload(file);
        const currentGallery = form.getValues('gallery_images') || [];
        form.setValue('gallery_images', [...currentGallery, url]);
    };

    const removeGalleryImage = (url: string) => {
        const currentGallery = form.getValues('gallery_images') || [];
        form.setValue('gallery_images', currentGallery.filter(img => img !== url));
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-2">
                {/* Image Section */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                        <ImageIcon className="h-4 w-4" />
                        <h3 className="text-xs font-black uppercase tracking-widest">Imagem do Produto</h3>
                    </div>

                    <FormField
                        control={form.control}
                        name="image_url"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <ImageUpload
                                        currentImageUrl={field.value}
                                        onUpload={handleImageUpload}
                                        isUploading={isUploading}
                                        onRemove={() => form.setValue('image_url', '')}
                                        className="bg-white/50 dark:bg-white/5 rounded-3xl overflow-hidden border-2 border-dashed border-gray-100 dark:border-white/10"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Basic Information Section */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                        <Tag className="h-4 w-4" />
                        <h3 className="text-xs font-black uppercase tracking-widest">Informações Básicas</h3>
                    </div>

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">Nome do Insumo <span className="text-rose-500">*</span></FormLabel>
                                <FormControl>
                                    <div className="relative group">
                                        <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                        <Input
                                            placeholder="Ex: Açaí Médio 10L"
                                            className="pl-12 h-14 rounded-2xl border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 focus-visible:ring-purple-500 focus-visible:border-purple-500 transition-all font-medium"
                                            {...field}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="brand"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2">Marca <span className="text-gray-400 text-[10px] font-normal">(opcional)</span></FormLabel>
                                <FormControl>
                                    <div className="relative group">
                                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                        <Input
                                            placeholder="Ex: Nestlé, Unilever, Açaí no Grau..."
                                            className="pl-12 h-14 rounded-2xl border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 focus-visible:ring-purple-500 focus-visible:border-purple-500 transition-all font-medium"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField
                            control={form.control}
                            name="category_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">Categoria <span className="text-rose-500">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-14 rounded-2xl border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 focus-visible:ring-purple-500 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Layers className="h-4 w-4 text-gray-400" />
                                                    <SelectValue placeholder="Selecione..." />
                                                </div>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="rounded-2xl border-gray-100 dark:border-white/10 p-2">
                                            {categories?.map((cat) => (
                                                <SelectItem key={cat.id} value={cat.id} className="rounded-xl">
                                                    {cat.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="text-[10px] font-bold" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="unit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">Unidade <span className="text-rose-500">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-14 rounded-2xl border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 focus-visible:ring-purple-500 font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Info className="h-4 w-4 text-gray-400" />
                                                    <SelectValue placeholder="Selecione..." />
                                                </div>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="rounded-2xl border-gray-100 dark:border-white/10 p-2">
                                            <SelectItem value="un" className="rounded-xl">Unidade (un)</SelectItem>
                                            <SelectItem value="cx" className="rounded-xl">Caixa (cx)</SelectItem>
                                            <SelectItem value="kg" className="rounded-xl">Quilograma (kg)</SelectItem>
                                            <SelectItem value="l" className="rounded-xl">Litro (l)</SelectItem>
                                            <SelectItem value="pt" className="rounded-xl">Pote (pt)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="text-[10px] font-bold" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">Preço de Venda</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400 group-focus-within:text-purple-500 transition-colors">R$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="pl-12 h-14 rounded-2xl border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 focus-visible:ring-purple-500 font-medium"
                                                {...field}
                                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-bold" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="display_order"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">Ordem de Exibição</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                            <Input
                                                type="number"
                                                className="pl-12 h-14 rounded-2xl border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 focus-visible:ring-purple-500 font-medium"
                                                {...field}
                                                onChange={e => field.onChange(parseInt(e.target.value))}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-bold" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-white/80">Código</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                            <Input
                                                placeholder="Código do Cefas"
                                                className="pl-12 h-14 rounded-2xl border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 focus-visible:ring-purple-500 font-medium"
                                                {...field}
                                                value={field.value || ''}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-bold" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="current_stock"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-white/80">Estoque Atual</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-purple-500 transition-colors" />
                                            <Input
                                                type="number"
                                                className="pl-12 h-14 rounded-2xl border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 focus-visible:ring-purple-500 font-black"
                                                {...field}
                                                onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-bold" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="distribution_center_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-white/80">Centro de Distribuição</FormLabel>
                                    <FormControl>
                                        <GlobalDistributionCenterSelect
                                            value={field.value || null}
                                            onChange={field.onChange}
                                            className="h-14 rounded-2xl"
                                        />
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-bold" />
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
                                        placeholder="Descrição opcional..."
                                        className="rounded-2xl border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 focus-visible:ring-purple-500 min-h-[100px] font-medium resize-none shadow-sm"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Fees Rules Bento Section */}
                <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-white dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-transparent border border-gray-200/50 dark:border-white/10 space-y-6 relative overflow-hidden group shadow-xl shadow-purple-500/5">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                        <Sparkles className="h-12 w-12 text-purple-600" />
                    </div>

                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-4">
                        <DollarSign className="h-4 w-4" />
                        <h3 className="text-xs font-black uppercase tracking-widest">Regras de Taxas</h3>
                    </div>

                    <FormField
                        control={form.control}
                        name="taxa"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <div className="flex items-center justify-between px-1">
                                    <FormLabel className="text-sm font-bold">Taxa Boleto (R$)</FormLabel>
                                    <Badge variant="outline" className="text-[9px] uppercase font-black border-purple-200/50 dark:border-white/10 text-purple-600">Fixo por Unidade</Badge>
                                </div>
                                <FormControl>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">R$</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            className="pl-12 h-14 rounded-2xl border-0 bg-white/80 dark:bg-white/5 shadow-sm focus-visible:ring-purple-500 font-black text-lg text-purple-600"
                                            {...field}
                                            onChange={e => field.onChange(parseFloat(e.target.value))}
                                        />
                                    </div>
                                </FormControl>
                                <FormDescription className="text-[10px] font-medium leading-relaxed px-1">
                                    Este valor será somado ao preço unitário se o método de pagamento for <span className="font-bold text-gray-900 dark:text-white">Boleto</span>.
                                </FormDescription>
                                <FormMessage className="text-[10px] font-bold" />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                        <FormField
                            control={form.control}
                            name="has_advertising_fee"
                            render={({ field }) => (
                                <FormItem className={cn(
                                    "md:col-span-7 flex flex-row items-center justify-between rounded-3xl border border-gray-200/50 p-4 shadow-sm transition-all duration-300",
                                    field.value ? "bg-white dark:bg-black border-purple-500/50 ring-2 ring-purple-500/10" : "bg-white/40 dark:bg-white/5 border-transparent"
                                )}>
                                    <div className="space-y-0.5">
                                        <FormLabel className="font-bold flex items-center gap-2">
                                            Taxa Publicidade
                                            {field.value && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                                        </FormLabel>
                                        <FormDescription className="text-[10px] font-medium leading-[1.2]">Ativar cobrança percentual para este produto</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                            className="data-[state=checked]:bg-purple-600"
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="advertising_fee_percentage"
                            render={({ field }) => (
                                <FormItem className="md:col-span-5">
                                    <FormControl>
                                        <div className="relative group h-full">
                                            <Percent className={cn(
                                                "absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                                                form.watch('has_advertising_fee') ? "text-purple-500" : "text-gray-300"
                                            )} />
                                            <Input
                                                type="number"
                                                step="0.1"
                                                placeholder="0.0 %"
                                                disabled={!form.watch('has_advertising_fee')}
                                                className="pl-12 h-full min-h-[64px] rounded-3xl border-0 bg-white/80 dark:bg-white/5 shadow-sm focus-visible:ring-purple-500 font-black text-lg disabled:opacity-40 transition-all placeholder:text-gray-300"
                                                {...field}
                                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-bold" />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Product Detail Page Features */}
                <div className="p-8 rounded-[2.5rem] bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 space-y-8">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <Sparkles className="h-4 w-4" />
                        <h3 className="text-xs font-black uppercase tracking-widest">Detalhes da Página do Produto</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <FormField
                                control={form.control}
                                name="has_nutrition_facts"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-3xl border border-gray-100 dark:border-white/5 p-5 bg-white/30 dark:bg-white/5">
                                        <div className="space-y-0.5">
                                            <FormLabel className="font-bold">Informações Nutricionais</FormLabel>
                                            <FormDescription className="text-[10px]">Exibir tabela nutricional na página</FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                className="data-[state=checked]:bg-purple-600"
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            {form.watch('has_nutrition_facts') && (
                                <div className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="ingredients"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-bold">Ingredientes</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Liste os ingredientes..."
                                                        className="rounded-2xl border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 focus-visible:ring-purple-500 min-h-[120px] resize-none"
                                                        {...field}
                                                        value={field.value || ''}
                                                    />
                                                </FormControl>
                                                <FormMessage className="text-[10px]" />
                                            </FormItem>
                                        )}
                                    />

                                    {/* Tabela Nutricional */}
                                    <div className="rounded-2xl border border-purple-100 dark:border-purple-900/30 bg-purple-50/50 dark:bg-purple-900/10 p-4 space-y-3">
                                        <p className="text-xs font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">Tabela Nutricional <span className="text-[10px] font-normal normal-case">(por porção)</span></p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { key: 'calories', label: 'Valor Energético', suffix: 'kcal', placeholder: '240' },
                                                { key: 'protein',  label: 'Proteínas',        suffix: 'g',    placeholder: '4.5' },
                                                { key: 'carbs',    label: 'Carboidratos',     suffix: 'g',    placeholder: '48'  },
                                                { key: 'fat',      label: 'Gorduras Totais',  suffix: 'g',    placeholder: '2.1' },
                                                { key: 'fiber',    label: 'Fibras',           suffix: 'g',    placeholder: '1.2' },
                                                { key: 'sodium',   label: 'Sódio',            suffix: 'mg',   placeholder: '0'   },
                                            ].map(({ key, label, suffix, placeholder }) => (
                                                <div key={key} className="space-y-1">
                                                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{label}</label>
                                                    <div className="flex items-center gap-1">
                                                        <Input
                                                            type="number"
                                                            placeholder={placeholder}
                                                            className="rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/10 focus-visible:ring-purple-500 h-8 text-sm"
                                                            value={form.watch('nutritional_info')?.[key] ?? ''}
                                                            onChange={(e) => {
                                                                const current = form.getValues('nutritional_info') || {};
                                                                form.setValue('nutritional_info', {
                                                                    ...current,
                                                                    [key]: e.target.value === '' ? '' : parseFloat(e.target.value)
                                                                });
                                                            }}
                                                        />
                                                        <span className="text-xs text-gray-400 w-8 shrink-0">{suffix}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <FormField
                                control={form.control}
                                name="related_product_ids"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-bold">Produtos Relacionados</FormLabel>
                                        <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto p-4 rounded-2xl bg-white/30 dark:bg-white/5 border border-gray-100 dark:border-white/5 custom-scrollbar">
                                            {allProducts?.filter(p => p.id !== product?.id).map((p) => {
                                                const isSelected = field.value?.includes(p.id);
                                                return (
                                                    <div
                                                        key={p.id}
                                                        onClick={() => {
                                                            const current = field.value || [];
                                                            if (isSelected) {
                                                                field.onChange(current.filter(id => id !== p.id));
                                                            } else {
                                                                field.onChange([...current, p.id]);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                                                            isSelected 
                                                                ? "bg-purple-500/10 border-purple-500/30 text-purple-700 dark:text-purple-300" 
                                                                : "bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-white/5"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                            isSelected ? "bg-purple-600 border-purple-600" : "border-gray-300"
                                                        )}>
                                                            {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                                                        </div>
                                                        <span className="text-xs font-medium">{p.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <FormDescription className="text-[10px]">Selecione produtos para recomendar.</FormDescription>
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-6">
                            <FormItem>
                                <FormLabel className="font-bold mb-3 block">Galeria de Fotos</FormLabel>
                                <div className="grid grid-cols-3 gap-3">
                                    {form.watch('gallery_images')?.map((url, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100 dark:border-white/10">
                                            <img src={url} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeGalleryImage(url)}
                                                className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!form.watch('gallery_images') || form.watch('gallery_images').length < 6) && (
                                        <div className="aspect-square rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                            <label className="cursor-pointer flex flex-col items-center gap-1 w-full h-full justify-center">
                                                <Plus className="h-5 w-5 text-gray-400 group-hover:text-purple-500 transition-colors" />
                                                <span className="text-[10px] font-bold text-gray-400">Adicionar</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleGalleryUpload(file);
                                                    }}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                                <FormDescription className="text-[10px]">Adicione até 6 fotos extras para a galeria.</FormDescription>
                            </FormItem>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between p-2">
                    <FormField
                        control={form.control}
                        name="active"
                        render={({ field }) => (
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className="data-[state=checked]:bg-emerald-500"
                                    />
                                </FormControl>
                                <FormLabel className="m-0 cursor-pointer font-bold text-sm text-gray-600 dark:text-gray-400">
                                    Insumo disponível no catálogo
                                </FormLabel>
                            </FormItem>
                        )}
                    />

                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onCancel}
                            className="rounded-2xl h-14 px-8 font-bold hover:bg-gray-100 dark:hover:bg-white/5 active:scale-95 transition-all"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-2xl h-14 px-10 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black shadow-xl shadow-purple-500/20 active:scale-95 transition-all"
                        >
                            {isSubmitting ? 'Salvando...' : 'Salvar Insumo'}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}
