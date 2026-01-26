import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DeliveryArea {
    id: string;
    store_id: string;
    name: string;
    radius_meters: number;
    fee: number;
    center_lat: number;
    center_lng: number;
    active: boolean;
}

export function useDeliveryAreas(storeId?: string) {
    const queryClient = useQueryClient();

    const { data: deliveryAreas, isLoading } = useQuery({
        queryKey: ['delivery_areas', storeId],
        queryFn: async () => {
            if (!storeId) return [];

            try {
                const { data, error } = await supabase
                    .from('delivery_areas' as any)
                    .select('*')
                    .eq('store_id', storeId)
                    .order('radius_meters', { ascending: true });

                if (error) {
                    console.error('Error fetching delivery areas:', error);
                    // Return empty array if table invalid or other error to render page safely
                    return [];
                }
                return data as DeliveryArea[];
            } catch (error) {
                console.error('Exception fetching areas:', error);
                return [];
            }
        },
        enabled: !!storeId,
        retry: false // Do not retry if it fails (likely sql missing)
    });

    const createArea = useMutation({
        mutationFn: async (newArea: Omit<DeliveryArea, 'id'>) => {
            const { data, error } = await supabase
                .from('delivery_areas' as any)
                .insert([newArea])
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery_areas', storeId] });
            toast.success('Área de entrega criada com sucesso!');
        },
        onError: (error) => {
            toast.error('Erro ao criar área de entrega');
            console.error(error);
        }
    });

    const updateArea = useMutation({
        mutationFn: async ({ id, ...updates }: { id: string } & Partial<DeliveryArea>) => {
            const { data, error } = await supabase
                .from('delivery_areas' as any)
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery_areas', storeId] });
            toast.success('Área de entrega atualizada!');
        },
        onError: (error) => {
            toast.error('Erro ao atualizar área de entrega');
            console.error(error);
        }
    });

    const deleteArea = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('delivery_areas' as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['delivery_areas', storeId] });
            toast.success('Área de entrega removida');
        }
    });

    return {
        deliveryAreas,
        isLoading,
        createArea,
        updateArea,
        deleteArea
    };
}
