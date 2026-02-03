import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';

export interface Promotion {
    id: string;
    store_id: string;
    name: string;
    description: string | null;
    discount_type: 'percentage' | 'fixed' | 'buy_x_get_y';
    discount_value: number;
    min_order_value: number | null;
    max_discount: number | null;
    coupon_code: string | null;
    start_date: string;
    end_date: string | null;
    active: boolean;
    usage_limit: number | null;
    usage_count: number;
    applies_to: 'all' | 'category' | 'product';
    target_ids: string[] | null;
    created_at: string;
    updated_at: string;
}

export type PromotionInput = Omit<Promotion, 'id' | 'store_id' | 'usage_count' | 'created_at' | 'updated_at'>;

export function usePromotions() {
    const { currentStore } = useStore();

    return useQuery({
        queryKey: ['promotions', currentStore?.id],
        queryFn: async () => {
            if (!currentStore?.id) return [];

            const { data, error } = await supabase
                .from('promotions' as any)
                .select('*')
                .eq('store_id', currentStore.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data as unknown as Promotion[]) || [];
        },
        enabled: !!currentStore?.id,
    });
}

export function useCreatePromotion() {
    const queryClient = useQueryClient();
    const { currentStore } = useStore();

    return useMutation({
        mutationFn: async (promotion: PromotionInput) => {
            if (!currentStore?.id) throw new Error('Loja não selecionada');

            const { data, error } = await supabase
                .from('promotions' as any)
                .insert({
                    ...promotion,
                    store_id: currentStore.id,
                    usage_count: 0,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
            toast.success('Promoção criada com sucesso!');
        },
        onError: (error: any) => {
            toast.error('Erro ao criar promoção: ' + error.message);
        },
    });
}

export function useUpdatePromotion() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...promotion }: Partial<Promotion> & { id: string }) => {
            const { data, error } = await supabase
                .from('promotions' as any)
                .update(promotion)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
            toast.success('Promoção atualizada!');
        },
        onError: (error: any) => {
            toast.error('Erro ao atualizar promoção: ' + error.message);
        },
    });
}

export function useDeletePromotion() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('promotions' as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
            toast.success('Promoção excluída!');
        },
        onError: (error: any) => {
            toast.error('Erro ao excluir promoção: ' + error.message);
        },
    });
}

export function useTogglePromotionStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
            const { data, error } = await supabase
                .from('promotions' as any)
                .update({ active })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['promotions'] });
            toast.success(variables.active ? 'Promoção ativada!' : 'Promoção desativada!');
        },
    });
}
