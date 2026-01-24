import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useStore } from '@/contexts/StoreContext';

export interface FinancialTransaction {
  id: string;
  type: 'receita' | 'despesa';
  category_id: string | null;
  amount: number;
  description: string;
  reference_id: string | null;
  reference_type: string | null;
  payment_method: string | null;
  status: 'pendente' | 'confirmado' | 'cancelado';
  due_date: string | null;
  paid_date: string | null;
  store_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  category?: {
    name: string;
    color: string;
  };
}

interface TransactionFilters {
  type?: 'receita' | 'despesa';
  status?: string;
  date_from?: string;
  date_to?: string;
}

export function useFinancialTransactions(filters?: TransactionFilters) {
  const { currentStore } = useStore();

  return useQuery({
    queryKey: ['financial-transactions', currentStore?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('financial_transactions')
        .select('*, category:financial_categories(name, color)')
        .order('created_at', { ascending: false });

      if (currentStore?.id) {
        query = query.eq('store_id', currentStore.id);
      }

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as FinancialTransaction[];
    },
    enabled: !!currentStore?.id,
  });
}

export function useCreateFinancialTransaction() {
  const queryClient = useQueryClient();
  const { currentStore } = useStore();

  return useMutation({
    mutationFn: async (transaction: Omit<FinancialTransaction, 'id' | 'created_at' | 'updated_at' | 'category'>) => {
      // Garantir que a transação tenha o store_id se não for fornecido
      const payload = {
        ...transaction,
        store_id: transaction.store_id || currentStore?.id
      };

      const { data, error } = await supabase
        .from('financial_transactions')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
      toast({
        title: 'Transação criada',
        description: 'Transação financeira criada com sucesso.',
      });
    },
  });
}

export function useUpdateFinancialTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...transaction }: Partial<FinancialTransaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('financial_transactions')
        .update(transaction)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
      toast({
        title: 'Transação atualizada',
        description: 'Transação financeira atualizada com sucesso.',
      });
    },
  });
}

export function useDeleteFinancialTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['financial-stats'] });
      toast({
        title: 'Transação excluída',
        description: 'Transação financeira excluída com sucesso.',
      });
    },
  });
}
