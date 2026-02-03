import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';

// =============================================
// TIPOS - Fleet Displacement Ritual
// =============================================

export interface GeoZone {
    id: string;
    name: string;
    city: string;
    state: string;
    center_lat: number;
    center_lng: number;
    radius_km: number;
    min_drivers_required: number;
    priority_level: number;
    active: boolean;
    created_at: string;
    updated_at: string;
}

export interface ZoneCoverageStatus {
    id: string;
    zone_id: string;
    stores_online: number;
    drivers_available: number;
    drivers_busy: number;
    pending_orders: number;
    coverage_status: 'healthy' | 'warning' | 'critical_void' | 'no_stores';
    driver_deficit: number;
    checked_at: string;
}

export interface DisplacementMission {
    id: string;
    target_zone_id: string;
    driver_id: string;
    origin_lat: number | null;
    origin_lng: number | null;
    origin_zone_id: string | null;
    status: 'pending' | 'accepted' | 'rejected' | 'in_transit' | 'arrived' | 'expired' | 'cancelled';
    distance_km: number | null;
    estimated_time_minutes: number | null;
    notified_at: string;
    responded_at: string | null;
    started_at: string | null;
    arrived_at: string | null;
    expires_at: string | null;
    priority_granted: boolean;
    priority_expires_at: string | null;
    created_at: string;
}

export interface DriverMission {
    mission_id: string;
    zone_id: string;
    zone_name: string;
    zone_center_lat: number;
    zone_center_lng: number;
    distance_km: number;
    estimated_time_minutes: number;
    status: string;
    expires_at: string;
    priority_granted: boolean;
    created_at: string;
}

export interface HeatmapZone {
    zone_id: string;
    zone_name: string;
    center_lat: number;
    center_lng: number;
    radius_km: number;
    coverage_status: string;
    drivers_available: number;
    drivers_needed: number;
    pending_orders: number;
    heat_level: number; // 1-5
}

export interface ZoneCoverageResult {
    zone_id: string;
    zone_name: string;
    stores_online: number;
    drivers_available: number;
    coverage_status: string;
    driver_deficit: number;
}

export interface DisplacementAnalytics {
    zone_id: string;
    zone_name: string;
    total_voids: number;
    total_drivers_notified: number;
    total_drivers_accepted: number;
    acceptance_rate: number;
    avg_time_to_fill_minutes: number;
    voids_filled: number;
    voids_unfilled: number;
    effectiveness_rate: number;
}

export interface CheckinResult {
    checked_in: boolean;
    zone_name?: string;
    priority_granted?: boolean;
    priority_duration_hours?: number;
    distance_remaining_km?: number;
    message: string;
}

// =============================================
// Hooks para Admin/COO
// =============================================

// Buscar todas as zonas
export function useGeoZones() {
    return useQuery({
        queryKey: ['geo-zones'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('geo_zones' as any)
                .select('*')
                .order('priority_level', { ascending: false });

            if (error) throw error;
            return (data as unknown as GeoZone[]) || [];
        },
        staleTime: 60000,
    });
}

// Criar nova zona
export function useCreateGeoZone() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (zone: Partial<GeoZone>) => {
            const { data, error } = await supabase
                .from('geo_zones' as any)
                .insert(zone)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['geo-zones'] });
            toast.success('Zona criada com sucesso!');
        },
    });
}

// Atualizar zona
export function useUpdateGeoZone() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: Partial<GeoZone> & { id: string }) => {
            const { data, error } = await supabase
                .from('geo_zones' as any)
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['geo-zones'] });
            toast.success('Zona atualizada!');
        },
    });
}

// TAREFA 1: Executar verificação de cobertura
export function useCheckZoneCoverage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (): Promise<ZoneCoverageResult[]> => {
            const { data, error } = await supabase.rpc('check_zone_coverage' as any);

            if (error) throw error;
            return (data as unknown as ZoneCoverageResult[]) || [];
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['zone-coverage'] });
            queryClient.invalidateQueries({ queryKey: ['heatmap'] });

            const criticalZones = data.filter(z => z.coverage_status === 'critical_void');
            if (criticalZones.length > 0) {
                toast.warning(`${criticalZones.length} zona(s) com VAZIO CRÍTICO detectada(s)!`);
            } else {
                toast.success('Verificação de cobertura concluída');
            }
        },
        onError: (error: any) => {
            toast.error('Erro ao verificar cobertura: ' + error.message);
        },
    });
}

// Buscar status de cobertura atual
export function useZoneCoverageStatus() {
    return useQuery({
        queryKey: ['zone-coverage'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('zone_coverage_status' as any)
                .select(`
          *,
          geo_zones:zone_id (name, priority_level)
        `)
                .order('checked_at', { ascending: false });

            if (error) throw error;

            // Agrupar por zona, pegando o mais recente
            const latestByZone = new Map<string, any>();
            const items = (data || []) as any[];
            for (const item of items) {
                if (!latestByZone.has(item.zone_id)) {
                    latestByZone.set(item.zone_id, item);
                }
            }

            return Array.from(latestByZone.values());
        },
        refetchInterval: 30000, // Atualiza a cada 30 segundos
    });
}

// Buscar dados do mapa de calor
export function useHeatmapData() {
    return useQuery({
        queryKey: ['heatmap'],
        queryFn: async (): Promise<HeatmapZone[]> => {
            try {
                const { data, error } = await supabase.rpc('get_heatmap_data' as any);

                if (error) throw error;
                return (data as unknown as HeatmapZone[]) || [];
            } catch (error) {
                console.error('Error fetching heatmap:', error);
                return [];
            }
        },
        refetchInterval: 15000, // Atualiza a cada 15 segundos
    });
}

// TAREFA 2: Buscar missões de deslocamento
export function useDisplacementMissions(status?: string) {
    return useQuery({
        queryKey: ['displacement-missions', status],
        queryFn: async () => {
            let query = supabase
                .from('displacement_missions' as any)
                .select(`
          *,
          geo_zones:target_zone_id (name, center_lat, center_lng),
          delivery_drivers:driver_id (name, phone)
        `)
                .order('created_at', { ascending: false })
                .limit(100);

            if (status) {
                query = query.eq('status', status);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        refetchInterval: 10000,
    });
}

// Analytics para COO (Etapa 14)
export function useDisplacementAnalytics(startDate?: Date, endDate?: Date) {
    return useQuery({
        queryKey: ['displacement-analytics', startDate?.toISOString(), endDate?.toISOString()],
        queryFn: async (): Promise<DisplacementAnalytics[]> => {
            try {
                const { data, error } = await supabase.rpc('get_displacement_analytics_report' as any, {
                    p_start_date: startDate?.toISOString() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    p_end_date: endDate?.toISOString() || new Date().toISOString(),
                });

                if (error) throw error;
                return (data as unknown as DisplacementAnalytics[]) || [];
            } catch (error) {
                console.error('Error fetching analytics:', error);
                return [];
            }
        },
    });
}

// =============================================
// TAREFA 3: Hooks para App do Entregador
// =============================================

// Buscar missões do driver
export function useDriverMissions(driverId?: string) {
    return useQuery({
        queryKey: ['driver-missions', driverId],
        queryFn: async (): Promise<DriverMission[]> => {
            if (!driverId) return [];

            try {
                const { data, error } = await supabase.rpc('get_driver_missions' as any, {
                    p_driver_id: driverId,
                });

                if (error) throw error;
                return (data as unknown as DriverMission[]) || [];
            } catch (error) {
                console.error('Error fetching driver missions:', error);
                return [];
            }
        },
        enabled: !!driverId,
        refetchInterval: 10000, // Atualiza a cada 10 segundos
    });
}

// Aceitar missão
export function useAcceptMission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ missionId, driverId }: { missionId: string; driverId: string }) => {
            const { data, error } = await supabase.rpc('accept_displacement_mission' as any, {
                p_mission_id: missionId,
                p_driver_id: driverId,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['driver-missions'] });
            queryClient.invalidateQueries({ queryKey: ['displacement-missions'] });
            toast.success('Missão aceita! Dirija-se à zona indicada.');
        },
    });
}

// Rejeitar missão
export function useRejectMission() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ missionId, driverId }: { missionId: string; driverId: string }) => {
            const { data, error } = await supabase.rpc('reject_displacement_mission' as any, {
                p_mission_id: missionId,
                p_driver_id: driverId,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['driver-missions'] });
            toast.info('Missão recusada');
        },
    });
}

// Check-in na zona
export function useZoneCheckin() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            driverId,
            lat,
            lng,
        }: {
            driverId: string;
            lat: number;
            lng: number;
        }): Promise<CheckinResult> => {
            const { data, error } = await supabase.rpc('driver_zone_checkin' as any, {
                p_driver_id: driverId,
                p_lat: lat,
                p_lng: lng,
            });

            if (error) throw error;
            return data as unknown as CheckinResult;
        },
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ['driver-missions'] });

            if (result.checked_in && result.priority_granted) {
                toast.success(result.message, {
                    duration: 5000,
                    icon: '🌟',
                });
            } else if (!result.checked_in && result.distance_remaining_km) {
                toast.info(result.message);
            }
        },
    });
}

// Atualizar localização do driver
export function useUpdateDriverLocation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            driverId,
            lat,
            lng,
        }: {
            driverId: string;
            lat: number;
            lng: number;
        }) => {
            const { data, error } = await supabase
                .from('delivery_drivers' as any)
                .update({
                    current_lat: lat,
                    current_lng: lng,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', driverId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['zone-coverage'] });
        },
    });
}

// =============================================
// Hook para monitoramento contínuo (simula cron job no frontend)
// =============================================

export function useCoverageMonitor(enabled = true) {
    const checkCoverage = useCheckZoneCoverage();

    // Este hook pode ser usado para disparar verificações periódicas
    // Em produção, isso seria um cron job do Supabase
    return {
        checkCoverage,
        isChecking: checkCoverage.isPending,
        lastCheck: checkCoverage.data,
    };
}
