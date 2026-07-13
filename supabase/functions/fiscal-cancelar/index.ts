// ============================================================================
// Edge Function: fiscal-cancelar  (Fase 15)
// Cancela uma nota autorizada no PlugNotas com justificativa (mín. 15 chars,
// exigência SEFAZ). Registra motivo/data/usuário + evento.
// Body: { documentId, motivo }
// ============================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireStaffOrService, jsonError, getCallerUserId } from '../_shared/auth.ts';
import { adminClient, getCompanyById, logCall, addEvent } from '../_shared/fiscal.ts';
import { getProvider } from '../_shared/fiscal-provider.ts';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const authError = await requireStaffOrService(req);
  if (authError) return authError;

  try {
    const { documentId, motivo } = await req.json();
    if (!documentId) return jsonError('documentId é obrigatório', 400);
    const justificativa = String(motivo || '').trim();
    if (justificativa.length < 15) return jsonError('A justificativa deve ter no mínimo 15 caracteres.', 400);

    const db = adminClient();
    const { data: doc } = await db.from('fiscal_documents')
      .select('id, store_id, fiscal_company_id, tipo_documento, plugnotas_id, status').eq('id', documentId).single();
    if (!doc) return jsonError('Documento não encontrado', 404);
    if (doc.status !== 'AUTORIZADO') return jsonError('Só é possível cancelar documentos autorizados.', 400);
    if (!doc.plugnotas_id) return jsonError('Documento sem id no PlugNotas.', 400);

    const company = await getCompanyById(db, doc.fiscal_company_id);
    if (!company) return jsonError('Empresa fiscal não encontrada.', 400);
    const provider = await getProvider(db, company);

    const res = await provider.cancelar(doc.tipo_documento, doc.plugnotas_id, justificativa);
    await logCall(db, {
      store_id: doc.store_id, fiscal_document_id: doc.id, endpoint: res.endpoint, metodo: res.method,
      request: { justificativa }, response: res.raw, status_code: res.status, erro: res.error, duracao_ms: res.durationMs,
    });

    if (!res.ok) {
      const motivoErr = res.error || JSON.stringify(res.raw);
      await addEvent(db, doc.id, 'ERRO', 'Falha no cancelamento', res.raw);
      return jsonError(`${provider.name} recusou o cancelamento: ` + motivoErr, 502);
    }

    const userId = await getCallerUserId(req);
    await db.from('fiscal_documents').update({
      status: 'CANCELADO',
      cancelado_por: userId,
      cancelado_em: new Date().toISOString(),
      motivo_cancelamento: justificativa,
      payload_recebido: res.raw,
      updated_at: new Date().toISOString(),
    }).eq('id', doc.id);
    await addEvent(db, doc.id, 'CANCELADO', 'Documento cancelado', { justificativa }, userId);

    return json({ ok: true, documentId: doc.id, status: 'CANCELADO' });
  } catch (e) {
    return jsonError((e as Error).message, 500);
  }
});
