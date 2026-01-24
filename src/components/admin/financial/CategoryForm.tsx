import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const categorySchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    type: z.enum(['receita', 'despesa']),
    color: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
    onSubmit: (data: CategoryFormData) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export function CategoryForm({ onSubmit, onCancel, isSubmitting }: CategoryFormProps) {
    const form = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: '',
            type: 'despesa',
            color: '#8b5cf6',
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
                                <Input {...field} placeholder="Ex: Aluguel, Insumos, etc" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="receita">Receita</SelectItem>
                                    <SelectItem value="despesa">Despesa</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cor</FormLabel>
                            <FormControl>
                                <div className="flex gap-2">
                                    <Input type="color" {...field} className="w-12 p-1 h-10" />
                                    <Input {...field} placeholder="#000000" className="flex-1" />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Salvando...' : 'Salvar Categoria'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
