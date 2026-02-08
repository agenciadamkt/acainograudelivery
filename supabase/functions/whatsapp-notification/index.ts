import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BTZAP_TOKEN = "4a0e432a-2717-42ed-a2cf-39127a768cd8";
const BTZAP_URL = "https://btzap.uazapi.com";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WHATSAPP_MESSAGES = {
    pending: (order: any) =>
        `Olá ${order.customer?.name}! Recebemos seu pedido #${order.order_number} na *Açaí no Grau*. Estamos aguardando a confirmação do pagamento. 🕒`,

    confirmed: (order: any) =>
        `Olá ${order.customer?.name}! Seu pedido #${order.order_number} foi *CONFIRMADO* e já entrou em nossa fila de produção. ✅`,

    preparing: (order: any) =>
        `Seu pedido #${order.order_number} já está sendo *PREPARADO* com todo o capricho. 🍦`,

    ready: (order: any) =>
        order.order_type === 'delivery'
            ? `Seu pedido #${order.order_number} está *PRONTO* e já saiu com o motoboy para entrega! 🛵💨`
            : `Seu pedido #${order.order_number} está *PRONTO* e te aguardando para retirada! Pode vir buscar. 🛍️`,

    delivered: (order: any) =>
        `Pedido #${order.order_number} entregue! ✅ Esperamos que aproveite seu açaí. Bom apetite! 💜`,

    cancelled: (order: any) =>
        `Olá ${order.customer?.name}, infelizmente seu pedido #${order.order_number} foi cancelado. ❌`
};

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const payload = await req.json().catch(() => ({}));
        console.log('[WhatsApp] 📥 Payload recebido:', JSON.stringify(payload, null, 2));

        const { record, old_record, type } = payload;
        const testPhone = payload.test_phone;
        const campaignData = payload.campaign_data;

        // Se for um teste manual via POST ou disparo de campanha
        if (testPhone && (payload.test_message || campaignData)) {
            console.log('[WhatsApp] 🧪 Modo teste/campanha detectado');

            const cleanTestPhone = testPhone.replace(/\D/g, '');
            const formattedTestPhone = cleanTestPhone.length <= 11 ? `55${cleanTestPhone}` : cleanTestPhone;

            let endpoint = 'send/text';
            let body: any = { number: formattedTestPhone };

            if (campaignData) {
                endpoint = 'send/menu';
                body = {
                    ...body,
                    type: 'button',
                    text: campaignData.text,
                    imageButton: campaignData.imageButton,
                    choices: campaignData.choices,
                    footerText: campaignData.footerText
                };
            } else {
                body.text = payload.test_message;
            }

            const response = await fetch(`${BTZAP_URL}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'token': BTZAP_TOKEN },
                body: JSON.stringify(body)
            });
            const result = await response.json();
            return new Response(JSON.stringify({ success: true, result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Validação básica do Webhook do Supabase
        if (!record || !record.id) {
            console.log('[WhatsApp] ⚠️ Record não encontrado no payload');
            return new Response(JSON.stringify({ message: 'No record found' }), { status: 200 });
        }

        // Somente envia se o status mudou (se houver record antigo)
        if (old_record && record.status === old_record.status) {
            console.log('[WhatsApp] ⏸️ Status inalterado:', record.status);
            return new Response(JSON.stringify({ message: 'Status unchanged' }), { status: 200 });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        // 1. Buscar dados do pedido e cliente
        const { data: order, error: orderError } = await supabaseClient
            .from('orders')
            .select(`
                *,
                customer:customers(name, phone)
            `)
            .eq('id', record.id)
            .single();

        if (orderError || !order) {
            console.error('[WhatsApp] ❌ Erro ao buscar pedido:', orderError);
            throw orderError || new Error('Order not found');
        }

        const phone = order.customer?.phone;
        if (!phone) {
            console.log('[WhatsApp] ⚠️ Telefone do cliente não encontrado para o pedido:', order.id);
            return new Response(JSON.stringify({ message: 'Customer phone not found' }), { status: 200 });
        }

        // 2. Buscar templates das configurações
        const { data: bgSetting } = await supabaseClient
            .from('system_settings')
            .select('value')
            .eq('key', 'whatsapp_messages')
            .single();

        let templates = null;
        if (bgSetting?.value) {
            try {
                templates = typeof bgSetting.value === 'string' ? JSON.parse(bgSetting.value) : bgSetting.value;
            } catch (e) {
                console.error('[WhatsApp] ❌ Erro ao parsear templates:', e);
            }
        }

        // 3. Determinar a mensagem baseada no status
        const status = record.status;
        let message = '';

        if (templates && templates[status]) {
            // Usar template dinâmico
            message = templates[status]
                .replace(/{name}/g, order.customer?.name || 'cliente')
                .replace(/{order_number}/g, order.order_number || '');
        } else {
            // Fallback para hardcoded se não houver template no DB
            const fallbackGenerator = WHATSAPP_MESSAGES[status as keyof typeof WHATSAPP_MESSAGES];
            if (!fallbackGenerator) {
                console.log('[WhatsApp] ⚠️ Sem template (dinâmico ou fallback) para o status:', status);
                return new Response(JSON.stringify({ message: 'No template for this status' }), { status: 200 });
            }
            message = fallbackGenerator(order);
        }

        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

        // 4. Determinar endpoint e body (Texto ou Menu Interativo)
        let endpoint = 'send/text';
        let body: any = {
            number: formattedPhone,
            text: message
        };

        // Enviar Menu de Pesquisa se for status "delivered"
        if (status === 'delivered') {
            endpoint = 'send/menu';
            body = {
                number: formattedPhone,
                type: 'button',
                text: `${message}\n\nO que achou do seu açaí? Sua opinião é muito importante para nós!`,
                choices: [
                    "Amei! 😍|feedback_positive",
                    "Pode melhorar|feedback_neutral",
                    "Tive um problema|feedback_negative"
                ],
                footerText: "Açaí no Grau - Feedback"
            };
        }

        console.log(`[WhatsApp] 🚀 Enviando (${endpoint}) para ${formattedPhone}`);

        const btzapResponse = await fetch(`${BTZAP_URL}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'token': BTZAP_TOKEN
            },
            body: JSON.stringify(body)
        });

        const btzapResult = await btzapResponse.json();
        console.log('[WhatsApp] ✅ Resultado BTZAP:', JSON.stringify(btzapResult));

        return new Response(JSON.stringify({ success: true, result: btzapResult }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (error: any) {
        console.error('[WhatsApp] ❌ Erro fatal:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
