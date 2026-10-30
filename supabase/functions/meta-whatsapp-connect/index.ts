import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encryptConnectionToken } from '../_shared/meta-whatsapp/credentials.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const env = (key: string) => Deno.env.get(key) ?? '';
// Keep onboarding on the current Graph version without changing other Meta
// integrations that still use META_GRAPH_API_VERSION.
const graphVersion = () => env('META_WHATSAPP_ONBOARDING_GRAPH_API_VERSION') || 'v26.0';

async function graph(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://graph.facebook.com/${graphVersion()}/${path}`, init);
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result?.error) {
    const meta = result?.error;
    // Never return or log access tokens, OAuth codes, or full provider payloads.
    throw new Error(`META_GRAPH_${meta?.code ?? response.status}`);
  }
  return result;
}

const form = (entries: Record<string, string>) => new URLSearchParams(entries);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (env('META_WHATSAPP_ENABLED') !== 'true') return json({ error: 'META_WHATSAPP_DISABLED' }, 503);

  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const url = env('SUPABASE_URL');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = env('SUPABASE_ANON_KEY');
  if (!url || !serviceKey || !anonKey) return json({ error: 'server_not_configured' }, 503);

  const caller = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authorization } },
  });
  const token = authorization.slice(7);
  const { data: auth, error: authError } = await caller.auth.getUser(token);
  if (authError || !auth.user) return json({ error: 'unauthorized' }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: 'invalid_json' }, 400); }
  const action = body.action;
  const storeId = typeof body.store_id === 'string' ? body.store_id : '';
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(storeId)) return json({ error: 'invalid_store' }, 400);

  const { data: canManage, error: permissionError } = await caller.rpc('can_manage_store_integration', { p_store_id: storeId });
  if (permissionError || canManage !== true) return json({ error: 'forbidden' }, 403);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  if (action === 'disconnect') {
    const { data: existing, error: lookupError } = await admin.from('whatsapp_connections')
      .select('id').eq('store_id', storeId).eq('provider', 'meta_cloud').maybeSingle();
    if (lookupError) return json({ error: 'disconnect_failed' }, 500);
    const { error } = await admin.from('whatsapp_connections').update({ status: 'disabled' })
      .eq('store_id', storeId).eq('provider', 'meta_cloud');
    if (error) return json({ error: 'disconnect_failed' }, 500);
    if (existing?.id) {
      const { error: secretError } = await admin.from('whatsapp_connection_secrets')
        .delete().eq('connection_id', existing.id);
      if (secretError) return json({ error: 'disconnect_failed' }, 500);
    }
    return json({ ok: true, status: 'disabled' });
  }

  if (action !== 'connect') return json({ error: 'unsupported_action' }, 400);
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const wabaId = typeof body.waba_id === 'string' ? body.waba_id.trim() : '';
  const phoneNumberId = typeof body.phone_number_id === 'string' ? body.phone_number_id.trim() : '';
  if (!code || code.length > 4096 || !/^\d{5,30}$/.test(wabaId) || !/^\d{5,30}$/.test(phoneNumberId)) {
    return json({ error: 'invalid_signup_payload' }, 400);
  }

  const appId = env('META_WHATSAPP_APP_ID');
  const appSecret = env('META_WHATSAPP_APP_SECRET');
  const encryptionKey = env('META_WHATSAPP_TOKEN_ENCRYPTION_KEY');
  if (!appId || !appSecret || !encryptionKey) return json({ error: 'meta_onboarding_not_configured' }, 503);

  try {
    const oauth = new URLSearchParams({ client_id: appId, client_secret: appSecret, code });
    const exchanged = await graph(`oauth/access_token?${oauth.toString()}`);
    const businessToken = typeof exchanged.access_token === 'string' ? exchanged.access_token : '';
    if (!businessToken) return json({ error: 'meta_code_exchange_failed' }, 502);

    // The exchanged OAuth token is the authority granted by this business.
    // Verify WABA and phone access with it; do not substitute a platform-wide
    // System User token for the franchisee's authorization.
    const businessAuthorization = { headers: { Authorization: `Bearer ${businessToken}` } };
    const authorizedWaba = await graph(`${wabaId}?fields=id`, businessAuthorization);
    if (String(authorizedWaba?.id) !== wabaId) return json({ error: 'waba_access_not_granted' }, 403);
    const phoneResult = await graph(`${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating&limit=100`, businessAuthorization);
    const selected = (phoneResult?.data ?? []).find((phone: any) => String(phone.id) === phoneNumberId);
    if (!selected) return json({ error: 'phone_not_in_shared_waba' }, 422);

    // Subscribe this app using the authorization granted by the business.
    await graph(`${wabaId}/subscribed_apps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form({ access_token: businessToken }),
    });

    const encrypted = await encryptConnectionToken(businessToken, encryptionKey);
    const relativeExpiration = (value: unknown) => {
      const seconds = Number(value);
      return Number.isFinite(seconds) && seconds > 0
        ? new Date(Date.now() + seconds * 1000).toISOString()
        : null;
    };
    const absoluteExpiration = (value: unknown) => {
      const seconds = Number(value);
      return Number.isFinite(seconds) && seconds > 0
        ? new Date(seconds * 1000).toISOString()
        : null;
    };
    const { error: writeError } = await admin.rpc('upsert_meta_whatsapp_connection_with_secret', {
      p_store_id: storeId,
      p_waba_id: wabaId,
      p_phone_number_id: phoneNumberId,
      p_display_phone_number: selected.display_phone_number ?? null,
      p_verified_name: selected.verified_name ?? null,
      p_quality_rating: selected.quality_rating ?? null,
      p_access_token_ciphertext: encrypted.ciphertext,
      p_access_token_iv: encrypted.iv,
      p_token_expires_at: relativeExpiration(exchanged.expires_in),
      p_data_access_expires_at: absoluteExpiration(exchanged.data_access_expiration_time),
    });
    const write = { error: writeError };
    if (write.error?.code === '23505') return json({ error: 'phone_already_connected' }, 409);
    if (write.error) return json({ error: 'connection_save_failed' }, 500);
    return json({ ok: true, status: 'active', display_phone_number: selected.display_phone_number ?? null, verified_name: selected.verified_name ?? null });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'META_ONBOARDING_FAILED';
    console.warn('Meta WhatsApp onboarding failed', { code });
    return json({ error: code.startsWith('META_GRAPH_') ? 'meta_setup_failed' : 'meta_onboarding_failed' }, 502);
  }
});
