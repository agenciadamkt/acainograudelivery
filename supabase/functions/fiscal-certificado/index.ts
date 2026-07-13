// ============================================================================
// Edge Function: fiscal-certificado
// Upload de certificado digital (.pfx) direto ao PlugNotas.
// O arquivo e a senha NUNCA são persistidos aqui — só metadados (id, validade).
// Action: upload → { storeId, pfxBase64, senha }
// ============================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireStaffOrService, jsonError } from '../_shared/auth.ts';
import { adminClient, getCompanyByStore, plugnotasFor, getToken, logCall } from '../_shared/fiscal.ts';
import { FocusNfeService } from '../_shared/focusnfe.ts';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Deriva o status a partir da data de vencimento
function statusFromVencimento(venc?: string | null): string {
  if (!venc) return 'valido';
  const d = new Date(venc).getTime();
  if (isNaN(d)) return 'valido';
  const dias = (d - Date.now()) / 86_400_000;
  if (dias < 0) return 'vencido';
  if (dias <= 30) return 'proximo_vencimento';
  return 'valido';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authError = await requireStaffOrService(req);
  if (authError) return authError;

  try {
    const { action, storeId, pfxBase64, senha } = await req.json();
    if (action !== 'upload') return jsonError('Ação inválida', 400);
    if (!storeId || !pfxBase64 || !senha) return jsonError('storeId, pfxBase64 e senha são obrigatórios', 400);

    const db = adminClient();
    const company = await getCompanyByStore(db, storeId);
    if (!company) return jsonError('Configure a empresa fiscal antes do certificado.', 400);

    const isFocus = (company as any).provider === 'focusnfe';
    let res: any; let certId: string | null; let vencimento: string | null; let titular: string | null; let nomeCn: string | null;

    if (isFocus) {
      const tk = await getToken(db, company.id);
      if (!tk) return jsonError('Configure o token da Focus NFe antes do certificado.', 400);
      if (!company.plugnotas_company_id) return jsonError('Sincronize a empresa na Focus (aba Empresa) antes de enviar o certificado.', 400);
      const fc = new FocusNfeService(tk, company.ambiente, company.timeout_seg);
      // Na Focus o certificado é enviado na própria empresa (base64 + senha).
      res = await fc.atualizarEmpresa(company.plugnotas_company_id, { arquivo_certificado_base64: pfxBase64, senha_certificado: String(senha) });
      const d = res.data || {};
      certId = company.plugnotas_company_id;
      vencimento = d.certificado_valido_ate || d.data_validade_certificado || d.vencimento || null;
      titular = d.cnpj || null;
      nomeCn = d.nome || d.nome_fantasia || null;
    } else {
      const pn = await plugnotasFor(db, company);
      const bytes = Uint8Array.from(atob(pfxBase64), (c) => c.charCodeAt(0));
      const form = new FormData();
      form.append('arquivo', new Blob([bytes], { type: 'application/x-pkcs12' }), 'certificado.pfx');
      form.append('senha', String(senha));
      res = await pn.uploadCertificado(form);
      const d = res.data || {};
      certId = d.id || d.certificateId || d._id || null;
      vencimento = d.vencimento || d.validade || d.dataVencimento || null;
      titular = d.cnpj || d.titular || null;
      nomeCn = d.nome || d.cn || d.razaoSocial || null;
    }

    await logCall(db, {
      store_id: storeId, endpoint: res.endpoint, metodo: res.method,
      request: { arquivo: '(.pfx omitido)' }, response: res.data,
      status_code: res.status, erro: res.error, duracao_ms: res.durationMs,
    });
    if (!res.ok) return jsonError(`${isFocus ? 'Focus NFe' : 'PlugNotas'} recusou o certificado: ` + (res.error || JSON.stringify(res.data)), 502);

    // Desativa certificados anteriores da loja e insere o novo como ativo
    await db.from('fiscal_certificates').update({ ativo: false }).eq('store_id', storeId);
    const { data: inserted, error } = await db.from('fiscal_certificates').insert({
      store_id: storeId,
      fiscal_company_id: company.id,
      plugnotas_certificate_id: certId,
      titular_cnpj: titular,
      nome_cn: nomeCn,
      vencimento: vencimento ? new Date(vencimento).toISOString().slice(0, 10) : null,
      status: statusFromVencimento(vencimento),
      ativo: true,
    }).select('id').single();
    if (error) return jsonError('Falha ao salvar certificado: ' + error.message, 500);

    // Vincula como certificado ativo da empresa
    await db.from('fiscal_companies').update({ certificado_ativo_id: inserted.id }).eq('id', company.id);

    return json({ ok: true, certificate_id: inserted.id, vencimento });
  } catch (e) {
    return jsonError((e as Error).message, 500);
  }
});
