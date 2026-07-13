// ============================================================================
// Edge Function: fiscal-documento  (Fase 14 — impressão/arquivamento)
// Baixa XML/PDF autenticado do PlugNotas, arquiva no bucket privado fiscal-docs
// (lazy: só na primeira vez) e devolve uma signed URL de curta duração.
// Body: { documentId, kind: 'pdf' | 'xml' }
// ============================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireStaffOrService, jsonError } from '../_shared/auth.ts';
import { adminClient, getCompanyById, logCall } from '../_shared/fiscal.ts';
import { getProvider } from '../_shared/fiscal-provider.ts';

const BUCKET = 'fiscal-docs';
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const authError = await requireStaffOrService(req);
  if (authError) return authError;

  try {
    const { documentId, kind } = await req.json();
    if (!documentId || !['pdf', 'xml'].includes(kind)) return jsonError('documentId e kind (pdf|xml) obrigatórios', 400);

    const db = adminClient();
    const { data: doc } = await db.from('fiscal_documents')
      .select('id, store_id, fiscal_company_id, tipo_documento, plugnotas_id, status, xml_url, pdf_url').eq('id', documentId).single();
    if (!doc) return jsonError('Documento não encontrado', 404);
    if (doc.status !== 'AUTORIZADO') return jsonError('Documento não autorizado — sem arquivo disponível.', 400);

    const field = kind === 'pdf' ? 'pdf_url' : 'xml_url';
    const current: string | null = (doc as any)[field];
    const storagePath = `${doc.store_id}/${doc.id}.${kind}`;
    const marker = `storage://${BUCKET}/${storagePath}`;

    // Arquiva se ainda não estiver no nosso bucket
    if (current !== marker) {
      if (!doc.plugnotas_id) return jsonError('Documento sem id no PlugNotas.', 400);
      const company = await getCompanyById(db, doc.fiscal_company_id);
      if (!company) return jsonError('Empresa fiscal não encontrada.', 400);
      const provider = await getProvider(db, company);

      const bin = await provider.baixar(doc.tipo_documento, doc.plugnotas_id, kind as 'pdf' | 'xml', doc);
      await logCall(db, {
        store_id: doc.store_id, fiscal_document_id: doc.id, endpoint: bin.endpoint, metodo: 'GET',
        status_code: bin.status, erro: bin.error, duracao_ms: bin.durationMs,
      });
      if (!bin.ok || bin.bytes.length === 0) return jsonError('Falha ao baixar arquivo do PlugNotas.', 502);

      const { error: upErr } = await db.storage.from(BUCKET).upload(storagePath, bin.bytes, { contentType: bin.contentType, upsert: true });
      if (upErr) return jsonError('Falha ao arquivar: ' + upErr.message, 500);
      await db.from('fiscal_documents').update({ [field]: marker, updated_at: new Date().toISOString() }).eq('id', doc.id);
    }

    // Signed URL de 5 minutos
    const { data: signed, error: signErr } = await db.storage.from(BUCKET).createSignedUrl(storagePath, 300);
    if (signErr) return jsonError('Falha ao gerar link: ' + signErr.message, 500);

    return json({ ok: true, url: signed.signedUrl, kind });
  } catch (e) {
    return jsonError((e as Error).message, 500);
  }
});
