// ============================================================================
// Edge Function: fiscal-consultar  (consulta assíncrona — Fase 9)
// Consulta o status de um documento no PlugNotas e resolve a máquina de estados.
// Body:
//   { documentId }        → consulta um documento específico
//   { sweep: true, limit } → varre PROCESSANDO pendentes (uso pg_cron/service)
// ============================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireStaffOrService, jsonError } from '../_shared/auth.ts';
import { adminClient, getCompanyById, logCall, addEvent, applyNormalized } from '../_shared/fiscal.ts';
import { getProvider } from '../_shared/fiscal-provider.ts';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function consultarUm(db: any, doc: any) {
  const company = await getCompanyById(db, doc.fiscal_company_id);
  if (!company) return { documentId: doc.id, status: doc.status, skipped: 'sem empresa' };
  if (!doc.plugnotas_id) return { documentId: doc.id, status: doc.status, skipped: 'sem referência do provedor' };

  const provider = await getProvider(db, company);
  const sr = await provider.consultar(doc.tipo_documento, doc.plugnotas_id);
  await logCall(db, {
    store_id: doc.store_id, fiscal_document_id: doc.id, endpoint: sr.endpoint, metodo: sr.method,
    response: sr.raw, status_code: sr.status, erro: sr.error, duracao_ms: sr.durationMs,
  });
  await addEvent(db, doc.id, 'CONSULTA', `Consulta de status (${sr.status})`, sr.raw);

  const status = await applyNormalized(db, doc, sr, 'consulta');
  return { documentId: doc.id, status };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const authError = await requireStaffOrService(req);
  if (authError) return authError;

  try {
    const body = await req.json().catch(() => ({}));
    const db = adminClient();

    // ── Sweep (pg_cron / service) ──────────────────────────────────────────────
    if (body.sweep) {
      const limit = Math.min(Number(body.limit) || 25, 100);
      const { data: pend } = await db.from('fiscal_documents')
        .select('id, fiscal_company_id, store_id, tipo_documento, plugnotas_id, status, numero')
        .eq('status', 'PROCESSANDO').not('plugnotas_id', 'is', null)
        .order('created_at', { ascending: true }).limit(limit);
      const results = [];
      for (const doc of pend || []) results.push(await consultarUm(db, doc));
      return json({ ok: true, processed: results.length, results });
    }

    // ── Documento específico ────────────────────────────────────────────────────
    if (!body.documentId) return jsonError('Informe documentId ou sweep:true', 400);
    const { data: doc } = await db.from('fiscal_documents')
      .select('id, fiscal_company_id, store_id, tipo_documento, plugnotas_id, status, numero')
      .eq('id', body.documentId).single();
    if (!doc) return jsonError('Documento não encontrado', 404);

    const result = await consultarUm(db, doc);
    return json({ ok: true, ...result });
  } catch (e) {
    return jsonError((e as Error).message, 500);
  }
});
