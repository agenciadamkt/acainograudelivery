import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';

export interface CapacityMetrics {
    occupancy_rate: number;
    active_orders: number;
    available_drivers: number;
    total_drivers: number;
    estimated_wait_time: number;
    status: 'normal' | 'warning' | 'critical';
}

export interface CapacityAlert {
    id: string;
    store_id: string;
    alert_type: 'warning' | 'critical' | 'resolved';
    occupancy_rate: number;
    active_orders: number;
    available_drivers: number;
    total_drivers: number;
    estimated_wait_time: number | null;
    message: string | null;
    acknowledged_at: string | null;
    acknowledged_by: string | null;
    resolved_at: string | null;
    created_at: string;
}

export interface CapacitySettings {
    id: string;
    store_id: string;
    avg_delivery_time_minutes: number;
    max_orders_per_driver: number;
    warning_threshold: number;
    critical_threshold: number;
    alert_radius_km: number;
    daily_operating_minutes: number;
}

export interface NearbyStore {
    store_id: string;
    store_name: string;
    distance_km: number;
    available_drivers: number;
}

export interface SupportRequest {
    id: string;
    requesting_store_id: string;
    supporting_store_id: string | null;
    status: 'pending' | 'accepted' | 'declined' | 'completed' | 'expired';
    needed_drivers: number;
    reason: string | null;
    distance_km: number | null;
    expires_at: string | null;
    responded_at: string | null;
    completed_at: string | null;
    created_at: string;
}

// Hook to get real-time capacity metrics
export function useCapacityMetrics() {
    const { currentStore } = useStore();

    return useQuery({
        queryKey: ['capacity-metrics', currentStore?.id],
        queryFn: async (): Promise<CapacityMetrics> => {
            if (!currentStore?.id) throw new Error('Store not found');

            // Call the database function
            const { data, error } = await supabase.rpc('calculate_store_occupancy' as any, {
                p_store_id: currentStore.id
            });

            if (error) throw error;

            if (data && Array.isArray(data) && data.length > 0) {
                return {
                    occupancy_rate: Number(data[0].occupancy_rate) || 0,
                    active_orders: data[0].active_orders || 0,
                    available_drivers: data[0].available_drivers || 0,
                    total_drivers: data[0].total_drivers || 0,
                    estimated_wait_time: data[0].estimated_wait_time || 0,
                    status: data[0].status || 'normal',
                };
            }

            // Default values if function not available
            return {
                occupancy_rate: 0,
                active_orders: 0,
                available_drivers: 0,
                total_drivers: 0,
                estimated_wait_time: 0,
                status: 'normal',
            };
        },
        enabled: !!currentStore?.id,
        refetchInterval: 10000, // Refresh every 10 seconds for real-time monitoring
        staleTime: 5000,
    });
}

// Hook to get capacity alerts
export function useCapacityAlerts(includeResolved = false) {
    const { currentStore } = useStore();

    return useQuery({
        queryKey: ['capacity-alerts', currentStore?.id, includeResolved],
        queryFn: async () => {
            if (!currentStore?.id) return [];

            let query = supabase
                .from('capacity_alerts' as any)
                .select('*')
                .eq('store_id', currentStore.id)
                .order('created_at', { ascending: false });

            if (!includeResolved) {
                query = query.is('resolved_at', null);
            }

            const { data, error } = await query.limit(50);
            if (error) throw error;

            return (data as unknown as CapacityAlert[]) || [];
        },
        enabled: !!currentStore?.id,
        refetchInterval: 15000, // Check for new alerts every 15 seconds
    });
}

// Hook to get capacity settings
export function useCapacitySettings() {
    const { currentStore } = useStore();

    return useQuery({
        queryKey: ['capacity-settings', currentStore?.id],
        queryFn: async (): Promise<CapacitySettings | null> => {
            if (!currentStore?.id) return null;

            const { data, error } = await supabase
                .from('store_capacity_settings' as any)
                .select('*')
                .eq('store_id', currentStore.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return data ? (data as unknown as CapacitySettings) : null;
        },
        enabled: !!currentStore?.id,
    });
}

// Hook to update capacity settings
export function useUpdateCapacitySettings() {
    const queryClient = useQueryClient();
    const { currentStore } = useStore();

    return useMutation({
        mutationFn: async (settings: Partial<CapacitySettings>) => {
            if (!currentStore?.id) throw new Error('Store not found');

            const { data, error } = await supabase
                .from('store_capacity_settings' as any)
                .upsert({
                    store_id: currentStore.id,
                    ...settings,
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['capacity-settings'] });
            toast.success('Configurações de capacidade atualizadas!');
        },
        onError: (error: any) => {
            toast.error('Erro ao atualizar configurações: ' + error.message);
        },
    });
}

// Hook to acknowledge an alert
export function useAcknowledgeAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (alertId: string) => {
            const { data, error } = await supabase
                .from('capacity_alerts' as any)
                .update({
                    acknowledged_at: new Date().toISOString(),
                    acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
                })
                .eq('id', alertId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['capacity-alerts'] });
            toast.success('Alerta reconhecido!');
        },
    });
}

// Hook to resolve an alert
export function useResolveAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (alertId: string) => {
            const { data, error } = await supabase
                .from('capacity_alerts' as any)
                .update({
                    resolved_at: new Date().toISOString(),
                })
                .eq('id', alertId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['capacity-alerts'] });
            toast.success('Alerta resolvido!');
        },
    });
}

// Hook to get nearby stores
export function useNearbyStores(radiusKm = 5) {
    const { currentStore } = useStore();

    return useQuery({
        queryKey: ['nearby-stores', currentStore?.id, radiusKm],
        queryFn: async (): Promise<NearbyStore[]> => {
            if (!currentStore?.id) return [];

            const { data, error } = await supabase.rpc('get_nearby_stores' as any, {
                p_store_id: currentStore.id,
                p_radius_km: radiusKm,
            });

            if (error) throw error;
            return ((data as any) || []) as NearbyStore[];
        },
        enabled: !!currentStore?.id,
        staleTime: 60000, // Cache for 1 minute
    });
}

// Hook to get support requests
export function useSupportRequests() {
    const { currentStore } = useStore();

    return useQuery({
        queryKey: ['support-requests', currentStore?.id],
        queryFn: async () => {
            if (!currentStore?.id) return [];

            const { data, error } = await supabase
                .from('store_support_requests' as any)
                .select('*')
                .or(`requesting_store_id.eq.${currentStore.id},supporting_store_id.eq.${currentStore.id}`)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return (data as unknown as SupportRequest[]) || [];
        },
        enabled: !!currentStore?.id,
        refetchInterval: 30000,
    });
}

// Hook to create support request
export function useCreateSupportRequest() {
    const queryClient = useQueryClient();
    const { currentStore } = useStore();

    return useMutation({
        mutationFn: async (data: { needed_drivers: number; reason?: string }) => {
            if (!currentStore?.id) throw new Error('Store not found');

            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 2); // Expires in 2 hours

            const { data: result, error } = await supabase
                .from('store_support_requests' as any)
                .insert({
                    requesting_store_id: currentStore.id,
                    needed_drivers: data.needed_drivers,
                    reason: data.reason || null,
                    expires_at: expiresAt.toISOString(),
                })
                .select()
                .single();

            if (error) throw error;
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['support-requests'] });
            toast.success('Solicitação de suporte enviada!');
        },
        onError: (error: any) => {
            toast.error('Erro ao criar solicitação: ' + error.message);
        },
    });
}

// Hook to respond to support request
export function useRespondSupportRequest() {
    const queryClient = useQueryClient();
    const { currentStore } = useStore();

    return useMutation({
        mutationFn: async ({ requestId, accept }: { requestId: string; accept: boolean }) => {
            if (!currentStore?.id) throw new Error('Store not found');

            const { data, error } = await supabase
                .from('store_support_requests' as any)
                .update({
                    status: accept ? 'accepted' : 'declined',
                    supporting_store_id: accept ? currentStore.id : null,
                    responded_at: new Date().toISOString(),
                })
                .eq('id', requestId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['support-requests'] });
            toast.success(variables.accept ? 'Suporte aceito!' : 'Solicitação recusada');
        },
    });
}
