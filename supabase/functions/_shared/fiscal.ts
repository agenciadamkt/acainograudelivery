// ============================================================================
// Helpers fiscais server-side (Deno). Orquestram banco + PlugNotas.
// Usados por todas as edge functions fiscais (emitir/consultar/webhook/etc.).
// ============================================================================
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PlugNotasService, FiscalAmbiente } from './plugnotas.ts';

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

function encryptionKey(): string {
  const key = Deno.env.get('FISCAL_ENCRYPTION_KEY');
  if (!key) throw new Error('FISCAL_ENCRYPTION_KEY não configurada no ambiente da função.');
  return key;
}

export interface FiscalCompany {
  id: string;
  store_id: string;
  plugnotas_company_id: string | null;
  ambiente: FiscalAmbiente;
  timeout_seg: number;
  auto_emitir: boolean;
  webhook_secret: string | null;
  ativo: boolean;
  provider: 'plugnotas' | 'focusnfe';
}

const COMPANY_COLS = 'id, store_id, plugnotas_company_id, ambiente, timeout_seg, auto_emitir, webhook_secret, ativo, provider';

// Empresa fiscal por loja (sem o token — token vem só via RPC decifrada)
export async function getCompanyByStore(db: SupabaseClient, storeId: string): Promise<FiscalCompany | null> {
  const { data } = await db.from('fiscal_companies').select(COMPANY_COLS).eq('store_id', storeId).maybeSingle();
  return (data as FiscalCompany) ?? null;
}

export async function getCompanyById(db: SupabaseClient, id: string): Promise<FiscalCompany | null> {
  const { data } = await db.from('fiscal_companies').select(COMPANY_COLS).eq('id', id).maybeSingle();
  return (data as FiscalCompany) ?? null;
}

// Grava o token cifrado (pgcrypto via RPC service_role)
export async function setToken(db: SupabaseClient, companyId: string, token: string): Promise<void> {
  const { error } = await db.rpc('fiscal_set_token', { _company_id: companyId, _token: token, _key: encryptionKey() });
  if (error) throw new Error('Falha ao cifrar token: ' + error.message);
}

// Lê o token decifrado (somente server-side)
export async function getToken(db: SupabaseClient, companyId: string): Promise<string | null> {
  const { data, error } = await db.rpc('fiscal_get_token', { _company_id: companyId, _key: encryptionKey() });
  if (error) throw new Error('Falha ao decifrar token: ' + error.message);
  return (data as string) ?? null;
}

// Instancia um PlugNotasService pronto para a empresa (token decifrado)
export async function plugnotasFor(db: SupabaseClient, company: FiscalCompany): Promise<PlugNotasService> {
  const token = await getToken(db, company.id);
  if (!token) throw new Error('Empresa sem token PlugNotas configurado.');
  return new PlugNotasService(token, company.ambiente, company.timeout_seg);
}

// Registra uma chamada ao PlugNotas em fiscal_logs (nunca lança — logging best-effort)
export async function logCall(db: SupabaseClient, entry: {
  store_id?: string | null; fiscal_document_id?: string | null;
  endpoint?: string; metodo?: string; request?: unknown; response?: unknown;
  status_code?: number; erro?: string | null; duracao_ms?: number; user_id?: string | null;
}): Promise<void> {
  try {
    await db.from('fiscal_logs').insert({
      store_id: entry.store_id ?? null,
      fiscal_document_id: entry.fiscal_document_id ?? null,
      endpoint: entry.endpoint ?? null,
      metodo: entry.metodo ?? null,
      request: entry.request ?? null,
      response: entry.response ?? null,
      status_code: entry.status_code ?? null,
      erro: entry.erro ?? null,
      duracao_ms: entry.duracao_ms ?? null,
      user_id: entry.user_id ?? null,
    });
  } catch (_) { /* silencioso por design */ }
}

// Registra um evento na timeline do documento
export async function addEvent(db: SupabaseClient, documentId: string, tipo: string, descricao?: string, payload?: unknown, userId?: string | null): Promise<void> {
  try {
    await db.from('fiscal_events').insert({
      fiscal_document_id: documentId, tipo, descricao: descricao ?? null, payload: payload ?? null, user_id: userId ?? null,
    });
  } catch (_) { /* silencioso */ }
}

// Atualiza campos do documento
export async function updateDocument(db: SupabaseClient, documentId: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await db.from('fiscal_documents').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', documentId);
  if (error) throw new Error('Falha ao atualizar documento fiscal: ' + error.message);
}

// Normaliza o status vindo do PlugNotas (consulta ou webhook) para a máquina de estados
export function mapPlugNotasStatus(raw?: string): string | null {
  const s = (raw || '').toUpperCase();
  if (['CONCLUIDO', 'AUTORIZADO', 'AUTORIZADA', 'APROVADO'].includes(s)) return 'AUTORIZADO';
  if (['REJEITADO', 'REJEITADA', 'DENEGADO', 'DENEGADA'].includes(s)) return 'REJEITADO';
  if (['CANCELADO', 'CANCELADA'].includes(s)) return 'CANCELADO';
  if (['PROCESSANDO', 'EM_PROCESSAMENTO', 'PENDENTE'].includes(s)) return 'PROCESSANDO';
  if (['ERRO', 'ERRO_AUTORIZACAO', 'FALHA', 'INTERROMPIDO'].includes(s)) return 'ERRO';
  return null;
}

// Aplica uma resolução já NORMALIZADA (agnóstica de provedor). Idempotente.
export async function applyNormalized(db: SupabaseClient, doc: any, sr: {
  docStatus: string | null; chave?: string | null; protocolo?: string | null; numero?: number | null;
  xmlUrl?: string | null; pdfUrl?: string | null; motivo?: string | null; raw?: any;
}, origem: string): Promise<string> {
  const novo = sr.docStatus;
  if (!novo || novo === doc.status || novo === 'PROCESSANDO') return doc.status;
  if (['AUTORIZADO', 'CANCELADO'].includes(doc.status)) return doc.status;

  const patch: Record<string, unknown> = { status: novo, payload_recebido: sr.raw ?? null, updated_at: new Date().toISOString() };
  if (novo === 'AUTORIZADO') {
    patch.chave = sr.chave ?? null;
    patch.protocolo = sr.protocolo ?? null;
    if (sr.numero != null) patch.numero = sr.numero;
    patch.xml_url = sr.xmlUrl ?? null;
    patch.pdf_url = sr.pdfUrl ?? null;
  } else if (novo === 'REJEITADO' || novo === 'ERRO') {
    patch.motivo_rejeicao = sr.motivo || 'Rejeitado';
  }
  await db.from('fiscal_documents').update(patch).eq('id', doc.id);
  await addEvent(db, doc.id, novo, `Status → ${novo} (${origem})`, sr.raw ?? null);
  return novo;
}

// Aplica a resolução de status a um documento (idempotente). Retorna o status final.
export async function applyResolution(db: SupabaseClient, doc: any, data: any, novo: string | null, origem: string): Promise<string> {
  // Sem mudança relevante → mantém
  if (!novo || novo === doc.status || novo === 'PROCESSANDO') return doc.status;
  // Não sobrescreve estados terminais já gravados
  if (['AUTORIZADO', 'CANCELADO'].includes(doc.status)) return doc.status;

  const patch: Record<string, unknown> = { status: novo, payload_recebido: data, updated_at: new Date().toISOString() };
  if (novo === 'AUTORIZADO') {
    patch.chave = data?.chave || data?.chaveAcesso || null;
    patch.protocolo = data?.protocolo || data?.numeroProtocolo || null;
    if (data?.numero != null) patch.numero = data.numero;
    patch.xml_url = data?.xml || data?.links?.xml || data?.arquivos?.xml || null;
    patch.pdf_url = data?.pdf || data?.danfe || data?.links?.pdf || data?.arquivos?.pdf || null;
  } else if (novo === 'REJEITADO' || novo === 'ERRO') {
    patch.motivo_rejeicao = data?.motivo || data?.mensagem || data?.erro || 'Rejeitado';
  }
  await db.from('fiscal_documents').update(patch).eq('id', doc.id);
  await addEvent(db, doc.id, novo, `Status → ${novo} (${origem})`, data);
  return novo;
}
