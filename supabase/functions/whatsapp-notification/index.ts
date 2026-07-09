import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mensagens padrão caso o franqueado não tenha templates customizados
const WHATSAPP_MESSAGES: Record<string, (order: any) => string> = {
    pending: (order) =>
        `Olá ${order.customer?.name}! Recebemos seu pedido #${order.order_number} na *Açaí no Grau*. Estamos aguardando a confirmação do pagamento. 🕒`,
    confirmed: (order) =>
        `Olá ${order.customer?.name}! Seu pedido #${order.order_number} foi *CONFIRMADO* e já entrou em nossa fila de produção. ✅`,
    preparing: (order) =>
        `Seu pedido #${order.order_number} já está sendo *PREPARADO* com todo o capricho. 🍦`,
    ready: (order) =>
        order.order_type === 'delivery'
            ? `Seu pedido #${order.order_number} está *PRONTO* e já saiu com o motoboy para entrega! 🛵💨`
            : `Seu pedido #${order.order_number} está *PRONTO* e te aguardando para retirada! 🛍️`,
    out_for_delivery: (order) =>
        `Seu pedido #${order.order_number} saiu para *ENTREGA*! 🛵💨 O motoboy está a caminho.`,
    delivered: (order) =>
        `Pedido #${order.order_number} entregue! ✅ Esperamos que aproveite seu açaí. Bom apetite! 💜`,
    cancelled: (order) =>
        `Olá ${order.customer?.name}, infelizmente seu pedido #${order.order_number} foi cancelado. ❌`,
};

function formatPhone(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    return clean.length <= 11 ? `55${clean}` : clean;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const payload = await req.json().catch(() => ({}));
        console.log('[WhatsApp Notification] 📥 Payload:', JSON.stringify(payload, null, 2));

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        // ── Modo teste/campanha manual ──────────────────────────────────────
        const testPhone = payload.test_phone;
        if (testPhone && (payload.test_message || payload.campaign_data)) {
            console.log('[WhatsApp Notification] 🧪 Modo teste/campanha');

            // Busca a config do franqueado do payload (opcional)
            let apiUrl = 'https://acainograu.uazapi.com';
            let apiToken = Deno.env.get('BTZAP_TOKEN') ?? '';

            if (payload.franchisee_id) {
                const { data: intData } = await supabaseClient
                    .from('integrations')
                    .select('config, active')
                    .eq('name', 'uazapi_whatsapp')
                    .eq('franchisee_id', payload.franchisee_id)
                    .maybeSingle();

                if (intData?.config && intData.active) {
                    apiUrl   = intData.config.base_url || apiUrl;
                    apiToken = intData.config.token    || apiToken;
                }
            }

            const formattedPhone = formatPhone(testPhone);
            let endpoint = 'send/text';
            let body: any = { number: formattedPhone };

            if (payload.campaign_data) {
                endpoint = 'send/menu';
                body = { ...body, type: 'button', ...payload.campaign_data };
            } else {
                body.text = payload.test_message;
            }

            const resp = await fetch(`${apiUrl.replace(/\/$/, '')}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'token': apiToken },
                body: JSON.stringify(body),
            });
            const result = await resp.json();
            return new Response(
                JSON.stringify({ success: true, result }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            );
        }

        // ── Webhook do Supabase (mudança de status de pedido) ──────────────
        const { record, old_record } = payload;

        if (!record?.id) {
            console.log('[WhatsApp Notification] ⚠️ Sem record no payload');
            return new Response(JSON.stringify({ message: 'No record' }), { status: 200 });
        }

        if (old_record && record.status === old_record.status) {
            console.log('[WhatsApp Notification] ⏸️ Status inalterado:', record.status);
            return new Response(JSON.stringify({ message: 'Status unchanged' }), { status: 200 });
        }

        // 1. Buscar pedido com cliente e loja
        const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .select(`*, customer:customers(name, phone), store:stores(franchisee_user_id)`)
            .eq('id', record.id)
            .single();

        if (orderError || !order) {
            console.error('[WhatsApp Notification] ❌ Erro ao buscar pedido:', orderError);
            throw orderError || new Error('Order not found');
        }

        const phone = order.customer?.phone;
        if (!phone) {
            console.log('[WhatsApp Notification] ⚠️ Telefone não encontrado para o pedido:', order.id);
            return new Response(JSON.stringify({ message: 'No phone' }), { status: 200 });
        }

        // 2. Buscar integração UazAPI do franqueado dono da loja
        const franchiseeId = order.store?.franchisee_user_id;
        let apiUrl   = 'https://acainograu.uazapi.com';
        let apiToken = Deno.env.get('BTZAP_TOKEN') ?? '';
        let autoSendEnabled = true;
        let notifyStatuses: string[] = [];

        if (franchiseeId) {
            const { data: intData } = await supabaseClient
                .from('integrations')
                .select('config, active')
                .eq('name', 'uazapi_whatsapp')
                .eq('franchisee_id', franchiseeId)
                .maybeSingle();

            if (intData?.config && intData.active) {
                const cfg = intData.config;
                apiUrl          = cfg.base_url        || apiUrl;
                apiToken        = cfg.token            || apiToken;
                autoSendEnabled = cfg.auto_send_enabled ?? true;
                notifyStatuses  = cfg.notify_statuses  ?? [];

                console.log('[WhatsApp Notification] ✅ Config do franqueado carregada:', franchiseeId);
            } else {
                console.log('[WhatsApp Notification] ⚠️ Integração não encontrada ou inativa para franqueado:', franchiseeId);
            }
        }

        // 3. Verificar se o envio automático está habilitado para este status
        if (!autoSendEnabled) {
            console.log('[WhatsApp Notification] ⏸️ Envio automático desabilitado para este franqueado');
            return new Response(JSON.stringify({ message: 'Auto send disabled' }), { status: 200 });
        }

        if (notifyStatuses.length > 0 && !notifyStatuses.includes(record.status)) {
            console.log('[WhatsApp Notification] ⏸️ Status não está na lista de notificações:', record.status);
            return new Response(JSON.stringify({ message: 'Status not in notify list' }), { status: 200 });
        }

        // 4. Determinar mensagem (template do DB ou fallback)
        const { data: bgSetting } = await supabaseClient
            .from('system_settings')
            .select('value')
            .eq('key', 'whatsapp_messages')
            .single();

        let templates: Record<string, string> | null = null;
        if (bgSetting?.value) {
            try {
                templates = typeof bgSetting.value === 'string'
                    ? JSON.parse(bgSetting.value)
                    : bgSetting.value;
            } catch { /* usa fallback */ }
        }

        const status = record.status;
        let message = '';

        if (templates?.[status]) {
            message = templates[status]
                .replace(/{name}/g, order.customer?.name || 'cliente')
                .replace(/{order_number}/g, order.order_number || '');
        } else {
            const fallback = WHATSAPP_MESSAGES[status];
            if (!fallback) {
                console.log('[WhatsApp Notification] ⚠️ Sem template para status:', status);
                return new Response(JSON.stringify({ message: 'No template for status' }), { status: 200 });
            }
            message = fallback(order);
        }

        // 5. Enviar (menu interativo no "delivered" para capturar feedback)
        const formattedPhone = formatPhone(phone);
        let endpoint = 'send/text';
        let body: any = { number: formattedPhone, text: message };

        if (status === 'delivered') {
            endpoint = 'send/menu';
            body = {
                number: formattedPhone,
                type: 'button',
                text: `${message}\n\nO que achou do seu açaí? Sua opinião é muito importante para nós!`,
                choices: [
                    'Amei! 😍|feedback_positive',
                    'Pode melhorar|feedback_neutral',
                    'Tive um problema|feedback_negative',
                ],
                footerText: 'Açaí no Grau - Feedback',
            };
        }

        console.log(`[WhatsApp Notification] 🚀 Enviando (${endpoint}) para ${formattedPhone} via ${apiUrl}`);

        const sendResp = await fetch(`${apiUrl.replace(/\/$/, '')}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'token': apiToken },
            body: JSON.stringify(body),
        });

        const sendResult = await sendResp.json();
        console.log('[WhatsApp Notification] ✅ Resultado:', JSON.stringify(sendResult));

        return new Response(
            JSON.stringify({ success: true, result: sendResult }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );

    } catch (error: any) {
        console.error('[WhatsApp Notification] ❌ Erro fatal:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
        );
    }
});
