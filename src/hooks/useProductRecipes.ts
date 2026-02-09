
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductRecipe {
    id?: string;
    product_id: string;
    ingredient_id: string;
    quantity: number;
    unit: string;
    cost_per_unit?: number; // Might join to ingredients for cost analysis
    ingredient_name?: string; // Join for display
}

export function useProductRecipes(productId?: string) {
    const queryClient = useQueryClient();

    // Fetch Recipes for a Product
    const { data: recipes, isLoading } = useQuery({
        queryKey: ['product_recipes', productId],
        queryFn: async () => {
            if (!productId) return [];

            const { data, error } = await supabase
                .from('product_recipes')
                .select(`
                    id, 
                    product_id, 
                    ingredient_id, 
                    quantity, 
                    unit,
                    ingredient:ingredients(name, cost_per_unit, unit)
                `)
                .eq('product_id', productId);

            if (error) throw error;


            if (!data) return [];

            // Map flat structure for easier use if needed, or keep nested
            return data.map(item => ({
                id: item.id,
                product_id: item.product_id,
                ingredient_id: item.ingredient_id,
                quantity: item.quantity,
                unit: item.unit,
                ingredient_name: (item.ingredient as any)?.name,
                cost_per_unit: (item.ingredient as any)?.cost_per_unit,
                ingredient_unit: (item.ingredient as any)?.unit // Original unit
            }));
        },
        enabled: !!productId
    });

    // Save Recipe (Batch update usually easier: delete all + insert new, or smart merge)
    // Here we might just implement Add/Remove individual items or Replace All. 
    // Replace All is common for recipe editing.
    const saveRecipe = useMutation({
        mutationFn: async ({ productId, items }: { productId: string, items: Omit<ProductRecipe, 'id' | 'product_id'>[] }) => {
            // 1. Delete existing (simplest for now, though UUIDs change)
            const { error: deleteError } = await supabase
                .from('product_recipes')
                .delete()
                .eq('product_id', productId);

            if (deleteError) throw deleteError;

            if (items.length === 0) return;

            // 2. Insert new
            const toInsert = items.map(item => ({
                product_id: productId,
                ingredient_id: item.ingredient_id,
                quantity: item.quantity,
                unit: item.unit
            }));

            const { error: insertError } = await supabase
                .from('product_recipes')
                .insert(toInsert);

            if (insertError) throw insertError;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['product_recipes', variables.productId] });
            // Also invalidate product to re-calculate cost if we store cached cost
            queryClient.invalidateQueries({ queryKey: ['products'] });
            toast.success('Receita salva com sucesso!');
        },
        onError: (err: any) => {
            toast.error(`Erro ao salvar receita: ${err.message}`);
        }
    });

    return { recipes, isLoading, saveRecipe };
}
