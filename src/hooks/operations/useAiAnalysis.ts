/**
 * IA operacional (Operações 2.0 — M5): valida foto, compara com referência e
 * gera resumo do dia — via edge function `operations-ai` (Gemini).
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';

export interface PhotoVerdict {
  approved: boolean | null;
  score: number | null;
  reason: string | null;
  fraud_suspected?: boolean;
}

async function invoke(body: Record<string, unknown>) {
  // Envia o token do usuário EXPLICITAMENTE. O supabase.functions.invoke nem
  // sempre anexa o Authorization da sessão (o FunctionsClient pode ficar
  // dessincronizado), e a operations-ai exige um usuário válido (getUser) —
  // sem o token ela responde "não autenticado". Mesmo padrão do copilot-chat.
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error('Sua sessão expirou. Faça login novamente para usar a IA.');

  const { data, error } = await supabase.functions.invoke('operations-ai', {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (error) {
    // supabase-js lança "non-2xx status code" genérico — o motivo real está no
    // corpo da resposta (error.context). Extrai a mensagem de verdade.
    let msg = error.message;
    try {
      const j = await (error as any).context?.json?.();
      if (j?.error) {
        msg = j.error
          + (j.detail ? ` — ${j.detail}` : '')
          + (j.jwt_len !== undefined ? ` [token:${j.jwt_prefix}·${j.jwt_len}]` : '');
      }
    } catch { /* mantém genérico */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function useValidatePhoto() {
  const { currentStore } = useStore();
  return useMutation({
    mutationFn: async (args: { photoUrl: string; itemName: string; executionItemId?: string }): Promise<PhotoVerdict> =>
      invoke({
        action: 'validate_photo',
        photo_url: args.photoUrl,
        item_name: args.itemName,
        execution_item_id: args.executionItemId ?? null,
        store_id: currentStore?.id ?? null,
      }),
    onError: (e: any) => toast.error(e?.message ?? 'Falha na análise por IA.'),
  });
}

export function useCompareReference() {
  const { currentStore } = useStore();
  return useMutation({
    mutationFn: async (args: {
      photoUrl: string; referenceImageUrl: string; itemName: string; executionItemId?: string;
    }): Promise<PhotoVerdict> =>
      invoke({
        action: 'compare_reference',
        photo_url: args.photoUrl,
        reference_image_url: args.referenceImageUrl,
        item_name: args.itemName,
        execution_item_id: args.executionItemId ?? null,
        store_id: currentStore?.id ?? null,
      }),
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao comparar com a referência.'),
  });
}

export interface DailySummary {
  summary: string;
  stats: Record<string, number>;
}

export interface IntelligentReport {
  riscos: string[];
  destaques: string[];
  em_risco: string[];
  tendencia: string;
  recomendacoes: string[];
}

/** Relatório Inteligente — análise gerencial do período (Relatórios do CheckGrau). */
export function useIntelligentReport() {
  const { currentStore } = useStore();
  return useMutation({
    mutationFn: async (args: { storeIds: string[]; context: Record<string, unknown> }): Promise<IntelligentReport> => {
      const storeIds = args.storeIds.length > 0 ? args.storeIds : (currentStore?.id ? [currentStore.id] : []);
      const data = await invoke({ action: 'intelligent_report', store_ids: storeIds, context: args.context });
      return {
        riscos: data?.riscos ?? [],
        destaques: data?.destaques ?? [],
        em_risco: data?.em_risco ?? [],
        tendencia: data?.tendencia ?? '',
        recomendacoes: data?.recomendacoes ?? [],
      };
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao gerar o Relatório Inteligente.'),
  });
}

export function useDailySummary() {
  const { currentStore } = useStore();
  return useMutation({
    // O número destinatário do WhatsApp é resolvido no servidor (config da
    // unidade), não enviado pelo cliente. Suporta 1+ lojas (resumo consolidado).
    mutationFn: async (args: { date: string; storeIds?: string[]; sendWhatsapp?: boolean }): Promise<DailySummary> => {
      const storeIds = args.storeIds && args.storeIds.length > 0
        ? args.storeIds
        : (currentStore?.id ? [currentStore.id] : []);
      return invoke({
        action: 'daily_summary',
        store_ids: storeIds,
        date: args.date,
        send_whatsapp: args.sendWhatsapp ?? false,
      });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Falha ao gerar o resumo.'),
  });
}
