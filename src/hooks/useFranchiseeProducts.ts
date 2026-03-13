import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FranchiseeProduct {
    id: string;
    category_id: string;
    name: string;
    description: string | null;
    price: number;
    unit: string;
    image_url: string | null;
    taxa: number; // Taxa Boleto (R$)
    has_advertising_fee: boolean;
    advertising_fee_percentage: number;
    active: boolean;
    display_order: number;
    created_at?: string;
    updated_at?: string;
    category?: {
        id: string;
        name: string;
    } | null;
}

export function useFranchiseeProducts(categoryId?: string, activeOnly = false) {
    return useQuery({
        queryKey: ['franchisee_products', categoryId, activeOnly],
        queryFn: async () => {
            let query = supabase
                .from('franchisee_products' as any)
                .select('*, category:franchisee_product_categories(id, name)')
                .order('display_order', { ascending: true })
                .order('name', { ascending: true });

            if (categoryId && categoryId !== 'all') {
                query = query.eq('category_id', categoryId);
            }

            if (activeOnly) {
                query = query.eq('active', true);
            }

            const { data, error } = await query;
            if (error) {
                console.error("Error fetching franchisee products:", error);
                return [];
            }
            return (data as any) as FranchiseeProduct[];
        },
    });
}

export function useCreateFranchiseeProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (product: Partial<FranchiseeProduct>) => {
            const { data, error } = await supabase
                .from('franchisee_products' as any)
                .insert(product)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['franchisee_products'] });
            toast.success('Produto criado com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao criar produto: ${error.message}`);
        },
    });
}

export function useUpdateFranchiseeProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: { id: string } & Partial<FranchiseeProduct>) => {
            const { category, ...cleanUpdates } = updates as any;
            const { error } = await supabase
                .from('franchisee_products' as any)
                .update(cleanUpdates)
                .eq('id', id);

            if (error) throw error;
            return { id, ...cleanUpdates };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['franchisee_products'] });
            toast.success('Produto atualizado com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao atualizar produto: ${error.message}`);
        },
    });
}

export function useDeleteFranchiseeProduct() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('franchisee_products' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['franchisee_products'] });
            toast.success('Produto excluído com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao excluir produto: ${error.message}`);
        },
    });
}
