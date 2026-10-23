import { withSupabase } from 'npm:@supabase/server@1';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { getFcmAccessToken, sendFcmMessage } from '../_shared/fcm.ts';

const BTZAP_URL = 'https://acainograu.uazapi.com';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

type SupabaseAdmin = SupabaseClient;
type Campaign = {
  id: string;
  name: string;
  channel: string;
  segment: string;
  message: string | null;
  title: string | null;
  choices: unknown;
  footer_text: string | null;
  image_url: string | null;
};
type Customer = { id: string; name: string | null; phone?: string | null };
type PushToken = { id: string; customer_id: string; token: string };
type CampaignChoice = string | { title: string; value?: string };

async function isStaff(supabase: SupabaseAdmin, userId: string | undefined) {
  if (!userId) return false;
  const { data, error } = await supabase.from('user_roles').select('role')
    .eq('user_id', userId).in('role', ['admin', 'manager', 'franchisee_master']).limit(1);
  return !error && Boolean(data?.length);
}

async function readinessCheck(supabase: SupabaseAdmin, verifyIntegrations = false) {
  if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('BTZAP_TOKEN')) {
    return { ready: false, reason: 'required_configuration_missing' };
  }
  const firebaseRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!firebaseRaw) return { ready: false, reason: 'push_configuration_missing' };
  try {
    const parsed = JSON.parse(firebaseRaw);
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      return { ready: false, reason: 'push_configuration_invalid' };
    }
  } catch {
    return { ready: false, reason: 'push_configuration_invalid' };
  }
  const { error } = await supabase.from('scheduled_campaigns').select('id', { head: true }).limit(0);
  if (error) return { ready: false, reason: 'campaign_schema_unavailable' };
  if (verifyIntegrations) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);
      const response = await fetch(`${BTZAP_URL}/instance/status`, {
        headers: { token: Deno.env.get('BTZAP_TOKEN') ?? '' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) return { ready: false, reason: 'whatsapp_api_unavailable' };
      const status = await response.json().catch(() => null);
      const instanceStatus = status?.instance?.status ?? status?.status;
      if (instanceStatus !== 'connected') return { ready: false, reason: 'whatsapp_instance_not_connected' };
      const serviceAccount = JSON.parse(firebaseRaw ?? '{}');
      await getFcmAccessToken(serviceAccount);
    } catch {
      return { ready: false, reason: 'integration_check_failed' };
    }
  }
  return { ready: true };
}

async function processPushCampaign(supabase: SupabaseAdmin, campaign: Campaign, ensureLease: () => void) {
  let query = supabase.from('customers').select('id, name');
  if (campaign.segment === 'new') {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    query = query.gte('created_at', since.toISOString());
  }
  const { data: customers, error: customerError } = await query;
  if (customerError) throw new Error('customer_lookup_failed');
  if (!customers?.length) return { sent: 0, failed: 0, errorMessage: 'Segmento vazio (nenhum cliente encontrado)' };

  const customerRows = customers as Customer[];
  const { data: tokenRows, error: tokenError } = await supabase.from('customer_push_tokens')
    .select('id, customer_id, token').in('customer_id', customerRows.map((c) => c.id));
  if (tokenError) throw new Error('push_token_lookup_failed');
  if (!tokenRows?.length) return { sent: 0, failed: 0, errorMessage: 'Nenhum cliente do segmento tem o app instalado (sem token de push)' };

  const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON') ?? '{}');
  const accessToken = await getFcmAccessToken(serviceAccount);
  const customerById = new Map(customerRows.map((c) => [c.id, c]));
  let sent = 0;
  let failed = 0;
  for (const row of tokenRows as PushToken[]) {
    ensureLease();
    const customer = customerById.get(row.customer_id);
    const body = (campaign.message || '').replace(/{name}/g, customer?.name || 'Cliente');
    const result = await sendFcmMessage(accessToken, serviceAccount.project_id, row.token, {
      title: campaign.title || campaign.name || 'Açaí no Grau', body,
    });
    if (result.ok) sent++;
    else {
      failed++;
      if (result.unregistered) {
        const { error } = await supabase.from('customer_push_tokens').delete().eq('id', row.id);
        if (error) throw new Error('push_token_cleanup_failed');
      }
    }
  }
  return { sent, failed };
}

export async function runCampaigns(supabase: SupabaseAdmin) {
  const { data: leaseAcquired, error: leaseError } = await supabase.rpc('acquire_scheduled_campaign_runner');
  if (leaseError) throw new Error('runner_lock_unavailable');
  if (!leaseAcquired) return json({ success: true, skipped: 'already_running' });

  let leaseLost = false;
  const heartbeat = setInterval(async () => {
    const { data, error } = await supabase.rpc('renew_scheduled_campaign_runner');
    if (error || !data) leaseLost = true;
  }, 30_000);
  const ensureLease = () => {
    if (leaseLost) throw new Error('runner_lease_lost');
  };
  let response: Response;
  try {
    const { data: campaigns, error } = await supabase.from('scheduled_campaigns')
      .select('id, name, channel, segment, message, title, choices, footer_text, image_url, scheduled_for')
      .eq('status', 'pending').lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true }).limit(25);
    if (error) throw new Error('campaign_lookup_failed');
    const report: Array<Record<string, unknown>> = [];
    for (const campaign of (campaigns ?? []) as Campaign[]) {
      ensureLease();
      const { data: claimed, error: claimError } = await supabase.rpc('claim_scheduled_campaign', {
        p_campaign_id: campaign.id,
      });
      if (claimError) throw new Error('campaign_claim_failed');
      if (!claimed) continue;

      try {
        let sent = 0;
        let failed = 0;
        let errorMessage: string | undefined;
        if (campaign.channel === 'push') {
          const result = await processPushCampaign(supabase, campaign, ensureLease);
          sent = result.sent;
          failed = result.failed;
          errorMessage = result.errorMessage;
        } else {
          let query = supabase.from('customers').select('id, name, phone').not('phone', 'is', null);
          if (campaign.segment === 'new') {
            const since = new Date();
            since.setDate(since.getDate() - 7);
            query = query.gte('created_at', since.toISOString());
          }
          const { data: customers, error: customerError } = await query;
          if (customerError) throw new Error('customer_lookup_failed');
          if (!customers?.length) errorMessage = 'Segmento vazio (nenhum cliente encontrado)';
          const choices = Array.isArray(campaign.choices) ? (campaign.choices as CampaignChoice[]).map((choice) =>
            typeof choice === 'string' ? choice : `${choice.title}|${choice.value || choice.title}`) : [];
          for (const customer of customers ?? []) {
            ensureLease();
            try {
              let phone = (customer.phone ?? '').replace(/\D/g, '');
              if (phone.length < 10) continue;
              if (phone.length <= 11 && !phone.startsWith('55')) phone = `55${phone}`;
              const text = (campaign.message ?? '').replace(/{name}/g, customer.name || 'Cliente');
              const payload: Record<string, unknown> = {
                number: phone, type: 'button', text, choices,
                footerText: campaign.footer_text || 'Açaí no Grau',
              };
              if (campaign.image_url) payload.imageButton = campaign.image_url;
              const response = await fetch(`${BTZAP_URL}/send/menu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', token: Deno.env.get('BTZAP_TOKEN') ?? '' },
                body: JSON.stringify(payload),
              });
              if (response.ok) sent++;
              else failed++;
            } catch {
              failed++;
            }
            await sleep(800);
          }
        }
        const { error: updateError } = await supabase.rpc('admin_update_campaign_status', {
          p_campaign_id: campaign.id, p_status: 'sent', p_sent_count: sent, p_failed_count: failed,
        });
        if (updateError) {
          const { error: fallbackError } = await supabase.from('scheduled_campaigns').update({
            status: 'sent', sent_count: sent, failed_count: failed,
            executed_at: new Date().toISOString(), ...(errorMessage ? { error_message: errorMessage } : {}),
          }).eq('id', campaign.id).eq('status', 'sending');
          if (fallbackError) throw new Error('campaign_result_update_failed');
        }
        report.push({ campaign_id: campaign.id, sent, failed });
      } catch {
        const { error: updateError } = await supabase.from('scheduled_campaigns').update({
          status: 'failed', error_message: 'scheduled_processing_failed', executed_at: new Date().toISOString(),
        }).eq('id', campaign.id).eq('status', 'sending');
        if (updateError) throw new Error('campaign_failure_update_failed');
        report.push({ campaign_id: campaign.id, status: 'failed' });
      }
    }
    response = json({ success: true, processed: report.length, report });
  } catch {
    response = json({ success: false, error: 'scheduled_campaigns_unavailable' }, 500);
  } finally {
    clearInterval(heartbeat);
    const { error } = await supabase.rpc('release_scheduled_campaign_runner');
    if (error) response = json({ success: false, error: 'runner_unlock_failed' }, 500);
  }
  return response;
}

type HandlerContext = {
  authMode?: string;
  userClaims?: { id?: string } | null;
  supabaseAdmin: SupabaseAdmin;
};

export function createScheduledCampaignHandler(dependencies = {
  readiness: readinessCheck,
  process: runCampaigns,
}) {
  return async (req: Request, ctx: HandlerContext) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (ctx.authMode === 'user' && !(await isStaff(ctx.supabaseAdmin, ctx.userClaims?.id))) {
    return json({ error: 'forbidden' }, 403);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body?.mode ?? 'process';
    if (mode === 'healthcheck' || mode === 'dry-run') {
      const readiness = await dependencies.readiness(ctx.supabaseAdmin, true);
      return json({ mode, ...readiness }, readiness.ready ? 200 : 503);
    }
    if (mode !== 'process') return json({ error: 'invalid_mode' }, 400);
    const readiness = await dependencies.readiness(ctx.supabaseAdmin);
    if (!readiness.ready) return json({ success: false, ...readiness }, 503);
    return await dependencies.process(ctx.supabaseAdmin);
  } catch {
    return json({ success: false, error: 'scheduled_campaigns_unavailable' }, 500);
  }
  };
}

if (import.meta.main) {
  const authenticatedHandler = withSupabase({ auth: ['user', 'secret'] }, createScheduledCampaignHandler());
  Deno.serve((req) => req.method === 'OPTIONS'
    ? new Response('ok', { headers: corsHeaders })
    : authenticatedHandler(req));
}
