import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import { FiscalService } from '@/services/fiscal/FiscalService';
import type { FiscalDocument, FiscalTipo } from '@/services/fiscal/types';

// Documentos fiscais de uma venda específica (pedido delivery ou venda PDV)
export function useFiscalDocumentsForSale(params: { orderId?: string; pdvOrderId?: string }) {
  const { orderId, pdvOrderId } = params;
  const enabled = !!(orderId || pdvOrderId);
  const consultingRef = useRef<Set<string>>(new Set());

  const query = useQuery({
    queryKey: ['fiscal_documents_sale', orderId, pdvOrderId],
    enabled,
    refetchInterval: (q) => {
      // Enquanto houver documento PROCESSANDO, refetch periódico p/ status ao vivo
      const docs = (q.state.data as FiscalDocument[]) || [];
      return docs.some((d) => d.status === 'PROCESSANDO') ? 8000 : false;
    },
    queryFn: async (): Promise<FiscalDocument[]> => {
      let q = (supabase as any).from('fiscal_documents').select('*').order('created_at', { ascending: false });
      q = orderId ? q.eq('order_id', orderId) : q.eq('pdv_order_id', pdvOrderId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Fallback do webhook: dispara consulta ao PlugNotas para PROCESSANDO pendentes
  useEffect(() => {
    const pend = (query.data || []).filter((d) => d.status === 'PROCESSANDO');
    pend.forEach((d) => {
      if (consultingRef.current.has(d.id)) return;
      consultingRef.current.add(d.id);
      FiscalService.consultar(d.id).finally(() => consultingRef.current.delete(d.id));
    });
  }, [query.data]);

  return query;
}

export interface FiscalListFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: string;   // 'all' | FiscalStatus
  tipo?: string;     // 'all' | FiscalTipo
  search?: string;   // número, chave ou cliente
}

// Listagem geral de documentos fiscais da loja (Histórico Fiscal)
export function useFiscalDocumentsList(filters: FiscalListFilters) {
  const { currentStore } = useStore();
  const storeId = currentStore?.id;

  return useQuery({
    queryKey: ['fiscal_documents', storeId, filters],
    enabled: !!storeId,
    refetchInterval: (q) => {
      const docs = (q.state.data as FiscalDocument[]) || [];
      return docs.some((d) => d.status === 'PROCESSANDO') ? 10000 : false;
    },
    queryFn: async (): Promise<FiscalDocument[]> => {
      let q = (supabase as any).from('fiscal_documents').select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(500);
      if (filters.dateFrom) q = q.gte('created_at', new Date(`${filters.dateFrom}T00:00:00`).toISOString());
      if (filters.dateTo) q = q.lte('created_at', new Date(`${filters.dateTo}T23:59:59`).toISOString());
      if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status);
      if (filters.tipo && filters.tipo !== 'all') q = q.eq('tipo_documento', filters.tipo);
      const { data, error } = await q;
      if (error) throw error;
      let rows: FiscalDocument[] = data || [];
      const s = (filters.search || '').trim().toLowerCase();
      if (s) {
        rows = rows.filter((d) =>
          String(d.numero || '').includes(s) ||
          (d.chave || '').toLowerCase().includes(s) ||
          (d.destinatario_nome || '').toLowerCase().includes(s) ||
          (d.destinatario_documento || '').includes(s),
        );
      }
      return rows;
    },
  });
}

export function useConsultarDocumento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => FiscalService.consultar(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal_documents_sale'] });
      queryClient.invalidateQueries({ queryKey: ['fiscal_documents'] });
    },
  });
}

export function useCancelarDocumento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, motivo }: { documentId: string; motivo: string }) =>
      FiscalService.cancelar(documentId, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal_documents_sale'] });
      queryClient.invalidateQueries({ queryKey: ['fiscal_documents'] });
      toast.success('Documento cancelado.');
    },
    onError: (e: any) => toast.error('Erro ao cancelar: ' + e.message),
  });
}

export function useEmitirDocumento() {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { tipo: FiscalTipo; orderId?: string; pdvOrderId?: string }) => {
      if (!currentStore?.id) throw new Error('Nenhuma loja selecionada');
      return FiscalService.emitir({ storeId: currentStore.id, ...params });
    },
    onSuccess: (res: any, vars) => {
      queryClient.invalidateQueries({ queryKey: ['fiscal_documents_sale', vars.orderId, vars.pdvOrderId] });
      if (res?.status === 'PROCESSANDO') toast.success('Nota enviada. Aguardando autorização...');
      else if (res?.status === 'ERRO') toast.error('Falha na emissão: ' + (res.motivo || 'erro'));
    },
    onError: (e: any) => toast.error('Erro ao emitir: ' + e.message),
  });
}
