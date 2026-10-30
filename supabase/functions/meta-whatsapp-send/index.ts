import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { MetaWhatsAppClient, normalizeE164 } from '../_shared/meta-whatsapp/client.ts';
import { decryptConnectionToken } from '../_shared/meta-whatsapp/credentials.ts';
import { serviceWindow } from '../_shared/meta-whatsapp/delivery.ts';
import { loadApprovedTemplates, TemplateLookupError, SUPPORTED_TEMPLATES } from '../_shared/meta-whatsapp/templates.ts';
import { MetaWhatsAppError } from '../_shared/meta-whatsapp/errors.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const env = (key: string) => Deno.env.get(key) ?? '';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (env('META_WHATSAPP_ENABLED') !== 'true') return json({ error: 'META_WHATSAPP_DISABLED' }, 503);
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'));
  const caller = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: auth, error: authError } = await caller.auth.getUser(authorization.slice(7));
  if (authError || !auth.user) {
    // Record diagnostic codes only, never a token or the request body.
    console.warn('meta-whatsapp-send authentication rejected', { code: authError?.code, status: authError?.status });
    const unavailable = authError?.name === 'AuthRetryableFetchError' || (authError?.status ?? 0) >= 500;
    return json({ error: unavailable ? 'auth_unavailable' : 'unauthorized' }, unavailable ? 503 : 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const conversationId = body?.conversation_id;
  const action = body?.action;
  const type = body?.type === undefined ? 'text' : body.type;
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  const idempotencyKey = typeof body?.idempotency_key === 'string' ? body.idempotency_key : '';
  const templateName = body?.template_name;
  const templateLanguage = body?.language;
  const firstName = typeof body?.first_name === 'string' ? body.first_name.trim() : '';
  const allowedTools = new Set(['consultar_lead', 'consultar_scripts', 'consultar_conhecimento', 'consultar_produtos', 'consultar_conversa']);
  const sourceDiagnosis = body?.diagnosis && typeof body.diagnosis === 'object' ? body.diagnosis : null;
  const diagnosis = sourceDiagnosis ? {
    intent: typeof sourceDiagnosis.intent === 'string' ? sourceDiagnosis.intent.slice(0, 120) : null,
    playbook: typeof sourceDiagnosis.playbook === 'string' ? sourceDiagnosis.playbook.slice(0, 80) : null,
    qualification: sourceDiagnosis.qualification && typeof sourceDiagnosis.qualification === 'object' ? sourceDiagnosis.qualification : {},
    missing_information: Array.isArray(sourceDiagnosis.missing_information) ? sourceDiagnosis.missing_information.filter((v: unknown) => typeof v === 'string').slice(0, 12) : [],
    next_action: typeof sourceDiagnosis.next_action === 'string' ? sourceDiagnosis.next_action.slice(0, 200) : null,
    should_handoff: sourceDiagnosis.should_handoff === true,
    handoff_reason: typeof sourceDiagnosis.handoff_reason === 'string' ? sourceDiagnosis.handoff_reason.slice(0, 240) : null,
    tools_used: Array.isArray(sourceDiagnosis.tools_used) ? sourceDiagnosis.tools_used.filter((v: any) => v && allowedTools.has(v.name)).map((v: any) => ({ name: v.name, status: 'executada', ...(typeof v.source === 'string' ? { source: v.source.slice(0, 100) } : {}) })).slice(0, 8) : [],
  } : null;
  if (!UUID.test(conversationId ?? '')) return json({ error: 'invalid_payload' }, 400);
  if (!action && (!UUID.test(idempotencyKey) || !['text', 'template'].includes(type))) return json({ error: 'invalid_payload' }, 400);
  if (action && !['assume','resume','templates'].includes(action)) return json({ error: 'unsupported_action' }, 400);
  if (!action && type === 'text' && (!text || text.length > 4096)) return json({ error: 'invalid_payload' }, 400);
  if (!action && type === 'template' && (!SUPPORTED_TEMPLATES.includes(templateName) || templateLanguage !== 'pt_BR' || !firstName || firstName.length > 80)) return json({ error: 'invalid_template_payload' }, 400);

  const { data: permitted } = await caller.rpc('user_has_rbac_permission', { p_modulo_codigo: 'cli.crm', p_nivel_minimo: 1 });
  const { data: units, error: unitsError } = await caller.from('user_unidades').select('store_id').eq('usuario_id', auth.user.id);
  // Global AmazFrut official conversations have no store_id; their access is
  // constrained by the authenticated CRM permission and conversation RLS.
  const allowedStoreIds = new Set((units ?? []).map((unit: any) => unit.store_id).filter(Boolean));

  const { data: conversation, error: conversationError } = await caller.from('crm_conversations')
    .select('id,store_id,lead_id,contact_phone,automation_status,human_state,assigned_user_id')
    .eq('id', conversationId).eq('channel', 'whatsapp').maybeSingle();
  if (conversationError) return json({ error: 'conversation_lookup_failed' }, 403);
  if (!conversation || (conversation.store_id && !allowedStoreIds.has(conversation.store_id))) return json({ error: 'conversation_out_of_scope' }, 403);
  if (conversation.store_id && permitted !== true) return json({ error: 'forbidden' }, 403);

  const phone = normalizeE164(conversation.contact_phone);
  if (!phone) return json({ error: 'conversation_phone_invalid' }, 422);
  if (conversation.lead_id) {
    const { data: lead, error: leadError } = await caller.from('crm_leads').select('id,store_id,whatsapp_normalized,telefone').eq('id', conversation.lead_id).maybeSingle();
    if (leadError) return json({ error: 'lead_out_of_scope' }, 403);
    if (lead) {
      if (lead.store_id !== conversation.store_id) return json({ error: 'lead_out_of_scope' }, 403);
      const leadPhone = normalizeE164(lead.whatsapp_normalized || lead.telefone);
      if (leadPhone && leadPhone !== phone) return json({ error: 'conversation_lead_phone_mismatch' }, 409);
    } else {
      // The official public intake keeps crm_leads.store_id=NULL. For that
      // isolated source, validate the linked contact against the CRM-authorized
      // intake record rather than weakening crm_leads RLS or dropping lead_id.
      const { data: submission, error: submissionError } = await caller.from('amazfrut_lead_submissions')
        .select('payload,source_code').eq('lead_id', conversation.lead_id)
        .eq('source_code', 'site_amazfrut_oficial').order('received_at', { ascending: false }).limit(1).maybeSingle();
      if (submissionError || !submission || !submission.payload || typeof submission.payload !== 'object') return json({ error: 'lead_out_of_scope' }, 403);
      const submittedPhone = (submission.payload as Record<string, unknown>).phone;
      const officialLeadPhone = normalizeE164(typeof submittedPhone === 'string' ? submittedPhone : null);
      if (!officialLeadPhone || officialLeadPhone !== phone) return json({ error: 'conversation_lead_phone_mismatch' }, 409);
    }
  }

  if (body?.action === 'assume') {
    if (!conversation.lead_id) return json({ error: 'lead_required' }, 409);
    const { data: claimed, error: claimError } = await caller.rpc('claim_amazfrut_conversation', { p_conversation_id: conversation.id });
    if (claimError) return json({ error: 'conversation_claim_failed', detail: claimError.message.slice(0, 180) }, 500);
    if (!claimed?.length) return json({ error: 'already_assigned_or_not_waiting' }, 409);
    return json({ ok: true, action: 'assumed', conversation_id: conversation.id, lead_id: conversation.lead_id, automation_status: 'paused', human_state: 'HUMANO_ATENDENDO' });
  }
  if (body?.action === 'resume') {
    // Re-enable automation without emitting a message; next inbound starts the SDR.
    let resumeQuery = admin.from('crm_conversations').update({ automation_status: 'active', human_state: 'IA_ATENDENDO', assigned_user_id: null, handoff_offer_pending: false }).eq('id', conversation.id);
    resumeQuery = conversation.store_id ? resumeQuery.eq('store_id', conversation.store_id) : resumeQuery.is('store_id', null);
    const { error: resumeError } = await resumeQuery;
    if (resumeError) return json({ error: 'conversation_resume_failed' }, 500);
    return json({ ok: true, action: 'resumed', conversation_id: conversation.id, automation_status: 'active', human_state: 'IA_ATENDENDO' });
  }

  let connection: { id: string; waba_id: string; phone_number_id: string } | null = null;
  let connectionError: { message: string } | null = null;
  let accessToken: string | null = null;
  if (conversation.store_id) {
    const result = await admin.from('whatsapp_connections').select('id,waba_id,phone_number_id')
      .eq('provider', 'meta_cloud').eq('status', 'active').eq('store_id', conversation.store_id).maybeSingle();
    connection = result.data;
    connectionError = result.error;
    if (connection && !connectionError) {
      const stored = await admin.from('whatsapp_connection_secrets')
        .select('access_token_ciphertext,access_token_iv,token_expires_at,data_access_expires_at')
        .eq('connection_id', connection.id).maybeSingle();
      if (stored.error || !stored.data) return json({ error: 'meta_connection_reauthorization_required' }, 409);
      const expiration = stored.data.token_expires_at || stored.data.data_access_expires_at;
      if (expiration && Date.parse(expiration) <= Date.now() + 60_000) {
        return json({ error: 'meta_connection_reauthorization_required' }, 409);
      }
      try {
        accessToken = await decryptConnectionToken(
          stored.data.access_token_ciphertext,
          stored.data.access_token_iv,
          env('META_WHATSAPP_TOKEN_ENCRYPTION_KEY'),
        );
      } catch {
        return json({ error: 'meta_connection_reauthorization_required' }, 409);
      }
    }
  }
  // A store conversation always uses the exact official Meta number paired to
  // that store; franqueadora conversations retain the central SDR number.
  const phoneNumberId = conversation.store_id ? connection?.phone_number_id : env('META_WHATSAPP_PHONE_NUMBER_ID');
  const wabaId = conversation.store_id ? connection?.waba_id : env('META_WHATSAPP_WABA_ID');
  // Global franchise-network conversations continue using their established
  // central sender. Every store conversation uses only that store's own
  // encrypted OAuth grant; there is no platform-token fallback for stores.
  if (conversation.store_id && (connectionError || !connection || !connection.phone_number_id || !connection.waba_id || !accessToken)) return json({ error: 'meta_connection_unavailable' }, 409);
  if (!conversation.store_id) accessToken = env('META_WHATSAPP_ACCESS_TOKEN');
  if (!phoneNumberId || !wabaId || !accessToken) {
    return json({ error: 'meta_connection_unavailable' }, 409);
  }

  if (action === 'templates') {
    try {
      const templates = await loadApprovedTemplates(wabaId, accessToken, env('META_GRAPH_API_VERSION') || 'v23.0');
      return json({ ok: true, templates });
    } catch (error) {
      const code = error instanceof TemplateLookupError ? error.code : 'template_lookup_failed';
      console.warn('meta-whatsapp-send template lookup failed', { code, meta_code: error instanceof TemplateLookupError ? error.metaCode : undefined });
      return json({ error: code }, 502);
    }
  }
  const existing = await admin.from('crm_messages').select('id,status').eq('provider', 'meta_cloud').eq('idempotency_key', idempotencyKey).maybeSingle();
  if (existing.error) return json({ error: 'message_lookup_failed' }, 503);
  if (existing.data) return json({ ok: existing.data.status !== 'failed', idempotent: true, ...(existing.data.status === 'failed' ? { error: 'previous_send_failed' } : {}), message: existing.data });
  if (type === 'text') {
    const { data: inbound, error: inboundError } = await admin.from('crm_messages').select('created_at,provider_timestamp').eq('conversation_id', conversation.id).eq('direction', 'inbound').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (inboundError) return json({ error: 'service_window_lookup_failed' }, 503);
    const window = serviceWindow(inbound?.provider_timestamp || inbound?.created_at);
    if (!window.open) return json({ error: 'service_window_closed', last_inbound_at: window.lastInbound, requires_template: true }, 409);
  }
  const reservation = await admin.from('crm_messages').insert({
    conversation_id: conversation.id,
    store_id: conversation.store_id,
    lead_id: conversation.lead_id,
    external_message_id: `pending:${idempotencyKey}`,
    idempotency_key: idempotencyKey,
    direction: 'outbound',
    message_type: type === 'template' ? 'unknown' : 'text',
    text_content: type === 'template' ? `Template WhatsApp: ${templateName}` : text,
    status: null,
    recipient_phone: phone,
    provider: 'meta_cloud',
    raw_metadata: { transport_mode: 'meta_cloud', delivery_state: 'reserved', ...(type === 'template' ? { message_kind: 'template', template_name: templateName, language: templateLanguage } : {}), ...(diagnosis ? { agent_diagnosis: diagnosis } : {}) },
  }).select('id').single();
  if (reservation.error) {
    if (reservation.error.code === '23505') return json({ ok: true, idempotent: true });
    return json({ error: 'message_reservation_failed' }, 500);
  }

  try {
    const meta = new MetaWhatsAppClient(accessToken, phoneNumberId);
    const result = type === 'template' ? await meta.sendTemplateMessage(phone, firstName, { templateName, language: templateLanguage }) : await meta.sendTextMessage(phone, text);
    const externalId = result.messages[0].id;
    const persisted = await admin.from('crm_messages').update({ external_message_id: externalId, status: 'sent', sender_phone: phoneNumberId, raw_metadata: { messaging_product: 'whatsapp', transport_mode: 'meta_cloud', ...(type === 'template' ? { message_kind: 'template', template_name: templateName, language: templateLanguage } : {}), ...(diagnosis ? { agent_diagnosis: diagnosis } : {}) } }).eq('id', reservation.data.id);
    if (persisted.error) return json({ error: 'message_persist_failed' }, 500);
    let conversationUpdate = admin.from('crm_conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);
    conversationUpdate = conversation.store_id ? conversationUpdate.eq('store_id', conversation.store_id) : conversationUpdate.is('store_id', null);
    await conversationUpdate;
    return json({ ok: true, idempotent: false, message: { id: reservation.data.id, status: 'sent' } });
  } catch (error) {
    const detail = error instanceof MetaWhatsAppError ? { code: error.code, http_status: error.httpStatus ?? null, meta_code: error.metaCode ?? null, meta_subcode: error.metaSubcode ?? null, fbtrace_id: error.fbtraceId ?? null, message: error.message.slice(0, 240), retryable: error.retryable } : { code: 'SEND_FAILED', http_status: null, meta_code: null, meta_subcode: null, fbtrace_id: null, message: 'Falha sanitizada no envio', retryable: false };
    await admin.from('crm_messages').update({ status: 'failed', raw_metadata: { transport_mode: 'meta_cloud', delivery_state: 'failed', error: detail } }).eq('id', reservation.data.id);
    if (error instanceof MetaWhatsAppError) return json({ error: error.code, retryable: error.retryable, meta_code: error.metaCode ?? null }, error.httpStatus && error.httpStatus >= 400 ? error.httpStatus : 502);
    return json({ error: 'send_failed' }, 502);
  }
});

// production resume action
