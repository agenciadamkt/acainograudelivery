// ============================================================================
// Edge Function: fiscal-webhook  (Fase 10)
// Recebe callbacks do PlugNotas (CONCLUIDO/REJEITADO/CANCELADO/INTERROMPIDO),
// atualiza o documento + evento. Idempotente. Caminho PRIMÁRIO de status.
//
// Deploy SEM verificação de JWT (é o PlugNotas quem chama):
//   supabase functions deploy fiscal-webhook --no-verify-jwt
// Segurança: valide ?secret=... contra o env FISCAL_WEBHOOK_SECRET.
// ============================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { adminClient, addEvent, getCompanyById, applyNormalized } from '../_shared/fiscal.ts';
import { getProvider } from '../_shared/fiscal-provider.ts';

const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Validação de secret (query param). Se o env estiver setado, é obrigatório.
  const expected = Deno.env.get('FISCAL_WEBHOOK_SECRET');
  if (expected) {
    const url = new URL(req.url);
    const provided = url.searchParams.get('secret') || req.headers.get('x-webhook-secret');
    if (provided !== expected) return ok({ message: 'invalid secret' }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const db = adminClient();

    // PlugNotas pode enviar objeto único ou lista de eventos
    const events: any[] = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : [body]);
    const results = [];

    const COLS = 'id, status, numero, store_id, fiscal_company_id, tipo_documento, plugnotas_id';
    for (const ev of events) {
      // Focus usa "ref" (= nosso doc.id); PlugNotas usa idIntegracao (= doc.id). Fallback: id/plugnotas_id.
      const ref = ev?.ref || ev?.idIntegracao || ev?.integracao || ev?.documento?.idIntegracao || null;
      const provId = ev?.id || ev?.documento?.id || ev?.protocolo || null;
      const statusRaw = ev?.status || ev?.situacao || ev?.evento || ev?.event || body?.status;

      // Localiza o documento (por id/ref ou pela referência do provedor)
      let doc: any = null;
      if (ref) {
        const { data } = await db.from('fiscal_documents').select(COLS).or(`id.eq.${ref},plugnotas_id.eq.${ref}`).maybeSingle();
        doc = data;
      }
      if (!doc && provId) {
        const { data } = await db.from('fiscal_documents').select(COLS).eq('plugnotas_id', provId).maybeSingle();
        doc = data;
      }
      if (!doc) { results.push({ skipped: 'documento não encontrado', ref, provId }); continue; }

      await addEvent(db, doc.id, 'WEBHOOK', `Webhook recebido (${statusRaw || '—'})`, ev);

      // Consulta autoritativa no provedor (evita depender do formato heterogêneo do webhook)
      const company = await getCompanyById(db, doc.fiscal_company_id);
      if (!company) { results.push({ documentId: doc.id, status: doc.status, skipped: 'sem empresa' }); continue; }
      const provider = await getProvider(db, company);
      const sr = await provider.consultar(doc.tipo_documento, doc.plugnotas_id);
      const status = await applyNormalized(db, doc, sr, 'webhook');
      results.push({ documentId: doc.id, status });
    }

    return ok({ ok: true, processed: results.length, results });
  } catch (e) {
    // Nunca retornar erro que faça o PlugNotas reenviar infinitamente
    console.error('fiscal-webhook error:', (e as Error).message);
    return ok({ ok: false, error: (e as Error).message }, 200);
  }
});
