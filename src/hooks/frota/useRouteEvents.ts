import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getLastKnownOrCurrentPosition } from '@/lib/platform/geolocation';

export type FleetEventTipo =
  | 'cliente_ausente' | 'endereco_incorreto' | 'veiculo_problema'
  | 'pedido_recusado' | 'observacao' | 'atraso' | 'outro';
export type FleetEventSeverity = 'info' | 'warning' | 'critical';

export interface FleetRouteEvent {
  id: string;
  routeId: string;
  driverId: string;
  orderId: string | null;
  orderType: 'order' | 'manual' | 'franchisee' | null;
  tipo: FleetEventTipo;
  severity: FleetEventSeverity;
  observacao: string | null;
  latitude: number | null;
  longitude: number | null;
  attachmentUrl: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

// Severidade padrão por tipo — o motorista não escolhe, o tipo já carrega o
// nível de atenção esperado (ex: veículo com problema nasce crítico).
const SEVERITY_DEFAULT: Record<FleetEventTipo, FleetEventSeverity> = {
  cliente_ausente: 'warning',
  endereco_incorreto: 'warning',
  veiculo_problema: 'critical',
  pedido_recusado: 'warning',
  observacao: 'info',
  atraso: 'info',
  outro: 'info',
};

function mapRow(row: any): FleetRouteEvent {
  return {
    id: row.id,
    routeId: row.route_id,
    driverId: row.driver_id,
    orderId: row.order_id,
    orderType: row.order_type,
    tipo: row.tipo,
    severity: row.severity,
    observacao: row.observacao,
    latitude: row.latitude,
    longitude: row.longitude,
    attachmentUrl: row.attachment_url,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

export function useEventosDaRota(routeId: string | null) {
  return useQuery({
    queryKey: ['fleet_route_events', routeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fleet_route_events' as any)
        .select('*')
        .eq('route_id', routeId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    enabled: !!routeId,
  });
}

export function useCriarEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      routeId: string;
      driverId: string;
      tipo: FleetEventTipo;
      observacao?: string;
      orderId?: string | null;
      orderType?: 'order' | 'manual' | 'franchisee' | null;
    }) => {
      const posicao = await getLastKnownOrCurrentPosition();
      const { error } = await supabase.from('fleet_route_events' as any).insert({
        route_id: payload.routeId,
        driver_id: payload.driverId,
        order_id: payload.orderId ?? null,
        order_type: payload.orderType ?? null,
        tipo: payload.tipo,
        severity: SEVERITY_DEFAULT[payload.tipo],
        observacao: payload.observacao ?? null,
        latitude: posicao?.latitude ?? null,
        longitude: posicao?.longitude ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['fleet_route_events', variables.routeId] });
      qc.invalidateQueries({ queryKey: ['fleet_route_events', 'abertas-count'] });
      toast.success('Evento registrado!');
    },
    onError: (err: any) => toast.error('Erro ao registrar evento: ' + err.message),
  });
}

export function useResolverEvento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fleet_route_events' as any)
        .update({ resolved_at: new Date().toISOString() } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fleet_route_events'] });
      toast.success('Marcado como resolvido.');
    },
    onError: (err: any) => toast.error('Erro: ' + err.message),
  });
}

export function useOcorrenciasAbertasCount() {
  return useQuery({
    queryKey: ['fleet_route_events', 'abertas-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('fleet_route_events' as any)
        .select('id', { count: 'exact', head: true })
        .is('resolved_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
