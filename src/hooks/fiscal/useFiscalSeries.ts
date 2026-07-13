import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import { useFiscalCompany } from './useFiscalCompany';
import type { FiscalTipo } from '@/services/fiscal/types';

export interface FiscalSerie {
  id: string;
  fiscal_company_id: string;
  store_id: string;
  tipo_documento: FiscalTipo;
  serie: number;
  proximo_numero: number;
  ambiente: string;
  ativo: boolean;
}

export function useFiscalSeries() {
  const { currentStore } = useStore();
  const { company } = useFiscalCompany();
  const queryClient = useQueryClient();
  const companyId = company?.id;
  const ambiente = company?.ambiente || 'homologacao';

  const { data: series = [], isLoading } = useQuery({
    queryKey: ['fiscal_series', companyId, ambiente],
    enabled: !!companyId,
    queryFn: async (): Promise<FiscalSerie[]> => {
      const { data, error } = await (supabase as any)
        .from('fiscal_series')
        .select('*')
        .eq('fiscal_company_id', companyId)
        .eq('ambiente', ambiente)
        .order('tipo_documento');
      if (error) throw error;
      return data || [];
    },
  });

  const upsert = useMutation({
    mutationFn: async ({ tipo, serie, proximo_numero }: { tipo: FiscalTipo; serie: number; proximo_numero: number }) => {
      if (!companyId || !currentStore?.id) throw new Error('Configure a empresa fiscal primeiro.');
      const { data: existing } = await (supabase as any)
        .from('fiscal_series').select('id')
        .eq('fiscal_company_id', companyId).eq('tipo_documento', tipo).eq('ambiente', ambiente).maybeSingle();
      if (existing) {
        const { error } = await (supabase as any).from('fiscal_series').update({ serie, proximo_numero }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('fiscal_series').insert({
          store_id: currentStore.id, fiscal_company_id: companyId, tipo_documento: tipo, serie, proximo_numero, ambiente,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal_series', companyId, ambiente] });
      toast.success('Série salva.');
    },
    onError: (e: any) => toast.error('Erro ao salvar série: ' + e.message),
  });

  return { series, isLoading, ambiente, hasCompany: !!companyId, upsert };
}
