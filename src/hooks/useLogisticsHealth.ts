import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';

// =============================================
// TIPOS - Baseados na metodologia de Antonio Carlos Souza Ramos
// =============================================

export interface LogisticsHealth {
    // Métricas de Montadores
    online_assemblers: number;
    total_assemblers: number;
    remaining_shift_minutes: number;
    // Métricas de Pedidos
    active_orders: number;
    pending_assembly: number;
    // Capacidade (TAREFA 1)
    current_capacity: number;        // Quantos copos podem ser feitos
    required_capacity: number;       // Quantos copos precisam ser feitos
    available_capacity: number;      // Margem disponível
    // Taxa de Ocupação
    occupancy_rate: number;
    // Status e Previsão (TAREFA 2)
    health_status: 'healthy' | 'warning' | 'critical';
    estimated_bottleneck_time: string | null;
    minutes_until_bottleneck: number | null;
    // Configurações
    assembly_time: number;           // Tempo por copo (padrão: 10 min)
    target_assembly_time: number;    // Meta (padrão: 9.6 min)
    safety_margin: number;           // Margem de segurança (padrão: 1.2)
}

export interface LogisticsAlert {
    id: string;
    store_id: string;
    alert_type: 'prediction' | 'warning' | 'critical' | 'resolved';
    active_orders: number;
    online_assemblers: number;
    remaining_shift_minutes: number;
    current_capacity: number;
    required_capacity: number;
    occupancy_rate: number;
    estimated_bottleneck_time: string | null;
    message: string;
    suggested_action: string | null;
    webhook_sent: boolean;
    acknowledged_at: string | null;
    acknowledged_by: string | null;
    resolved_at: string | null;
    created_at: string;
}

export interface Assembler {
    id: string;
    store_id: string;
    user_id: string | null;
    name: string;
    status: 'online' | 'offline' | 'break' | 'busy';
    shift_start: string | null;
    shift_end: string | null;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface LogisticsConfig {
    id: string;
    store_id: string;
    assembly_time_minutes: number;
    target_assembly_time: number;
    shift_duration_minutes: number;
    safety_margin: number;
    warning_threshold_percent: number;
    critical_threshold_percent: number;
    webhook_url: string | null;
    webhook_enabled: boolean;
}

export interface COODashboardItem {
    store_id: string;
    store_name: string;
    health_status: 'healthy' | 'warning' | 'critical';
    active_orders: number;
    online_assemblers: number;
    current_capacity: number;
    occupancy_rate: number;
    minutes_until_bottleneck: number | null;
    unresolved_alerts: number;
    last_alert_time: string | null;
}

// =============================================
// TAREFA 1: Hook para Cálculo de Capacidade Operacional em Tempo Real
// =============================================

export function useLogisticsHealth() {
    const { currentStore } = useStore();

    return useQuery({
        queryKey: ['logistics-health', currentStore?.id],
        queryFn: async (): Promise<LogisticsHealth> => {
            if (!currentStore?.id) {
                return getDefaultHealth();
            }

            try {
                const { data, error } = await supabase.rpc('calculate_logistics_health' as any, {
                    p_store_id: currentStore.id
                });

                if (error) throw error;

                if (data && Array.isArray(data) && data.length > 0) {
                    const row = data[0];
                    return {
                        online_assemblers: row.online_assemblers || 0,
                        total_assemblers: row.total_assemblers || 0,
                        remaining_shift_minutes: row.remaining_shift_minutes || 0,
                        active_orders: row.active_orders || 0,
                        pending_assembly: row.pending_assembly || 0,
                        current_capacity: row.current_capacity || 0,
                        required_capacity: row.required_capacity || 0,
                        available_capacity: row.available_capacity || 0,
                        occupancy_rate: Number(row.occupancy_rate) || 0,
                        health_status: row.health_status || 'healthy',
                        estimated_bottleneck_time: row.estimated_bottleneck_time,
                        minutes_until_bottleneck: row.minutes_until_bottleneck,
                        assembly_time: Number(row.assembly_time) || 10,
                        target_assembly_time: Number(row.target_assembly_time) || 9.6,
                        safety_margin: Number(row.safety_margin) || 1.2,
                    };
                }

                return getDefaultHealth();
            } catch (error) {
                console.error('Error fetching logistics health:', error);
                return getDefaultHealth();
            }
        },
        enabled: !!currentStore?.id,
        refetchInterval: 5000, // TEMPO REAL: Atualiza a cada 5 segundos
        staleTime: 2000,
    });
}

function getDefaultHealth(): LogisticsHealth {
    return {
        online_assemblers: 0,
        total_assemblers: 0,
        remaining_shift_minutes: 480,
        active_orders: 0,
        pending_assembly: 0,
        current_capacity: 0,
        required_capacity: 0,
        available_capacity: 0,
        occupancy_rate: 0,
        health_status: 'healthy',
        estimated_bottleneck_time: null,
        minutes_until_bottleneck: null,
        assembly_time: 10,
        target_assembly_time: 9.6,
        safety_margin: 1.2,
    };
}

// =============================================
// TAREFA 2: Hook para Alertas de Saúde Logística
// =============================================

export function useLogisticsAlerts(includeResolved = false) {
    const { currentStore } = useStore();

    return useQuery({
        queryKey: ['logistics-alerts', currentStore?.id, includeResolved],
        queryFn: async () => {
            if (!currentStore?.id) return [];

            let query = supabase
                .from('logistics_health_alerts' as any)
                .select('*')
                .eq('store_id', currentStore.id)
                .order('created_at', { ascending: false });

            if (!includeResolved) {
                query = query.is('resolved_at', null);
            }

            const { data, error } = await query.limit(50);
            if (error) throw error;

            return (data as unknown as LogisticsAlert[]) || [];
        },
        enabled: !!currentStore?.id,
        refetchInterval: 10000, // Atualiza alertas a cada 10 segundos
    });
}

// =============================================
// Hook para Montadores
// =============================================

export function useAssemblers() {
    const { currentStore } = useStore();

    return useQuery({
        queryKey: ['assemblers', currentStore?.id],
        queryFn: async () => {
            if (!currentStore?.id) return [];

            const { data, error } = await supabase
                .from('store_assemblers' as any)
                .select('*')
                .eq('store_id', currentStore.id)
                .eq('active', true)
                .order('name');

            if (error) throw error;
            return (data as unknown as Assembler[]) || [];
        },
        enabled: !!currentStore?.id,
        refetchInterval: 30000,
    });
}

export function useUpdateAssemblerStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: Assembler['status'] }) => {
            const now = new Date().toISOString();
            const updateData: any = { status, updated_at: now };

            // Se está ficando online, registrar início do turno
            if (status === 'online') {
                const shiftEnd = new Date();
                shiftEnd.setHours(shiftEnd.getHours() + 8); // 8 horas de turno
                updateData.shift_start = now;
                updateData.shift_end = shiftEnd.toISOString();
            }

            const { data, error } = await supabase
                .from('store_assemblers' as any)
                .update(updateData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assemblers'] });
            queryClient.invalidateQueries({ queryKey: ['logistics-health'] });
            toast.success('Status do montador atualizado!');
        },
    });
}

export function useCreateAssembler() {
    const queryClient = useQueryClient();
    const { currentStore } = useStore();

    return useMutation({
        mutationFn: async (data: { name: string; user_id?: string }) => {
            if (!currentStore?.id) throw new Error('Loja não selecionada');

            const { data: result, error } = await supabase
                .from('store_assemblers' as any)
                .insert({
                    store_id: currentStore.id,
                    name: data.name,
                    user_id: data.user_id || null,
                    status: 'offline',
                    active: true,
                })
                .select()
                .single();

            if (error) throw error;
            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assemblers'] });
            toast.success('Montador cadastrado!');
        },
    });
}

// =============================================
// Hook para Configurações de Logística
// =============================================

export function useLogisticsConfig() {
    const { currentStore } = useStore();

    return useQuery({
        queryKey: ['logistics-config', currentStore?.id],
        queryFn: async (): Promise<LogisticsConfig | null> => {
            if (!currentStore?.id) return null;

            const { data, error } = await supabase
                .from('store_logistics_config' as any)
                .select('*')
                .eq('store_id', currentStore.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data ? (data as unknown as LogisticsConfig) : null;
        },
        enabled: !!currentStore?.id,
    });
}

export function useUpdateLogisticsConfig() {
    const queryClient = useQueryClient();
    const { currentStore } = useStore();

    return useMutation({
        mutationFn: async (config: Partial<LogisticsConfig>) => {
            if (!currentStore?.id) throw new Error('Loja não selecionada');

            const { data, error } = await supabase
                .from('store_logistics_config' as any)
                .upsert({
                    store_id: currentStore.id,
                    ...config,
                    updated_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['logistics-config'] });
            queryClient.invalidateQueries({ queryKey: ['logistics-health'] });
            toast.success('Configurações atualizadas!');
        },
    });
}

// =============================================
// TAREFA 3: Hook para Dashboard do COO
// =============================================

export function useCOODashboard() {
    return useQuery({
        queryKey: ['coo-dashboard'],
        queryFn: async (): Promise<COODashboardItem[]> => {
            try {
                const { data, error } = await supabase.rpc('get_coo_logistics_dashboard' as any);

                if (error) throw error;
                return (data as unknown as COODashboardItem[]) || [];
            } catch (error) {
                console.error('Error fetching COO dashboard:', error);
                return [];
            }
        },
        refetchInterval: 15000, // Atualiza a cada 15 segundos
    });
}

// =============================================
// Hook para Reconhecer Alertas
// =============================================

export function useAcknowledgeLogisticsAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (alertId: string) => {
            const { data, error } = await supabase
                .from('logistics_health_alerts' as any)
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
            queryClient.invalidateQueries({ queryKey: ['logistics-alerts'] });
            toast.success('Alerta reconhecido!');
        },
    });
}

export function useResolveLogisticsAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (alertId: string) => {
            const { data, error } = await supabase
                .from('logistics_health_alerts' as any)
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
            queryClient.invalidateQueries({ queryKey: ['logistics-alerts'] });
            toast.success('Alerta resolvido!');
        },
    });
}
