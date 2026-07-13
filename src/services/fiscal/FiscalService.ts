// ============================================================================
// FiscalService (frontend) — fachada única do módulo Fiscal.
// As telas/hooks chamam SOMENTE este serviço; ele invoca as edge functions.
// NUNCA chama o PlugNotas diretamente (o token vive no servidor).
//   FiscalService (aqui) → edge function → PlugNotasService → PlugNotas API
// ============================================================================
import { supabase } from '@/integrations/supabase/client';
import type { FiscalTipo } from './types';

async function invoke<T = any>(fn: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message || `Falha ao chamar ${fn}`);
  if (data && (data as any).error) throw new Error((data as any).error);
  return data as T;
}

export const FiscalService = {
  // ── Empresa ──────────────────────────────────────────────────────────────
  sincronizarEmpresa(storeId: string) {
    return invoke('fiscal-empresa', { action: 'sync', storeId });
  },
  salvarToken(storeId: string, token: string) {
    return invoke('fiscal-empresa', { action: 'set-token', storeId, token });
  },
  testarConexao(storeId: string) {
    return invoke('fiscal-empresa', { action: 'test', storeId });
  },

  // ── Certificado ────────────────────────────────────────────────────────────
  // O arquivo .pfx é enviado como base64 e repassado ao PlugNotas na edge.
  uploadCertificado(storeId: string, pfxBase64: string, senha: string) {
    return invoke('fiscal-certificado', { action: 'upload', storeId, pfxBase64, senha });
  },

  // ── Emissão / Consulta / Cancelamento ──────────────────────────────────────
  emitir(params: { storeId: string; tipo: FiscalTipo; orderId?: string; pdvOrderId?: string }) {
    return invoke('fiscal-emitir', params);
  },
  consultar(documentId: string) {
    return invoke('fiscal-consultar', { documentId });
  },
  cancelar(documentId: string, motivo: string) {
    return invoke('fiscal-cancelar', { documentId, motivo });
  },

  // ── Download / impressão (retorna signed URL de curta duração) ──────────────
  async baixarDocumento(documentId: string, kind: 'pdf' | 'xml'): Promise<string> {
    const res = await invoke<{ url: string }>('fiscal-documento', { documentId, kind });
    return res.url;
  },
};

export type { FiscalTipo } from './types';
