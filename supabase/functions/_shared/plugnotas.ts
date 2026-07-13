// ============================================================================
// PlugNotasService — cliente HTTP do PlugNotas (Tecnospeed).
// Roda SOMENTE em edge functions (Deno). Nunca no frontend: o token vive aqui.
// Docs: https://docs.plugnotas.com.br
// ============================================================================

export type FiscalAmbiente = 'sandbox' | 'homologacao' | 'producao';
export type FiscalTipo = 'NFCE' | 'NFE' | 'NFSE' | 'MDFE' | 'CFE';

// Base URL por ambiente. Sandbox tem host próprio; homologação/produção usam o
// host de produção (o tipo de ambiente SEFAZ vai no payload/empresa).
function baseUrl(ambiente: FiscalAmbiente): string {
  return ambiente === 'sandbox'
    ? 'https://api.sandbox.plugnotas.com.br'
    : 'https://api.plugnotas.com.br';
}

// Token público de sandbox do PlugNotas (para testes sem credencial real).
export const PLUGNOTAS_SANDBOX_TOKEN = '2da392a6-79d2-4304-a8b7-959572c7e44d';

const PATHS: Record<Exclude<FiscalTipo, 'MDFE' | 'CFE'>, string> = {
  NFCE: '/nfce',
  NFE: '/nfe',
  NFSE: '/nfse',
};

export interface PlugNotasResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  durationMs: number;
  endpoint: string;
  method: string;
  error?: string;
}

export class PlugNotasService {
  private token: string;
  private ambiente: FiscalAmbiente;
  private timeoutMs: number;

  constructor(token: string, ambiente: FiscalAmbiente = 'homologacao', timeoutSeg = 30) {
    this.token = token;
    this.ambiente = ambiente;
    this.timeoutMs = Math.max(5, timeoutSeg) * 1000;
  }

  // ── Requisição genérica (base de tudo; sempre retorna cru para logging) ──
  async request<T = any>(
    method: string,
    path: string,
    body?: unknown,
    opts?: { isForm?: boolean },
  ): Promise<PlugNotasResponse<T>> {
    const url = `${baseUrl(this.ambiente)}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const started = Date.now();

    const headers: Record<string, string> = { 'X-API-KEY': this.token };
    let payload: BodyInit | undefined;
    if (body !== undefined) {
      if (opts?.isForm) {
        payload = body as FormData; // FormData define seu próprio content-type
      } else {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
      }
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
      return {
        ok: false,
        status: aborted ? 408 : 0,
        data: null as any,
        durationMs,
        endpoint: path,
        method,
        error: aborted ? `Timeout após ${this.timeoutMs}ms` : (e as Error).message,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Empresa ──────────────────────────────────────────────────────────────
  cadastrarEmpresa(payload: unknown) { return this.request('POST', '/empresa', payload); }
  consultarEmpresa(cnpj: string)     { return this.request('GET', `/empresa/${cnpj}`); }
  atualizarEmpresa(cnpj: string, payload: unknown) { return this.request('PATCH', `/empresa/${cnpj}`, payload); }

  // ── Certificado (multipart: .pfx vai direto ao PlugNotas) ─────────────────
  uploadCertificado(form: FormData) { return this.request('POST', '/certificado', form, { isForm: true }); }

  // ── Emissão ──────────────────────────────────────────────────────────────
  emitir(tipo: FiscalTipo, payload: unknown) {
    const path = PATHS[tipo as keyof typeof PATHS];
    if (!path) throw new Error(`Tipo de documento ainda não suportado para emissão: ${tipo}`);
    // PlugNotas aceita array de documentos no POST
    return this.request('POST', path, Array.isArray(payload) ? payload : [payload]);
  }

  // ── Consulta de status ────────────────────────────────────────────────────
  consultar(tipo: FiscalTipo, plugnotasId: string) {
    const path = PATHS[tipo as keyof typeof PATHS];
    if (!path) throw new Error(`Tipo não suportado: ${tipo}`);
    return this.request('GET', `${path}/${plugnotasId}`);
  }

  // ── Cancelamento ──────────────────────────────────────────────────────────
  cancelar(tipo: FiscalTipo, plugnotasId: string, payload: unknown) {
    const path = PATHS[tipo as keyof typeof PATHS];
    if (!path) throw new Error(`Tipo não suportado: ${tipo}`);
    return this.request('POST', `${path}/${plugnotasId}/cancelamento`, payload);
  }

  // ── Download binário de XML / PDF (DANFE/DANFCe) ──────────────────────────
  async binaryDoc(tipo: FiscalTipo, plugnotasId: string, kind: 'pdf' | 'xml'): Promise<{
    ok: boolean; status: number; bytes: Uint8Array; contentType: string; durationMs: number; endpoint: string; error?: string;
  }> {
    const path = PATHS[tipo as keyof typeof PATHS];
    const endpoint = `${path}/${plugnotasId}/${kind}`;
    const url = `${baseUrl(this.ambiente)}${endpoint}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const started = Date.now();
    try {
      const res = await fetch(url, { headers: { 'X-API-KEY': this.token }, signal: controller.signal });
      const bytes = new Uint8Array(await res.arrayBuffer());
      return {
        ok: res.ok, status: res.status, bytes,
        contentType: res.headers.get('content-type') || (kind === 'pdf' ? 'application/pdf' : 'application/xml'),
        durationMs: Date.now() - started, endpoint,
      };
    } catch (e) {
      return { ok: false, status: 0, bytes: new Uint8Array(), contentType: '', durationMs: Date.now() - started, endpoint, error: (e as Error).message };
    } finally {
      clearTimeout(timer);
    }
  }
}
