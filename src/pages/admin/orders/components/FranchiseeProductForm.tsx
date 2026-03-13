'use client';

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
    Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageUpload } from '@/components/admin/ImageUpload';
import { useState } from 'react';

const franchiseeProductSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
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

    const form = useForm<FranchiseeProductFormData>({
        resolver: zodResolver(franchiseeProductSchema),
        defaultValues: {
            name: '',
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
        },
    });

    useEffect(() => {
        if (product) {
            form.reset({
                name: product.name || '',
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
