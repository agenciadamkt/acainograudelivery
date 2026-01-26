import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductToppingCategory {
    id: string; // ID of the relation row
    product_id: string;
    topping_category_id: string;
    display_order: number;
    min_quantity: number;
    max_quantity: number;
    required: boolean;
    active: boolean;
    topping_category: {
        id: string;
        name: string;
        max_selections: number | null;
    };
}

export function useProductToppingCategories(productId: string | undefined) {
    return useQuery({
        queryKey: ['product-topping-categories', productId],
        queryFn: async () => {
            if (!productId) return [];

            try {
                const { data, error } = await supabase
                    .from('product_topping_categories' as any) // Casting as any until types are regenerated
                    .select(`
          id,
          product_id,
          topping_category_id,
          display_order,
          min_quantity,
          max_quantity,
          required,
          active,
          topping_category:topping_categories (
            id,
            name,
            max_selections
          )
        `)
                    .eq('product_id', productId)
                    .order('display_order', { ascending: true });

                if (error) {
                    console.error("Error fetching product topping categories:", error);
                    // Return empty array to prevent crash if table/columns don't exist yet
                    return [];
                }

                return data as unknown as ProductToppingCategory[];
            } catch (err) {
                console.error("Unexpected error in useProductToppingCategories:", err);
                return [];
            }
        },
        enabled: !!productId,
    });
}

export function useAddProductToppingCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ productId, categoryId }: { productId: string; categoryId: string }) => {
            const { data, error } = await supabase
                .from('product_topping_categories' as any)
                .insert({
                    product_id: productId,
                    topping_category_id: categoryId,
                    min_quantity: 0,
                    max_quantity: 1,
                    required: false,
                    active: true
                })
                .select();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, { productId }) => {
            queryClient.invalidateQueries({ queryKey: ['product-topping-categories', productId] });
        },
    });
}

export function useUpdateProductToppingCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            id,
            updates
        }: {
            id: string;
            updates: Partial<ProductToppingCategory>
        }) => {
            const { error } = await supabase
                .from('product_topping_categories' as any)
                .update(updates)
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            // We need to invalidate based on product_id, but we might only have the relation ID.
            // For simplicity, we can invalidate all 'product-topping-categories' or fetch the product_id first.
            // A better pattern is to pass product_id in variables or return it.
            // Let's rely on global invalidation for now or optimistic updates if we were precise.
            // Ideally we pass product_id from the component.
            queryClient.invalidateQueries({ queryKey: ['product-topping-categories'] });
        },
    });
}

export function useRemoveProductToppingCategory() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ productId, categoryId }: { productId: string; categoryId: string }) => {
            // We delete by product_id and topping_category_id to be safe, 
            // or by the relation ID if we have it. 
            // The Hook receives productId/categoryId usually from the UI listing.

            const { error } = await supabase
                .from('product_topping_categories' as any)
                .delete()
                .match({ product_id: productId, topping_category_id: categoryId });

            if (error) throw error;
        },
        onSuccess: (_, { productId }) => {
            queryClient.invalidateQueries({ queryKey: ['product-topping-categories', productId] });
        },
    });
}
