import { MetaWhatsAppError } from './errors.ts';
import type { MetaSendResponse } from './types.ts';

export function normalizeE164(value: string | null | undefined): string | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

export class MetaWhatsAppClient {
  private readonly apiVersion: string;
  private readonly timeoutMs: number;
  constructor(private readonly accessToken: string, private readonly phoneNumberId: string, opts: { apiVersion?: string; timeoutMs?: number; fetchImpl?: typeof fetch } = {}) {
    this.apiVersion = opts.apiVersion ?? Deno.env.get('META_GRAPH_API_VERSION') ?? 'v23.0';
    this.timeoutMs = opts.timeoutMs ?? Number(Deno.env.get('META_WHATSAPP_TIMEOUT_MS') ?? 15000);
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }
  private readonly fetchImpl: typeof fetch;
  async sendTextMessage(to: string, text: string): Promise<MetaSendResponse> {
    const phone = normalizeE164(to);
    if (!phone) throw new MetaWhatsAppError('INVALID_PHONE', 'Telefone inválido para E.164');
    const content = text.trim();
    if (!content || content.length > 4096) throw new MetaWhatsAppError('INVALID_TEXT', 'Texto deve ter entre 1 e 4096 caracteres');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`, {
        method: 'POST', headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'text', text: { preview_url: false, body: content } }), signal: controller.signal,
      });
      let payload: any; try { payload = await response.json(); } catch { throw new MetaWhatsAppError('INVALID_RESPONSE', 'Resposta inválida da Meta', response.status); }
      if (!response.ok) { const e = payload?.error; throw new MetaWhatsAppError(e?.code === 190 ? 'AUTH_ERROR' : 'META_API_ERROR', e?.message ?? 'Erro da Meta', response.status, e?.code, response.status === 429 || response.status >= 500, e?.error_subcode, e?.fbtrace_id); }
      if (!payload?.messages?.[0]?.id) throw new MetaWhatsAppError('INVALID_RESPONSE', 'Resposta da Meta sem message ID', response.status);
      return payload as MetaSendResponse;
    } catch (error) {
      if (error instanceof MetaWhatsAppError) throw error;
      if ((error as Error)?.name === 'AbortError') throw new MetaWhatsAppError('TIMEOUT', 'Timeout na API da Meta', undefined, undefined, true);
      throw new MetaWhatsAppError('NETWORK_ERROR', 'Falha de rede ao chamar a Meta', undefined, undefined, true);
    } finally { clearTimeout(timer); }
  }
  async sendTemplateMessage(to: string, firstName: string, options: { templateName?: string; language?: string } = {}): Promise<MetaSendResponse> {
    const phone = normalizeE164(to);
    if (!phone) throw new MetaWhatsAppError('INVALID_PHONE', 'Telefone inválido para E.164');
    const name = firstName.trim().slice(0, 80);
    const templateName = options.templateName ?? Deno.env.get('META_WHATSAPP_TEMPLATE_NAME') ?? 'amazfrut_novo_atendimento';
    const templateLanguage = options.language ?? Deno.env.get('META_WHATSAPP_TEMPLATE_LANGUAGE') ?? 'pt_BR';
    if (!name) throw new MetaWhatsAppError('INVALID_TEMPLATE_PARAMETER', 'Nome do contato é obrigatório');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`, {
        method: 'POST', headers: { Authorization: `Bearer ${this.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: phone, type: 'template', template: { name: templateName, language: { code: templateLanguage }, ...((templateName === 'hello_world') ? {} : { components: [{ type: 'body', parameters: [{ type: 'text', text: name }] }] }) } }), signal: controller.signal,
      });
      let payload: any; try { payload = await response.json(); } catch { throw new MetaWhatsAppError('INVALID_RESPONSE', 'Resposta inválida da Meta', response.status); }
      if (!response.ok) { const e = payload?.error; throw new MetaWhatsAppError(e?.code === 190 ? 'AUTH_ERROR' : 'META_API_ERROR', e?.message ?? 'Erro da Meta', response.status, e?.code, response.status === 429 || response.status >= 500, e?.error_subcode, e?.fbtrace_id); }
      if (!payload?.messages?.[0]?.id) throw new MetaWhatsAppError('INVALID_RESPONSE', 'Resposta da Meta sem message ID', response.status);
      return payload as MetaSendResponse;
    } catch (error) {
      if (error instanceof MetaWhatsAppError) throw error;
      if ((error as Error)?.name === 'AbortError') throw new MetaWhatsAppError('TIMEOUT', 'Timeout na API da Meta', undefined, undefined, true);
      throw new MetaWhatsAppError('NETWORK_ERROR', 'Falha de rede ao chamar a Meta', undefined, undefined, true);
    } finally { clearTimeout(timer); }
  }
}
