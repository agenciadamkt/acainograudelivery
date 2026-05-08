
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PdvOrderItem {
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    weight?: number;
}

export interface CreateSalePayload {
    user_id: string; // The operator
    store_id: string; // The store ID
    cash_register_id?: string; // Optional if not strict
    customer_name?: string;
    customer_cpf?: string;
    table_id?: string;
    status?: 'paid' | 'open' | 'cancelled';
    payment_method: string;
    subtotal: number;
    discount: number;
    total: number;
    amount_paid?: number;
    change_amount?: number;
    sales_channel: 'store' | 'delivery';
    items: PdvOrderItem[];
}

export function usePdvOrders() {
    const queryClient = useQueryClient();

    const createSale = useMutation({
        mutationFn: async (payload: CreateSalePayload) => {
            // 1. Create the Order
            const { data: order, error: orderError } = await supabase
                .from('pdv_orders')
                .insert({
                    user_id: payload.user_id,
                    store_id: payload.store_id,
                    cash_register_id: payload.cash_register_id,
                    customer_name: payload.customer_name,
                    customer_cpf: payload.customer_cpf,
                    table_id: payload.table_id,
                    status: payload.status || 'paid',
                    payment_method: payload.payment_method,
                    subtotal: payload.subtotal,
                    discount: payload.discount,
                    total: payload.total,
                    amount_paid: payload.amount_paid,
                    change_amount: payload.change_amount,
                    sales_channel: payload.sales_channel,
                    paid_at: payload.status === 'paid' ? new Date().toISOString() : null
                })
                .select()
                .single();

            if (orderError) throw orderError;
            if (!order) throw new Error('Failed to create order');

            // 2. Create Order Items
            const itemsToInsert = payload.items.map(item => ({
                order_id: order.id,
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
                weight: item.weight
            }));

            const { error: itemsError } = await supabase
                .from('pdv_order_items')
                .insert(itemsToInsert);

            if (itemsError) {
                // Optional: Rollback order if items fail (hard with just client side, usually better in RPC)
                console.error('Error creating items:', itemsError);
                // For now, let's throw
                throw itemsError;
            }

            // 3. Automated Stock Deduction (Phase 3)
            if (payload.status === 'paid' || !payload.status) {
                try {
                    for (const item of payload.items) {
                        // Get recipe for this product
                        const { data: recipes } = await supabase
                            .from('inventory_recipes')
                            .select('*')
                            .eq('product_id', item.product_id);
                        
                        if (recipes && recipes.length > 0) {
                            for (const recipe of recipes) {
                                const qtyToDeduct = item.quantity * recipe.quantity;
                                
                                // Get current stock
                                const { data: invItem } = await supabase
                                    .from('inventory_items')
                                    .select('current_qty, avg_price')
                                    .eq('id', recipe.item_id)
                                    .single();
                                
                                if (invItem) {
                                    // 1. Log Movement
                                    await supabase.from('inventory_movements').insert([{
                                        store_id: payload.store_id,
                                        item_id: recipe.item_id,
                                        user_id: payload.user_id,
                                        action: 'exit',
                                        classification: 'sale',
                                        qty: qtyToDeduct,
                                        unit_price: invItem.avg_price,
                                        total_value: qtyToDeduct * invItem.avg_price,
                                        notes: `Baixa automática: Venda #${order.id.slice(0, 8)}`
                                    }]);

                                    // 2. Update Balance
                                    await supabase
                                        .from('inventory_items')
                                        .update({ current_qty: invItem.current_qty - qtyToDeduct })
                                        .eq('id', recipe.item_id);
                                }
                            }
                        }
                    }
                } catch (stockErr) {
                    console.error('Stock deduction error:', stockErr);
                }
            }

            // 4. Update Table Status if applicable
            if (payload.table_id) {
                const { error: tableError } = await supabase
                    .from('pdv_tables')
                    .update({
                        status: 'occupied',
                        current_order_id: order.id
                    })
                    .eq('id', payload.table_id);

                if (tableError) console.error('Error updating table:', tableError);
            }

            return order;
        },
        onSuccess: () => {
            toast.success('Venda realizada com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['pdv_orders'] });
            queryClient.invalidateQueries({ queryKey: ['pdv_tables'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['inventory_movements'] });
            queryClient.invalidateQueries({ queryKey: ['stock_dashboard'] });
        },
        onError: (error) => {
            console.error('Error creating sale:', error);
            toast.error(`Erro ao realizar venda: ${error.message}`);
        }
    });

    return {
        createSale
    };
}
