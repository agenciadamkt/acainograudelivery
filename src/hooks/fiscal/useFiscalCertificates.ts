import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';
import { FiscalService } from '@/services/fiscal/FiscalService';

export interface FiscalCertificate {
  id: string;
  store_id: string;
  plugnotas_certificate_id: string | null;
  titular_cnpj: string | null;
  nome_cn: string | null;
  vencimento: string | null;
  status: 'valido' | 'proximo_vencimento' | 'vencido';
  ativo: boolean;
  created_at: string;
}

// Converte um File em base64 puro (sem o prefixo data:...;base64,)
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useFiscalCertificates() {
  const { currentStore } = useStore();
  const queryClient = useQueryClient();
  const storeId = currentStore?.id;

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ['fiscal_certificates', storeId],
    enabled: !!storeId,
    queryFn: async (): Promise<FiscalCertificate[]> => {
      const { data, error } = await (supabase as any)
        .from('fiscal_certificates')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const upload = useMutation({
    mutationFn: async ({ file, senha }: { file: File; senha: string }) => {
      if (!storeId) throw new Error('Nenhuma loja selecionada');
      const pfxBase64 = await fileToBase64(file);
      return FiscalService.uploadCertificado(storeId, pfxBase64, senha);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal_certificates', storeId] });
      queryClient.invalidateQueries({ queryKey: ['fiscal_company', storeId] });
      toast.success('Certificado enviado ao PlugNotas.');
    },
    onError: (e: any) => toast.error('Erro no upload do certificado: ' + e.message),
  });

  const activeCertificate = certificates.find((c) => c.ativo) || null;

  return { certificates, activeCertificate, isLoading, upload };
}
