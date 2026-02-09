
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';


export interface ProductCategory {
    id: string;
    user_id?: string;
    name: string;
    description?: string | null;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export function useProductCategories() {
    return useQuery({
        queryKey: ['product_categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('product_categories')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;
            return data as ProductCategory[];
        }
    });
}

export function useCreateProductCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (category: Omit<ProductCategory, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
            const { data, error } = await supabase
                .from('product_categories')
                .insert(category)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product_categories'] });
            toast.success('Categoria criada com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao criar categoria: ${error.message}`);
        },
    });
}

export function useUpdateProductCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<ProductCategory> & { id: string }) => {
            const { error } = await supabase
                .from('product_categories')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            return { id, ...updates };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product_categories'] });
            toast.success('Categoria atualizada com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao atualizar categoria: ${error.message}`);
        },
    });
}

export function useDeleteProductCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('product_categories')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product_categories'] });
            toast.success('Categoria excluída com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao excluir categoria: ${error.message}`);
        },
    });
}
