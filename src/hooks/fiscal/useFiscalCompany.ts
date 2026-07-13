import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import { FiscalService } from '@/services/fiscal/FiscalService';
import { FISCAL_COMPANY_SAFE_COLS, type FiscalCompany } from '@/services/fiscal/types';

export function useFiscalCompany() {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  const storeId = currentStore?.id;

  const { data: company, isLoading } = useQuery({
    queryKey: ['fiscal_company', storeId],
    enabled: !!storeId,
    queryFn: async (): Promise<FiscalCompany | null> => {
      const { data, error } = await (supabase as any)
        .from('fiscal_companies')
        .select(FISCAL_COMPANY_SAFE_COLS)
        .eq('store_id', storeId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['fiscal_company', storeId] });

  // Config local (ambiente, regime, IBGE, auto_emitir, timeout, DANFE) — cria a linha se não existir
  const saveConfig = useMutation({
    mutationFn: async (patch: Partial<FiscalCompany>) => {
      if (!storeId) throw new Error('Nenhuma loja selecionada');
      const { data: existing } = await (supabase as any)
        .from('fiscal_companies').select('id').eq('store_id', storeId).maybeSingle();
      if (existing) {
        const { error } = await (supabase as any).from('fiscal_companies').update(patch).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('fiscal_companies').insert({ store_id: storeId, ...patch });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidate(); toast.success('Configuração fiscal salva.'); },
    onError: (e: any) => toast.error('Erro ao salvar: ' + e.message),
  });

  const saveToken = useMutation({
    mutationFn: async (token: string) => FiscalService.salvarToken(storeId!, token),
    onSuccess: () => { invalidate(); toast.success('Token do PlugNotas salvo com segurança.'); },
    onError: (e: any) => toast.error('Erro ao salvar token: ' + e.message),
  });

  const sync = useMutation({
    mutationFn: async () => FiscalService.sincronizarEmpresa(storeId!),
    onSuccess: () => { invalidate(); toast.success('Empresa sincronizada com o PlugNotas.'); },
    onError: (e: any) => toast.error('Erro ao sincronizar: ' + e.message),
  });

  const testConnection = useMutation({
    mutationFn: async () => FiscalService.testarConexao(storeId!),
    onSuccess: (res: any) => res?.ok ? toast.success(res.message || 'Conexão OK.') : toast.error(res?.message || 'Token rejeitado.'),
    onError: (e: any) => toast.error('Falha no teste: ' + e.message),
  });

  return { company, isLoading, saveConfig, saveToken, sync, testConnection };
}
