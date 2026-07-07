
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FranchiseeProductCategory {
    id: string;
    name: string;
    active: boolean;
    display_order: number;
    icon_url: string | null;
    created_at?: string;
}

export function useFranchiseeProductCategories() {
    return useQuery({
        queryKey: ['franchisee_categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('franchisee_product_categories' as any)
                .select('*')
                .order('display_order', { ascending: true })
                .order('name', { ascending: true });

            if (error) throw error;
            return (data as unknown) as FranchiseeProductCategory[];
        }
    });
}

export function useCreateFranchiseeProductCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (category: Omit<FranchiseeProductCategory, 'id' | 'created_at'>) => {
            const { data, error } = await supabase
                .from('franchisee_product_categories' as any)
                .insert(category)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['franchisee_categories'] });
            toast.success('Categoria criada com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao criar categoria: ${error.message}`);
        },
    });
}

export function useUpdateFranchiseeProductCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string } & Partial<FranchiseeProductCategory>) => {
            const { error } = await supabase
                .from('franchisee_product_categories' as any)
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            return { id, ...updates };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['franchisee_categories'] });
            toast.success('Categoria atualizada com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao atualizar categoria: ${error.message}`);
        },
    });
}

export function useDeleteFranchiseeProductCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            // Check if there are products using this category
            const { count, error: checkError } = await supabase
                .from('franchisee_products' as any)
                .select('*', { count: 'exact', head: true })
                .eq('category_id', id);

            if (checkError) throw checkError;
            
            if (count && count > 0) {
                throw new Error('Não é possível excluir uma categoria que possui produtos vinculados.');
            }

            const { error } = await supabase
                .from('franchisee_product_categories' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['franchisee_categories'] });
            toast.success('Categoria excluída com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao excluir categoria: ${error.message}`);
        },
    });
}
