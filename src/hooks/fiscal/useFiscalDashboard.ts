import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';

export interface FiscalDashboardData {
  total: number;
  autorizadas: number;
  rejeitadas: number;
  canceladas: number;
  pendentes: number;
  erros: number;
  tempoMedioSeg: number | null;
  valorAutorizado: number;
}

export function useFiscalDashboard(dateFrom: string, dateTo: string) {
  const { currentStore } = useStore();
  const storeId = currentStore?.id;

  return useQuery({
    queryKey: ['fiscal_dashboard', storeId, dateFrom, dateTo],
    enabled: !!storeId,
    refetchInterval: (q) => {
      const d = q.state.data as FiscalDashboardData | undefined;
      return d && d.pendentes > 0 ? 15000 : false;
    },
    queryFn: async (): Promise<FiscalDashboardData> => {
      const { data, error } = await (supabase as any)
        .from('fiscal_documents')
        .select('status, valor_total, emitido_em, updated_at')
        .eq('store_id', storeId)
        .gte('created_at', new Date(`${dateFrom}T00:00:00`).toISOString())
        .lte('created_at', new Date(`${dateTo}T23:59:59`).toISOString());
      if (error) throw error;
      const rows: any[] = data || [];

      let autorizadas = 0, rejeitadas = 0, canceladas = 0, pendentes = 0, erros = 0, valorAutorizado = 0;
      let somaTempo = 0, contaTempo = 0;
      for (const r of rows) {
        switch (r.status) {
          case 'AUTORIZADO':
            autorizadas++; valorAutorizado += Number(r.valor_total || 0);
            if (r.emitido_em && r.updated_at) {
              const dt = (new Date(r.updated_at).getTime() - new Date(r.emitido_em).getTime()) / 1000;
              if (dt >= 0 && dt < 86400) { somaTempo += dt; contaTempo++; }
            }
            break;
          case 'REJEITADO': rejeitadas++; break;
          case 'CANCELADO': canceladas++; break;
          case 'PROCESSANDO': pendentes++; break;
          case 'ERRO': erros++; break;
        }
      }
      return {
        total: rows.length, autorizadas, rejeitadas, canceladas, pendentes, erros,
        tempoMedioSeg: contaTempo > 0 ? Math.round(somaTempo / contaTempo) : null,
        valorAutorizado,
      };
    },
  });
}
