// ============================================================================
// Abstração de PROVEDOR FISCAL — normaliza PlugNotas (TecnoSpeed) e Focus NFe
// atrás de uma mesma interface. As edge functions falam com o provider, não com
// a API específica. Adicionar um provedor = implementar FiscalProvider.
// ============================================================================
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PlugNotasService, type FiscalTipo, type FiscalAmbiente } from './plugnotas.ts';
import { FocusNfeService } from './focusnfe.ts';
import { getToken, type FiscalCompany } from './fiscal.ts';

export interface EmitItem { product_id: string; nome: string; quantidade: number; valorUnitario: number; fiscal: any; }
export interface EmitInput {
  tipo: FiscalTipo; ref: string; ambiente: FiscalAmbiente;
  storeCnpj: string; serie: number; numero: number; presencial: boolean;
  total: number; paymentMethod: string;
  destinatarioNome: string | null; destinatarioDoc: string | null;
  items: EmitItem[];
}
interface Base { ok: boolean; raw: any; status: number; endpoint: string; method: string; durationMs: number; error?: string; }
export interface EmitResult extends Base { providerRef: string | null; docStatus: string; motivo?: string | null; sent?: any; chave?: string | null; protocolo?: string | null; numero?: number | null; xmlUrl?: string | null; pdfUrl?: string | null; }
export interface StatusResult extends Base { docStatus: string | null; chave?: string | null; protocolo?: string | null; numero?: number | null; xmlUrl?: string | null; pdfUrl?: string | null; motivo?: string | null; }
export interface BinResult { ok: boolean; bytes: Uint8Array; contentType: string; status: number; endpoint: string; durationMs: number; error?: string; }

export interface FiscalProvider {
  name: 'plugnotas' | 'focusnfe';
  emitir(input: EmitInput): Promise<EmitResult>;
  consultar(tipo: FiscalTipo, ref: string): Promise<StatusResult>;
  cancelar(tipo: FiscalTipo, ref: string, motivo: string): Promise<Base>;
  baixar(tipo: FiscalTipo, ref: string, kind: 'pdf' | 'xml', doc: any): Promise<BinResult>;
}

// ── Mapas de forma de pagamento ──────────────────────────────────────────────
const PG_PLUGNOTAS: Record<string, string> = { money: '01', dinheiro: '01', cash: '01', credit: '03', credito: '03', credit_card: '03', debit: '04', debito: '04', debit_card: '04', pix: '17', online: '17' };
const PG_FOCUS: Record<string, string> = { money: '01', dinheiro: '01', cash: '01', credit: '03', credito: '03', credit_card: '03', debit: '04', debito: '04', debit_card: '04', pix: '17', online: '17' };

// ── PlugNotas (mantém exatamente o payload/comportamento atual) ───────────────
class PlugNotasProvider implements FiscalProvider {
  name = 'plugnotas' as const;
  private svc: PlugNotasService;
  constructor(token: string, ambiente: FiscalAmbiente, timeout: number) { this.svc = new PlugNotasService(token, ambiente, timeout); }

  async emitir(i: EmitInput): Promise<EmitResult> {
    const itens = i.items.map((it, idx) => {
      const f = it.fiscal || {};
      return {
        codigo: it.product_id?.slice(0, 8) || String(idx + 1), descricao: it.nome,
        ncm: f.ncm || undefined, cest: f.cest || undefined, cfop: f.cfop_interno || undefined,
        unidade: f.unidade_tributavel || 'UN', quantidade: it.quantidade, valorUnitario: it.valorUnitario,
        origem: f.origem ?? 0,
        tributos: { icms: { cst: f.cst_csosn || undefined, aliquota: f.aliquota_icms ?? undefined }, pis: { aliquota: f.aliquota_pis ?? undefined }, cofins: { aliquota: f.aliquota_cofins ?? undefined } },
      };
    });
    const payload: any = {
      idIntegracao: i.ref, presencial: i.presencial, consumidorFinal: true, natureza: 'Venda ao consumidor',
      emitente: { cpfCnpj: (i.storeCnpj || '').replace(/\D/g, '') }, serie: i.serie, numero: i.numero,
      itens, pagamentos: [{ aVista: true, meio: PG_PLUGNOTAS[i.paymentMethod] || '99', valor: i.total }],
    };
    if (i.destinatarioDoc) payload.destinatario = { cpfCnpj: i.destinatarioDoc.replace(/\D/g, ''), nome: i.destinatarioNome || undefined };
    const res = await this.svc.emitir(i.tipo, payload);
    const data: any = Array.isArray(res.data) ? res.data[0] : res.data;
    const providerRef = data?.id || data?.documents?.[0]?.id || data?.protocolo || null;
    return { ok: res.ok, raw: res.data, sent: payload, status: res.status, endpoint: res.endpoint, method: res.method, durationMs: res.durationMs, error: res.error, providerRef, docStatus: res.ok ? 'PROCESSANDO' : 'ERRO', motivo: res.ok ? null : (res.error || JSON.stringify(res.data)) };
  }

  async consultar(tipo: FiscalTipo, ref: string): Promise<StatusResult> {
    const res = await this.svc.consultar(tipo, ref);
    const d: any = Array.isArray(res.data) ? res.data[0] : res.data;
    return { ok: res.ok, raw: res.data, status: res.status, endpoint: res.endpoint, method: res.method, durationMs: res.durationMs, error: res.error,
      docStatus: normalizePlugNotas(d?.situacao || d?.status), chave: d?.chave || d?.chaveAcesso || null, protocolo: d?.protocolo || d?.numeroProtocolo || null,
      numero: d?.numero ?? null, xmlUrl: d?.xml || d?.links?.xml || d?.arquivos?.xml || null, pdfUrl: d?.pdf || d?.danfe || d?.links?.pdf || d?.arquivos?.pdf || null,
      motivo: d?.motivo || d?.mensagem || null };
  }

  async cancelar(tipo: FiscalTipo, ref: string, motivo: string): Promise<Base> {
    const res = await this.svc.cancelar(tipo, ref, { justificativa: motivo });
    return { ok: res.ok, raw: res.data, status: res.status, endpoint: res.endpoint, method: res.method, durationMs: res.durationMs, error: res.error };
  }

  async baixar(tipo: FiscalTipo, ref: string, kind: 'pdf' | 'xml'): Promise<BinResult> {
    const r = await this.svc.binaryDoc(tipo, ref, kind);
    return { ok: r.ok, bytes: r.bytes, contentType: r.contentType, status: r.status, endpoint: r.endpoint, durationMs: r.durationMs, error: r.error };
  }
}

// ── Focus NFe ─────────────────────────────────────────────────────────────────
class FocusProvider implements FiscalProvider {
  name = 'focusnfe' as const;
  private svc: FocusNfeService;
  constructor(token: string, ambiente: FiscalAmbiente, timeout: number) { this.svc = new FocusNfeService(token, ambiente, timeout); }

  async emitir(i: EmitInput): Promise<EmitResult> {
    const items = i.items.map((it, idx) => {
      const f = it.fiscal || {};
      const bruto = Number((it.quantidade * it.valorUnitario).toFixed(2));
      return {
        numero_item: String(idx + 1), codigo_produto: it.product_id?.slice(0, 20) || String(idx + 1), descricao: it.nome,
        cfop: f.cfop_interno || '5102', unidade_comercial: f.unidade_tributavel || 'UN',
        quantidade_comercial: it.quantidade, valor_unitario_comercial: it.valorUnitario, valor_bruto: bruto,
        unidade_tributavel: f.unidade_tributavel || 'UN', quantidade_tributavel: it.quantidade, valor_unitario_tributavel: it.valorUnitario,
        codigo_ncm: f.ncm || undefined, cest: f.cest || undefined,
        icms_origem: String(f.origem ?? 0), icms_situacao_tributaria: f.cst_csosn || '102',
        pis_situacao_tributaria: '07', cofins_situacao_tributaria: '07',
      };
    });
    const payload: any = {
      natureza_operacao: 'Venda ao consumidor', data_emissao: new Date().toISOString(),
      presenca_comprador: i.presencial ? '1' : '2', modalidade_frete: '9', local_destino: '1',
      cnpj_emitente: (i.storeCnpj || '').replace(/\D/g, ''), serie: i.serie, numero: i.numero,
      items,
      formas_pagamento: [{ forma_pagamento: PG_FOCUS[i.paymentMethod] || '99', valor_pagamento: i.total }],
    };
    if (i.destinatarioDoc) payload.cpf_destinatario = i.destinatarioDoc.replace(/\D/g, '');
    if (i.destinatarioNome) payload.nome_destinatario = i.destinatarioNome;

    const res = await this.svc.emitir(i.tipo, i.ref, payload);
    // Focus: 200/201/202 => aceito. NFC-e é SÍNCRONA (a resposta já traz o status final);
    // NF-e é assíncrona (fica processando). Rejeição da SEFAZ pode vir com 2xx + status de erro.
    const accepted = res.status === 200 || res.status === 201 || res.status === 202;
    const d: any = res.data || {};
    const st = normalizeFocus(d.status);
    if (!accepted) {
      return { ok: false, raw: res.data, sent: payload, status: res.status, endpoint: res.endpoint, method: res.method, durationMs: res.durationMs, error: res.error,
        providerRef: i.ref, docStatus: 'ERRO', motivo: d.mensagem || d.erros?.[0]?.mensagem || res.error || JSON.stringify(res.data) };
    }
    // st pode ser AUTORIZADO (NFC-e síncrona), REJEITADO, ou PROCESSANDO (NF-e async / sem status)
    const docStatus = st || 'PROCESSANDO';
    const terminalAut = docStatus === 'AUTORIZADO';
    return { ok: true, raw: res.data, sent: payload, status: res.status, endpoint: res.endpoint, method: res.method, durationMs: res.durationMs, error: res.error,
      providerRef: i.ref, docStatus,
      motivo: (docStatus === 'REJEITADO' || docStatus === 'ERRO') ? (d.mensagem_sefaz || d.mensagem || null) : null,
      chave: terminalAut ? (d.chave_nfe || d.chave || null) : null,
      protocolo: terminalAut ? (d.protocolo || d.numero_protocolo || null) : null,
      numero: terminalAut && d.numero ? Number(d.numero) : null,
      xmlUrl: terminalAut ? (d.caminho_xml_nota_fiscal || null) : null,
      pdfUrl: terminalAut ? (d.caminho_danfe || null) : null };
  }

  async consultar(tipo: FiscalTipo, ref: string): Promise<StatusResult> {
    const res = await this.svc.consultar(tipo, ref);
    const d: any = res.data || {};
    return { ok: res.ok, raw: res.data, status: res.status, endpoint: res.endpoint, method: res.method, durationMs: res.durationMs, error: res.error,
      docStatus: normalizeFocus(d.status), chave: d.chave_nfe || d.chave || null, protocolo: d.protocolo || d.numero_protocolo || null,
      numero: d.numero ? Number(d.numero) : null, xmlUrl: d.caminho_xml_nota_fiscal || null, pdfUrl: d.caminho_danfe || null,
      motivo: d.mensagem_sefaz || d.mensagem || null };
  }

  async cancelar(tipo: FiscalTipo, ref: string, motivo: string): Promise<Base> {
    const res = await this.svc.cancelar(tipo, ref, motivo);
    return { ok: res.ok, raw: res.data, status: res.status, endpoint: res.endpoint, method: res.method, durationMs: res.durationMs, error: res.error };
  }

  async baixar(tipo: FiscalTipo, ref: string, kind: 'pdf' | 'xml', doc: any): Promise<BinResult> {
    // Focus baixa pelo caminho salvo (pdf_url/xml_url guardam o caminho da Focus antes de arquivar).
    const caminho = kind === 'pdf' ? doc?.focus_caminho_danfe : doc?.focus_caminho_xml;
    if (!caminho) {
      // fallback: consulta para obter os caminhos
      const st = await this.consultar(tipo, ref);
      const c = kind === 'pdf' ? st.pdfUrl : st.xmlUrl;
      if (!c) return { ok: false, bytes: new Uint8Array(), contentType: '', status: 404, endpoint: '', durationMs: 0, error: 'Caminho do arquivo não disponível.' };
      return this.svc.fetchBinaryUrl(c, kind);
    }
    return this.svc.fetchBinaryUrl(caminho, kind);
  }
}

// ── Normalização de status ────────────────────────────────────────────────────
export function normalizePlugNotas(raw?: string): string | null {
  const s = (raw || '').toUpperCase();
  if (['CONCLUIDO', 'AUTORIZADO', 'AUTORIZADA', 'APROVADO'].includes(s)) return 'AUTORIZADO';
  if (['REJEITADO', 'REJEITADA', 'DENEGADO', 'DENEGADA'].includes(s)) return 'REJEITADO';
  if (['CANCELADO', 'CANCELADA'].includes(s)) return 'CANCELADO';
  if (['PROCESSANDO', 'EM_PROCESSAMENTO', 'PENDENTE'].includes(s)) return 'PROCESSANDO';
  if (['ERRO', 'ERRO_AUTORIZACAO', 'FALHA', 'INTERROMPIDO'].includes(s)) return 'ERRO';
  return null;
}
export function normalizeFocus(raw?: string): string | null {
  const s = (raw || '').toLowerCase();
  if (s === 'autorizado') return 'AUTORIZADO';
  if (s === 'cancelado') return 'CANCELADO';
  if (s === 'processando_autorizacao') return 'PROCESSANDO';
  if (s === 'erro_autorizacao' || s === 'denegado') return 'REJEITADO';
  if (s === 'erro') return 'ERRO';
  return null;
}

// ── Fábrica ───────────────────────────────────────────────────────────────────
export async function getProvider(db: SupabaseClient, company: FiscalCompany): Promise<FiscalProvider> {
  const token = await getToken(db, company.id);
  if (!token) throw new Error('Empresa sem token do provedor configurado.');
  if ((company as any).provider === 'focusnfe') return new FocusProvider(token, company.ambiente, company.timeout_seg);
  return new PlugNotasProvider(token, company.ambiente, company.timeout_seg);
}
