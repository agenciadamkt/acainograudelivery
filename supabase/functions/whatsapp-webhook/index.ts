import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatPhone(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    return clean.length <= 11 ? `55${clean}` : clean;
}

function cleanLocalPhone(phone: string): string {
    // Ex: 5511999999999@s.whatsapp.net → 11999999999
    let clean = phone.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    if (clean.startsWith('55') && clean.length > 11) clean = clean.substring(2);
    return clean;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // ── Identificar o franqueado pela query string ?fid=UUID ────────────
        // Cada franqueado configura seu webhook com a URL:
        // https://[projeto].supabase.co/functions/v1/whatsapp-webhook?fid=[franchisee_id]
        const reqUrl = new URL(req.url);
        const franchiseeId = reqUrl.searchParams.get('fid') ?? null;

        const payload = await req.json();
        console.log('[WhatsApp Webhook] 📥 Recebido (fid=%s):', franchiseeId, JSON.stringify(payload, null, 2));

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        // ── Buscar config do franqueado ─────────────────────────────────────
        let apiUrl   = 'https://acainograu.uazapi.com';
        let apiToken = Deno.env.get('BTZAP_TOKEN') ?? '';

        if (franchiseeId) {
            const { data: intData } = await supabaseClient
                .from('integrations')
                .select('config, active')
                .eq('name', 'uazapi_whatsapp')
                .eq('franchisee_id', franchiseeId)
                .maybeSingle();

            if (intData?.config && intData.active) {
                apiUrl   = intData.config.base_url || apiUrl;
                apiToken = intData.config.token    || apiToken;
                console.log('[WhatsApp Webhook] ✅ Config do franqueado carregada:', franchiseeId);
            }
        }

        // ── Parsing do payload UazAPI ───────────────────────────────────────
        const data    = payload.data || payload;
        const message = data.message || payload.message;
        const key     = data.key     || payload.key;

        const senderPhone = key?.remoteJid || '';
        const senderName  = data.pushName  || 'Cliente';

        // Ignorar mensagens enviadas pelo próprio bot (fromMe)
        if (key?.fromMe === true) {
            return new Response(JSON.stringify({ message: 'Ignored: own message' }), { status: 200 });
        }

        // ── Extrair buttonId (resposta de botão) ────────────────────────────
        let buttonId = '';

        if (message) {
            if (message.buttonsResponseMessage) {
                buttonId = message.buttonsResponseMessage.selectedButtonId;
            } else if (message.interactive?.button_reply) {
                buttonId = message.interactive.button_reply.id;
            } else if (message.interactive?.buttonReply) {
                buttonId = message.interactive.buttonReply.id;
            } else if (message.templateButtonReplyMessage) {
                buttonId = message.templateButtonReplyMessage.selectedId;
            } else if (message.listResponseMessage) {
                buttonId = message.listResponseMessage.singleSelectReply?.selectedRowId ?? '';
            }
        }

        // Texto livre como fallback (palavras-chave de feedback)
        if (message && !buttonId) {
            const text = message.conversation || message.extendedTextMessage?.text || '';
            if (text) {
                const t = text.toLowerCase().trim();
                if (t.includes('amei') || t.includes('gostei') || t.includes('ótimo') || t.includes('otimo')) {
                    buttonId = 'feedback_positive';
                } else if (t.includes('pode melhorar') || t.includes('neutro')) {
                    buttonId = 'feedback_neutral';
                } else if (t.includes('tive um problema') || t.includes('ruim') || t.includes('péssimo') || t.includes('pessimo')) {
                    buttonId = 'feedback_negative';
                }
            }
        }

        // Fallback Evolution/outros formatos
        if (!buttonId) {
            if (payload?.responseType === 'button') buttonId = payload.responseId;
            else if (payload?.selectedId)            buttonId = payload.selectedId;
        }

        if (!buttonId) {
            return new Response(
                JSON.stringify({ message: 'Ignored: not a button response' }),
                { status: 200 },
            );
        }

        // ── Determinar categoria de feedback ───────────────────────────────
        let feedbackCategory = '';
        if (buttonId.includes('positive')) feedbackCategory = 'positive';
        else if (buttonId.includes('neutral'))  feedbackCategory = 'neutral';
        else if (buttonId.includes('negative')) feedbackCategory = 'negative';

        if (!feedbackCategory) {
            console.log('[WhatsApp Webhook] ID de botão não reconhecido:', buttonId);
            return new Response(JSON.stringify({ message: 'Unknown button ID' }), { status: 200 });
        }

        // ── Buscar cliente pelo telefone ────────────────────────────────────
        const localPhone = cleanLocalPhone(senderPhone);
        console.log('[WhatsApp Webhook] Buscando cliente com telefone:', localPhone);

        const { data: customerResults, error: customerError } = await supabaseClient
            .rpc('find_customer_by_phone', { phone_input: localPhone });

        if (customerError) {
            console.error('[WhatsApp Webhook] Erro ao buscar cliente:', customerError);
        }

        const customerData = customerResults?.[0] ?? null;

        if (!customerData) {
            console.error('[WhatsApp Webhook] Cliente não encontrado:', localPhone);
            return new Response(JSON.stringify({ message: 'Customer not found' }), { status: 200 });
        }

        // ── Buscar último pedido do cliente ────────────────────────────────
        // Se tiver franchiseeId, filtra pedidos da loja do franqueado
        let orderQuery = supabaseClient
            .from('orders')
            .select('id, order_number, store:stores(franchisee_user_id)')
            .eq('customer_id', customerData.id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (franchiseeId) {
            // Filtra pelo store do franqueado para não cruzar dados entre franqueados
            const { data: stores } = await supabaseClient
                .from('stores')
                .select('id')
                .eq('franchisee_user_id', franchiseeId);

            const storeIds = (stores ?? []).map((s: any) => s.id);
            if (storeIds.length > 0) {
                orderQuery = orderQuery.in('store_id', storeIds);
            }
        }

        const { data: order } = await orderQuery.single();

        if (!order) {
            console.error('[WhatsApp Webhook] Pedido não encontrado para cliente:', customerData.id);
            return new Response(JSON.stringify({ message: 'Order not found' }), { status: 200 });
        }

        console.log('[WhatsApp Webhook] Pedido vinculado:', order.order_number);

        // ── Salvar feedback ─────────────────────────────────────────────────
        let score = 0;
        let category = '';
        if (feedbackCategory === 'positive') { score = 5; category = 'positive'; }
        else if (feedbackCategory === 'neutral')  { score = 3; category = 'neutral'; }
        else if (feedbackCategory === 'negative') { score = 1; category = 'negative'; }

        const { error: fbError } = await supabaseClient
            .from('order_feedback')
            .insert({
                order_id: order.id,
                customer_id: customerData.id,
                nps_score: score,
                category,
                comment: `Feedback via WhatsApp (${senderName})`,
            });

        if (fbError) {
            console.error('[WhatsApp Webhook] Erro ao salvar feedback:', fbError);
            throw fbError;
        }

        // ── Enviar mensagem de agradecimento ────────────────────────────────
        let replyText = '';
        if (score === 5)      replyText = '😍 Ficamos muito felizes que você amou! Obrigado pelo carinho! 💜';
        else if (score === 3) replyText = 'Obrigado pelo feedback! Vamos trabalhar para melhorar na próxima. 🙏';
        else                  replyText = 'Sinto muito que sua experiência não foi ideal. Nossa equipe vai verificar o que houve. 😔';

        const replyPhone = formatPhone(senderPhone.replace('@s.whatsapp.net', ''));

        await fetch(`${apiUrl.replace(/\/$/, '')}/send/text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'token': apiToken },
            body: JSON.stringify({ number: replyPhone, text: replyText }),
        });

        return new Response(
            JSON.stringify({ success: true }),
            { headers: corsHeaders, status: 200 },
        );

    } catch (error: any) {
        console.error('[WhatsApp Webhook] ❌ Erro:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: corsHeaders, status: 500 },
        );
    }
});
