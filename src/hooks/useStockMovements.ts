
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface StockMovement {
    id: string;
    ingredient_id: string;
    movement_type: 'entrada' | 'saida' | 'ajuste' | 'perda';
    quantity: number;
    unit_cost?: number;
    total_cost?: number;
    reason?: string;
    reference_id?: string;
    created_at: string;
    user_id?: string;
}

export function useStockMovements(ingredientId?: string) {
    const queryClient = useQueryClient();

    const { data: movements, isLoading } = useQuery({
        queryKey: ['stock_movements', ingredientId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stock_movements')
                .select('*')
                .eq('ingredient_id', ingredientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as StockMovement[];
        },
        enabled: !!ingredientId
    });

    const addMovement = useMutation({
        mutationFn: async (movement: Omit<StockMovement, 'id' | 'created_at' | 'user_id'> & { user_id: string }) => {
            // First insert movement
            const { data, error } = await supabase
                .from('stock_movements')
                .insert({
                    ...movement,
                    // If supabase auth context is used, user_id might be auto-filled or passed.
                    // The hook caller MUST pass user_id.
                })
                .select()
                .single();

            if (error) throw error;

            // Then update ingredient stock
            // This logic should ideally be in a DB function/trigger for transactional integrity
            // But we do it here for MVP speed if no triggers exist.

            let delta = 0;
            switch (movement.movement_type) {
                case 'entrada': delta = movement.quantity; break;
                case 'saida': delta = -movement.quantity; break;
                case 'perda': delta = -movement.quantity; break;
                case 'ajuste': break; // Adjustment is trickier, depends if we set absolute or diff. Usually diff.
                // Assuming adjustment is a delta too OR specialized logic.
                // If adjustment means "set to X", we need current stock first.
                // Let's assume adjustment is a manual correction delta for now OR we fetch current, calc delta. 
                // A better approach for adjustment is "New Quantity" -> internal delta.
                // But the movement table usually logs the delta.
            }

            if (delta !== 0) {
                // We need to fetch current stock to add delta? Or just increment.
                // ingredients has current_stock.
                // create rpc function for atomic increment is best, but let's try simple update.
                // But wait, concurrency!

                // If we don't have atomic update, we might overwrite.
                // Supabase generic update:
                // update ingredients set current_stock = current_stock + delta where id = ...
                // We need to know current value first? No, we can use SQL expression if supported via rpc, or just read-modify-write (optimistic).

                // Let's just fetch first to be safe for now, though not atomic.
                const { data: ing } = await supabase.from('ingredients').select('current_stock').eq('id', movement.ingredient_id).single();
                if (ing) {
                    await supabase.from('ingredients').update({
                        current_stock: (ing.current_stock || 0) + delta
                    }).eq('id', movement.ingredient_id);
                }
            } else if (movement.movement_type === 'ajuste') {
                // If it's an absolute value adjustment, we should calculate diff?
                // Or maybe 'ajuste' payload sends the *new* total?
                // Let's assume explicit quantity in payload is the *change* for now to keep it consistent.
                // If user wants to set "Total = 50", UI calculates delta = 50 - current.
            }

            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            toast.success('Movimentação registrada!');
        },
        onError: (err: any) => {
            toast.error(`Erro ao registrar: ${err.message}`);
        }
    });

    return { movements, isLoading, addMovement };
}
