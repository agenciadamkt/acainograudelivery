
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Ingredient {
    id: string;
    user_id: string;
    name: string;
    description?: string;
    category: string;
    unit: string;
    cost_per_unit: number;
    current_stock: number;
    minimum_stock: number;
    supplier?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export function useIngredients() {
    const queryClient = useQueryClient();

    // Fetch Ingredients
    const { data: ingredients, isLoading, error } = useQuery({
        queryKey: ['ingredients'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ingredients')
                .select('*')
                .order('name');

            if (error) throw error;
            return data as any[]; // Start with any to avoid mismatch, or better define Ingredient
        },
    });

    // Create Ingredient
    const createIngredient = useMutation({
        mutationFn: async (newIngredient: Omit<Ingredient, 'id' | 'created_at' | 'updated_at'>) => {
            // user_id should be handled by RLS if possible, but here we might need to pass it if not automatically inferred on insert,
            // OR we rely on the component passing it from AuthContext.
            // Better to assume the payload has it or RLS default implementation (though Supabase usually requires explicit user_id if not default).
            // However, usually detailed implementations pass user_id.
            // I will assume the component calling this passes a specific structure.

            const { data, error } = await supabase
                .from('ingredients')
                .insert(newIngredient)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            toast.success('Ingrediente criado com sucesso!');
        },
        onError: (error: any) => {
            toast.error(`Erro ao criar ingrediente: ${error.message}`);
        }
    });

    // Update Ingredient
    const updateIngredient = useMutation({
        mutationFn: async ({ id, ...updates }: Partial<Ingredient> & { id: string }) => {
            const { data, error } = await supabase
                .from('ingredients')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            toast.success('Ingrediente atualizado!');
        },
        onError: (error: any) => {
            toast.error(`Erro ao atualizar: ${error.message}`);
        }
    });

    // Delete/Deactivate Ingredient
    const deleteIngredient = useMutation({
        mutationFn: async (id: string) => {
            // Hard delete or Soft delete? The requirements say "is_active", so let's soft delete usually, but here delete function might imply removal.
            // Let's implement soft delete via update or hard delete if really needed.
            // For now, I'll do a hard delete as typical CRUD, but user can toggle active in Update.
            const { error } = await supabase
                .from('ingredients')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            toast.success('Ingrediente excluído!');
        },
        onError: (error: any) => {
            toast.error(`Erro ao excluir: ${error.message}`);
        }
    });

    return {
        ingredients,
        isLoading,
        error,
        createIngredient,
        updateIngredient,
        deleteIngredient
    };
}
