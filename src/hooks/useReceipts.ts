/**
 * Hook de dados dos Recibos de Baixas (ERP Cefas).
 *
 * - `useReceipts`      → lista o histórico agrupado por lote (batch).
 * - `useReceiptKpis`   → indicadores (qtd hoje/semana/mês, por forma, total).
 * - `useSaveReceipts`  → grava um lote de recibos em `financial_receipts`.
 *
 * Armazenamento: apenas metadados no banco. O PDF é baixado localmente
 * (ver `lib/receipts/receiptPdf.ts`), sem upload para nuvem.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ReceiptRow {
  id: string;
  batch_id: string;
  client_name: string;
  client_document: string | null;
  title_number: string;
  payment_date: string | null;
  payment_method: string;
  amount: number;
  source_file: string | null;
  created_by: string | null;
  created_at: string;
}

/** Um lote (uma geração) agregado para o histórico. */
export interface ReceiptBatch {
  batch_id: string;
  source_file: string | null;
  created_at: string;
  count: number;
  total: number;
  createdByName: string | null;
}

/** Dado de entrada para gravar um recibo. */
export interface NewReceipt {
  client_name: string;
  client_document: string | null;
  title_number: string;
  payment_date: string | null; // ISO yyyy-mm-dd ou null
  payment_method: string;
  amount: number;
}

const QK = ['financial-receipts'];

/**
 * Nome de exibição do usuário logado, para o rodapé do recibo
 * ("Responsável: ..."). Busca `user_profiles.nome` (onde fica o nome real do
 * operador, ex: "Fábio Ricardo"); se vazio, tenta `profiles.full_name`; por
 * fim usa o fallback (nome do e-mail).
 */
export function useCurrentUserName(userId: string | undefined, fallback: string) {
  return useQuery({
    queryKey: ['user-display-name', userId],
    enabled: !!userId,
    queryFn: async (): Promise<string> => {
      const { data: up } = await (supabase as any)
        .from('user_profiles')
        .select('nome')
        .eq('id', userId)
        .single();
      const nome = (up?.nome as string | null)?.trim();
      if (nome) return nome;

      const { data: p } = await (supabase as any)
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .single();
      const fullName = (p?.full_name as string | null)?.trim();
      return fullName || fallback;
    },
    initialData: fallback,
  });
}

/** Lista o histórico de lotes de recibos, mais recentes primeiro. */
export function useReceipts() {
  return useQuery({
    queryKey: QK,
    queryFn: async (): Promise<ReceiptBatch[]> => {
      // `financial_receipts` ainda não está nos tipos gerados do Supabase.
      const { data, error } = await (supabase as any)
        .from('financial_receipts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = (data ?? []) as ReceiptRow[];
      const batches = new Map<string, ReceiptBatch>();
      for (const r of rows) {
        const b = batches.get(r.batch_id);
        if (b) {
          b.count += 1;
          b.total += Number(r.amount) || 0;
        } else {
          batches.set(r.batch_id, {
            batch_id: r.batch_id,
            source_file: r.source_file,
            created_at: r.created_at,
            count: 1,
            total: Number(r.amount) || 0,
            createdByName: null,
          });
        }
      }
      return [...batches.values()].sort(
        (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
      );
    },
  });
}

export interface ReceiptKpis {
  countToday: number;
  countWeek: number;
  countMonth: number;
  byMethod: Record<string, { count: number; total: number }>;
  totalReceived: number;
}

function startOfWeek(now: Date): Date {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // segunda = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

/** Indicadores do dashboard de recibos, calculados a partir da tabela. */
export function useReceiptKpis() {
  return useQuery({
    queryKey: [...QK, 'kpis'],
    queryFn: async (): Promise<ReceiptKpis> => {
      const { data, error } = await (supabase as any)
        .from('financial_receipts')
        .select('amount, payment_method, created_at');
      if (error) throw error;
      const rows = (data ?? []) as Pick<
        ReceiptRow,
        'amount' | 'payment_method' | 'created_at'
      >[];

      const now = new Date();
      const startToday = new Date(now);
      startToday.setHours(0, 0, 0, 0);
      const startWeek = startOfWeek(now);
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const kpis: ReceiptKpis = {
        countToday: 0,
        countWeek: 0,
        countMonth: 0,
        byMethod: {},
        totalReceived: 0,
      };

      for (const r of rows) {
        const created = new Date(r.created_at);
        const amount = Number(r.amount) || 0;
        kpis.totalReceived += amount;
        if (created >= startToday) kpis.countToday += 1;
        if (created >= startWeek) kpis.countWeek += 1;
        if (created >= startMonth) kpis.countMonth += 1;

        const m = r.payment_method || 'Outro';
        if (!kpis.byMethod[m]) kpis.byMethod[m] = { count: 0, total: 0 };
        kpis.byMethod[m].count += 1;
        kpis.byMethod[m].total += amount;
      }
      return kpis;
    },
  });
}

/** Busca as linhas (títulos) de um lote específico, para reimpressão. */
export async function getBatchReceipts(batchId: string): Promise<ReceiptRow[]> {
  const { data, error } = await (supabase as any)
    .from('financial_receipts')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ReceiptRow[];
}

/** Exclui um lote inteiro (todos os recibos com o mesmo `batch_id`). */
export function useDeleteReceiptBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (batchId: string): Promise<void> => {
      const { error } = await (supabase as any)
        .from('financial_receipts')
        .delete()
        .eq('batch_id', batchId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
      toast({
        title: 'Lote excluído',
        description: 'Os recibos deste lote foram removidos do histórico.',
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir o lote';
      toast({ title: 'Falha ao excluir', description: msg, variant: 'destructive' });
    },
  });
}

/** Grava um lote de recibos. Retorna o `batch_id` gerado. */
export function useSaveReceipts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      receipts: NewReceipt[];
      sourceFile: string;
      createdBy: string | null;
      storeId?: string | null;
    }): Promise<string> => {
      const batchId = crypto.randomUUID();
      const payload = args.receipts.map((r) => ({
        ...r,
        batch_id: batchId,
        source_file: args.sourceFile,
        created_by: args.createdBy,
        store_id: args.storeId ?? null,
      }));
      const { error } = await (supabase as any).from('financial_receipts').insert(payload);
      if (error) throw error;
      return batchId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar recibos';
      toast({ title: 'Falha ao salvar', description: msg, variant: 'destructive' });
    },
  });
}
