// ============================================================================
// FocusNfeService — cliente HTTP da Focus NFe.
// Roda SOMENTE em edge functions (Deno). Docs: https://doc.focusnfe.com.br
//
// Particularidades da Focus (vs PlugNotas):
//  · Auth: HTTP Basic com o token como usuário e senha vazia (token:'').
//  · Emissão é assíncrona e identificada por uma "referência" (ref) que NÓS
//    definimos (usamos o id do fiscal_document). Consulta/cancelamento usam a ref.
//  · Status: processando_autorizacao | autorizado | cancelado | erro_autorizacao | denegado
//  · Retorno de autorização traz caminho_danfe e caminho_xml_nota_fiscal (URLs).
// ============================================================================
import type { FiscalAmbiente, FiscalTipo } from './plugnotas.ts';

function baseUrl(ambiente: FiscalAmbiente): string {
  // Focus só tem 2 ambientes de API: homologação e produção.
  return ambiente === 'producao'
    ? 'https://api.focusnfe.com.br'
    : 'https://homologacao.focusnfe.com.br';
}

const PATHS: Record<string, string> = { NFCE: 'nfce', NFE: 'nfe', NFSE: 'nfse' };

export interface FocusResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  durationMs: number;
  endpoint: string;
  method: string;
  error?: string;
}

export class FocusNfeService {
  private token: string;
  private ambiente: FiscalAmbiente;
  private timeoutMs: number;

  constructor(token: string, ambiente: FiscalAmbiente = 'homologacao', timeoutSeg = 30) {
    this.token = token;
    this.ambiente = ambiente;
    this.timeoutMs = Math.max(5, timeoutSeg) * 1000;
  }

  private authHeader(): string {
    // Basic base64("<token>:")
    return 'Basic ' + btoa(`${this.token}:`);
  }

  async request<T = any>(method: string, path: string, body?: unknown): Promise<FocusResponse<T>> {
    const url = `${baseUrl(this.ambiente)}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const started = Date.now();
    const headers: Record<string, string> = { Authorization: this.authHeader() };
    let payload: BodyInit | undefined;
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    try {
      const res = await fetch(url, { method, headers, body: payload, signal: controller.signal });
      const durationMs = Date.now() - started;
      const text = await res.text();
      let data: any = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      return { ok: res.ok, status: res.status, data, durationMs, endpoint: path, method };
    } catch (e) {
      const durationMs = Date.now() - started;
      const aborted = (e as Error).name === 'AbortError';
      return { ok: false, status: aborted ? 408 : 0, data: null as any, durationMs, endpoint: path, method, error: aborted ? `Timeout após ${this.timeoutMs}ms` : (e as Error).message };
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Emissão (ref definido por nós) ─────────────────────────────────────────
  emitir(tipo: FiscalTipo, ref: string, payload: unknown) {
    const p = PATHS[tipo];
    if (!p) throw new Error(`Tipo não suportado na Focus: ${tipo}`);
    return this.request('POST', `/v2/${p}?ref=${encodeURIComponent(ref)}`, payload);
  }

  // ── Consulta por ref ────────────────────────────────────────────────────────
  consultar(tipo: FiscalTipo, ref: string) {
    const p = PATHS[tipo];
    return this.request('GET', `/v2/${p}/${encodeURIComponent(ref)}`);
  }

  // ── Cancelamento por ref ────────────────────────────────────────────────────
  cancelar(tipo: FiscalTipo, ref: string, justificativa: string) {
    const p = PATHS[tipo];
    return this.request('DELETE', `/v2/${p}/${encodeURIComponent(ref)}`, { justificativa });
  }

  // ── Empresa (cadastro + certificado no mesmo endpoint) ──────────────────────
  cadastrarEmpresa(payload: unknown) { return this.request('POST', '/v2/empresas', payload); }
  atualizarEmpresa(id: string | number, payload: unknown) { return this.request('PUT', `/v2/empresas/${id}`, payload); }
  consultarEmpresa(cnpj: string) { return this.request('GET', `/v2/empresas?cnpj=${encodeURIComponent(cnpj)}`); }

  // ── Download binário de DANFE/XML a partir do caminho retornado ─────────────
  async fetchBinaryUrl(caminho: string, kind: 'pdf' | 'xml'): Promise<{ ok: boolean; status: number; bytes: Uint8Array; contentType: string; durationMs: number; endpoint: string; error?: string }> {
    // caminho pode vir relativo (ex: /arquivos/...); completa com a base.
    const url = caminho.startsWith('http') ? caminho : `${baseUrl(this.ambiente)}${caminho}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const started = Date.now();
    try {
      const res = await fetch(url, { headers: { Authorization: this.authHeader() }, signal: controller.signal });
      const bytes = new Uint8Array(await res.arrayBuffer());
      return { ok: res.ok, status: res.status, bytes, contentType: res.headers.get('content-type') || (kind === 'pdf' ? 'application/pdf' : 'application/xml'), durationMs: Date.now() - started, endpoint: url };
    } catch (e) {
      return { ok: false, status: 0, bytes: new Uint8Array(), contentType: '', durationMs: Date.now() - started, endpoint: url, error: (e as Error).message };
    } finally {
      clearTimeout(timer);
    }
  }
}
