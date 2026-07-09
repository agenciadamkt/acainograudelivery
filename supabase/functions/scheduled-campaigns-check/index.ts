// SOLUÇÃO FINAL: AGENDAMENTO AUTOMÁTICO (COM FILTRO DE HORA)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getFcmAccessToken, sendFcmMessage } from '../_shared/fcm.ts';
import { requireStaffOrService } from '../_shared/auth.ts';

const BTZAP_TOKEN = Deno.env.get('BTZAP_TOKEN') ?? '';
const BTZAP_URL = "https://acainograu.uazapi.com";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Campanha de push (canal='push'): só alcança clientes com o app nativo
// instalado (linha em customer_push_tokens) — diferente do WhatsApp, que
// alcança qualquer cliente com telefone. Segmento 'new' segue a mesma regra
// já usada pro WhatsApp acima (únicos filtros realmente aplicados no
// backend hoje); os demais segmentos (inactive/vip/birthday) só filtram na
// prévia da tela, não aqui — mesma limitação pré-existente do envio de
// WhatsApp, não é algo novo desta função.
async function processPushCampaign(
    supabase: ReturnType<typeof createClient>,
    campaign: any,
): Promise<{ sent: number; failed: number; errorMessage?: string }> {
    let customerQuery = supabase.from('customers').select('id, name');

    if (campaign.segment === 'new') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        customerQuery = customerQuery.gte('created_at', sevenDaysAgo.toISOString());
    }

    const { data: customers } = await customerQuery;
    if (!customers || customers.length === 0) {
        return { sent: 0, failed: 0, errorMessage: 'Segmento vazio (nenhum cliente encontrado)' };
    }

    const { data: tokenRows } = await supabase
        .from('customer_push_tokens')
        .select('*')
        .in('customer_id', customers.map((c: any) => c.id));

    if (!tokenRows || tokenRows.length === 0) {
        return { sent: 0, failed: 0, errorMessage: 'Nenhum cliente do segmento tem o app instalado (sem token de push)' };
    }

    const serviceAccountRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountRaw) {
        return { sent: 0, failed: tokenRows.length, errorMessage: 'FIREBASE_SERVICE_ACCOUNT_JSON não configurado' };
    }
    const serviceAccount = JSON.parse(serviceAccountRaw);
    const accessToken = await getFcmAccessToken(serviceAccount);

    const customerById = new Map(customers.map((c: any) => [c.id, c]));
    let sent = 0;
    let failed = 0;

    for (const row of tokenRows) {
        const customer = customerById.get(row.customer_id);
        const body = (campaign.message || '').replace(/{name}/g, customer?.name || 'Cliente');

        const result = await sendFcmMessage(
            accessToken,
            serviceAccount.project_id,
            row.token,
            { title: campaign.title || campaign.name || 'Açaí no Grau', body },
        );

        if (result.ok) {
            sent++;
        } else {
            failed++;
            if (result.unregistered) {
                await supabase.from('customer_push_tokens').delete().eq('id', row.id);
            }
        }
    }

    return { sent, failed };
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    // Aciona apenas via cron (service_role) ou staff autenticado.
    const authError = await requireStaffOrService(req);
    if (authError) return authError;

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

        console.log("⏰ Cron de Marketing Rodando...");

        // 1. BUSCAR CAMPANHAS PENDENTES QUE JÁ CHEGARAM NA HORA
        const now = new Date().toISOString();

        const { data: campaigns } = await supabase
            .from('scheduled_campaigns')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_for', now); // FILTRO DE DATA ATIVADO

        if (!campaigns || campaigns.length === 0) {
            console.log("💤 Nenhuma campanha agendada para agora.");
            return new Response(JSON.stringify({ success: true, message: "Nada pendente para agora." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
        }

        const report = [];

        // 2. PROCESSAR CAMPANHAS
        for (const campaign of campaigns) {
            console.log(`🚀 Processando campanha agendada: ${campaign.name}`);

            let formattedChoices = [];
            if (Array.isArray(campaign.choices)) {
                formattedChoices = campaign.choices.map((c: any) => {
                    if (typeof c === 'string') return c;
                    return `${c.title}|${c.value || c.title}`;
                });
            }

            // Marcar como enviando para evitar duplicidade
            await supabase.from('scheduled_campaigns').update({ status: 'sending' }).eq('id', campaign.id);

            if (campaign.channel === 'push') {
                const pushResult = await processPushCampaign(supabase, campaign);
                await supabase.from('scheduled_campaigns').update({
                    status: 'sent',
                    sent_count: pushResult.sent,
                    failed_count: pushResult.failed,
                    executed_at: new Date().toISOString(),
                    ...(pushResult.errorMessage ? { error_message: pushResult.errorMessage } : {}),
                }).eq('id', campaign.id);
                report.push({ name: campaign.name, sent: pushResult.sent, failed: pushResult.failed });
                continue;
            }

            // Buscar clientes
            let query = supabase.from('customers').select('id, name, phone').not('phone', 'is', null);

            if (campaign.segment === 'new') {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                query = query.gte('created_at', sevenDaysAgo.toISOString());
            }

            const { data: customers } = await query;

            if (!customers || customers.length === 0) {
                console.log("⚠️ Segmento vazio.");
                await supabase.from('scheduled_campaigns').update({
                    status: 'sent',
                    sent_count: 0,
                    error_message: 'Segmento vazio (nenhum cliente encontrado)'
                }).eq('id', campaign.id);
                report.push({ name: campaign.name, status: 'empty' });
                continue;
            }

            let sent = 0;
            let failed = 0;

            for (const customer of customers) {
                try {
                    let phone = customer.phone.replace(/\D/g, '');
                    if (phone.length < 10) continue;

                    if (phone.length <= 11 && !phone.startsWith('55')) {
                        phone = '55' + phone;
                    }

                    let text = campaign.message.replace(/{name}/g, customer.name || 'Cliente');

                    const body: any = {
                        number: phone,
                        type: 'button',
                        text: text,
                        choices: formattedChoices,
                        footerText: campaign.footer_text || "Açaí no Grau"
                    };

                    if (campaign.image_url) {
                        body.imageButton = campaign.image_url;
                    }

                    // Disparo
                    const apiRes = await fetch(`${BTZAP_URL}/send/menu`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'token': BTZAP_TOKEN },
                        body: JSON.stringify(body)
                    });

                    if (apiRes.ok) {
                        sent++;
                    } else {
                        failed++;
                        console.error(`Erro API ${phone}:`, await apiRes.text());
                    }

                } catch (err) {
                    console.error("Erro processamento:", err);
                    failed++;
                }
                await sleep(800);
            }

            // Atualizar Status Final
            const { error: rpcError } = await supabase.rpc('admin_update_campaign_status', {
                p_campaign_id: campaign.id,
                p_status: 'sent',
                p_sent_count: sent,
                p_failed_count: failed
            });

            if (rpcError) {
                await supabase.from('scheduled_campaigns').update({
                    status: 'sent',
                    sent_count: sent,
                    failed_count: failed,
                    executed_at: new Date().toISOString()
                }).eq('id', campaign.id);
            }

            report.push({ name: campaign.name, sent, failed });
        }

        return new Response(
            JSON.stringify({
                success: true,
                report
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );

    } catch (error: any) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
    }
});
