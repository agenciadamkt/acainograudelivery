export const SUPPORTED_TEMPLATES = ['amazfrut_novo_atendimento', 'amazfrut_boas_vindas_ebook'];
export type ApprovedTemplate = { name: string; language: string; body: string };
export function supportedTemplates(rows: any[]): ApprovedTemplate[] {
  return rows.filter(row => SUPPORTED_TEMPLATES.includes(row.name) && row.status === 'APPROVED' && row.language === 'pt_BR').flatMap(row => {
    const components = Array.isArray(row.components) ? row.components : [];
    const body = components.find((item: any) => item.type === 'BODY')?.text;
    // This integration supplies only one body parameter and no dynamic header/button parameters.
    if (typeof body !== 'string' || !body.includes('{{1}}') || /\{\{(?!1\}\})/.test(body)) return [];
    if (components.some((item: any) => item.type === 'HEADER' && (item.format !== 'TEXT' || /\{\{/.test(item.text || '')) || item.type === 'BUTTONS' && item.buttons?.some((button: any) => /\{\{/.test(button.url || '')))) return [];
    return [{ name: row.name, language: row.language, body }];
  });
}
export class TemplateLookupError extends Error {
  constructor(public code: string, public metaCode?: number) { super(code); }
}
export async function loadApprovedTemplates(wabaId: string, token: string, version: string, fetchImpl = fetch): Promise<ApprovedTemplate[]> {
  if (!wabaId || !token) throw new TemplateLookupError('template_config_missing');
  const response = await fetchImpl(`https://graph.facebook.com/${version}/${wabaId}/message_templates?fields=name,status,language,components&limit=100`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const metaCode = typeof data?.error?.code === 'number' ? data.error.code : undefined;
    const code = metaCode === 190 || response.status === 401 ? 'template_auth_error'
      : metaCode === 10 || metaCode === 200 || response.status === 403 ? 'template_permission_denied' : 'template_lookup_failed';
    throw new TemplateLookupError(code, metaCode);
  }
  if (!Array.isArray(data?.data)) throw new TemplateLookupError('template_lookup_failed');
  return supportedTemplates(data.data || []);
}
