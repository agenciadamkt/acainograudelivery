// GrauOS Operações 2.0 — Notification Engine (M4)
// Varre as tarefas do dia de uma unidade, detecta condições de alerta,
// deduplica via notification_logs e envia pelo WhatsApp (UazAPI) do franqueado.
//
// Deploy: supabase functions deploy operations-alerts
// Agendamento (opcional): pg_cron chamando esta função (ver scheduled-campaigns-check).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_UAZ_URL = 'https://acainograu.uazapi.com';

function formatPhone(phone: string): string {
  const clean = (phone || '').replace(/\D/g, '');
  if (!clean) return '';
  return clean.startsWith('55') ? clean : `55${clean}`;
}

async function sendWhatsApp(baseUrl: string, token: string, phone: string, text: string) {
  const resp = await fetch(`${baseUrl.replace(/\/$/, '')}/send/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', token },
    body: JSON.stringify({ number: formatPhone(phone), text }),
  });
  return resp.ok;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { store_id } = await req.json().catch(() => ({}));
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // Unidades a processar (a informada, ou todas com alertas habilitados)
    let settingsQuery = supabase.from('operation_alert_settings').select('*').eq('enabled', true);
    if (store_id) settingsQuery = settingsQuery.eq('store_id', store_id);
    const { data: allSettings } = await settingsQuery;
    if (!allSettings || allSettings.length === 0) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0, reason: 'no enabled settings' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = Date.now();
    const today = todayISO();
    let sent = 0;
    let skipped = 0;

    for (const cfg of allSettings) {
      if (!cfg.recipient_phone) continue;
      const events = cfg.events ?? {};

      // Dados da loja + config UazAPI do franqueado
      const { data: store } = await supabase
        .from('stores').select('id, name, franchisee_user_id').eq('id', cfg.store_id).maybeSingle();
      let uazUrl = DEFAULT_UAZ_URL;
      let uazToken = Deno.env.get('BTZAP_TOKEN') ?? '';
      if (store?.franchisee_user_id) {
        const { data: intg } = await supabase
          .from('integrations').select('config, active')
          .eq('name', 'uazapi_whatsapp').eq('franchisee_id', store.franchisee_user_id).maybeSingle();
        if (intg?.active && intg.config) {
          uazUrl = intg.config.base_url || uazUrl;
          uazToken = intg.config.token || uazToken;
        }
      }

      // Tarefas do dia + execução + itens
      const { data: schedules } = await supabase
        .from('inventory_checklist_schedules')
        .select('id, status, critical, deadline_at, scheduled_time, ' +
          'checklist:inventory_checklists(name), ' +
          'execution:inventory_checklist_executions(items:inventory_checklist_execution_items(passed, item:inventory_checklist_items(name)))')
        .eq('store_id', cfg.store_id)
        .eq('scheduled_date', today);

      // Detecta condições → lista de alertas candidatos
      type Cand = { event_type: string; schedule_id: string; detail: string; checklist: string };
      const candidates: Cand[] = [];
      for (const s of schedules ?? []) {
        const checklist = (s.checklist as any)?.name ?? 'Checklist';
        const overdue = (s.status === 'PENDING' || s.status === 'IN_PROGRESS') &&
          new Date(s.deadline_at).getTime() < now;
        const exec = Array.isArray(s.execution) ? s.execution[0] : s.execution;
        const failedItems = (exec?.items ?? []).filter((it: any) => it.passed === false);

        if (events.overdue && (overdue || s.status === 'MISSED')) {
          candidates.push({ event_type: 'overdue', schedule_id: s.id, checklist,
            detail: 'Não executado no prazo.' });
        }
        if (events.critical && s.critical && (overdue || s.status === 'MISSED' || failedItems.length > 0)) {
          candidates.push({ event_type: 'critical', schedule_id: s.id, checklist,
            detail: '⚠️ Falha crítica.' });
        }
        if (events.out_of_standard && failedItems.length > 0) {
          const names = failedItems.map((it: any) => it.item?.name ?? 'item').join(', ');
          candidates.push({ event_type: 'out_of_standard', schedule_id: s.id, checklist,
            detail: `🌡️ Fora do padrão: ${names}` });
        }
      }

      for (const c of candidates) {
        const message =
          `🚨 ALERTA OPERACIONAL\n` +
          `Unidade: ${store?.name ?? '—'}\n` +
          `Checklist: ${c.checklist}\n` +
          (cfg.recipient_name ? `Responsável: ${cfg.recipient_name}\n` : '') +
          c.detail;

        // Dedupe atômico: insere o log; se já existir (conflito), pula.
        const { data: inserted } = await supabase
          .from('notification_logs')
          .upsert(
            { store_id: cfg.store_id, event_type: c.event_type, schedule_id: c.schedule_id,
              phone: cfg.recipient_phone, message, status: 'sent', sent_at: new Date().toISOString() },
            { onConflict: 'store_id,event_type,schedule_id', ignoreDuplicates: true },
          )
          .select('id');

        if (!inserted || inserted.length === 0) { skipped++; continue; }

        const ok = await sendWhatsApp(uazUrl, uazToken, cfg.recipient_phone, message);
        if (ok) {
          sent++;
        } else {
          await supabase.from('notification_logs').update({ status: 'failed', error: 'send failed' })
            .eq('id', inserted[0].id);
        }
      }
    }

    return new Response(JSON.stringify({ sent, skipped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
