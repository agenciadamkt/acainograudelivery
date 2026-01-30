import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BTZAP_TOKEN = "4a0e432a-2717-42ed-a2cf-39127a768cd8";
const BTZAP_URL = "https://btzap.uazapi.com";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const payload = await req.json();
        console.log('[WhatsApp Webhook] 📥 Recebido:', JSON.stringify(payload, null, 2));

        // Estrutura robusta de parsing baseada na documentação do BTZAP/Uazapi
        // O payload geralmente vem como { event: "message", data: { message: { ... } } }

        let buttonId = '';
        let senderPhone = '';
        let senderName = '';

        const data = payload.data || payload; // Tenta pegar data, senão usa o próprio payload
        const message = data.message || payload.message;
        const key = data.key || payload.key;

        // Identificar remetente
        senderPhone = key?.remoteJid || '';
        senderName = data.pushName || 'Cliente';

        if (message) {
            // 1. Botão Simples (ButtonsResponseMessage)
            if (message.buttonsResponseMessage) {
                buttonId = message.buttonsResponseMessage.selectedButtonId;
            }
            // 2. Mensagem Interativa (InteractiveMessage - Button Reply)
            else if (message.interactive?.button_reply) {
                buttonId = message.interactive.button_reply.id; // Baileys standard
            }
            else if (message.interactive?.buttonReply) {
                buttonId = message.interactive.buttonReply.id; // Some variations
            }
            // 3. Template Button Reply
            else if (message.templateButtonReplyMessage) {
                buttonId = message.templateButtonReplyMessage.selectedId;
            }
            // 4. Lista (ListResponseMessage)
            else if (message.listResponseMessage) {
                buttonId = message.listResponseMessage.singleSelectReply?.selectedRowId;
            }
        }

        // 5. Mensagem de Texto (Fallback se o usuário digitar ou o botão enviar como texto)
        if (message && !buttonId) {
            const text = message.conversation || message.extendedTextMessage?.text || '';

            if (text) {
                const cleanText = text.toLowerCase().trim();
                if (cleanText.includes('amei') || cleanText.includes('gostei') || cleanText.includes('ótimo') || cleanText.includes('otimo')) {
                    buttonId = 'feedback_positive';
                } else if (cleanText.includes('pode melhorar') || cleanText.includes('neutro')) {
                    buttonId = 'feedback_neutral';
                } else if (cleanText.includes('tive um problema') || cleanText.includes('ruim') || cleanText.includes('péssimo')) {
                    buttonId = 'feedback_negative';
                }
            }
        }

        // Fallbacks para outras APIs (Evolution, etc)
        if (!buttonId) {
            if (payload?.responseType === 'button') buttonId = payload.responseId;
            else if (payload?.selectedId) buttonId = payload.selectedId;
        }

        if (!buttonId) {
            return new Response(JSON.stringify({ message: 'Ignored: Not a button response' }), { status: 200 });
        }

        let feedbackCategory = '';

        // Simplificar identificação do botão (apenas categoria)
        if (buttonId.includes('positive')) feedbackCategory = 'positive';
        else if (buttonId.includes('neutral')) feedbackCategory = 'neutral';
        else if (buttonId.includes('negative')) feedbackCategory = 'negative';

        if (!feedbackCategory) {
            console.log('[Webhook] ID de botão não reconhecido:', buttonId);
            return new Response(JSON.stringify({ message: 'Unknown button ID' }), { status: 200 });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        // 1. Limpar telefone do remetente
        // Ex: 5511999999999@s.whatsapp.net -> 11999999999
        let cleanPhone = senderPhone.replace('@s.whatsapp.net', '').replace(/\D/g, '');

        // Remove 55 do início se houver (para garantir busca no banco que as vezes não tem DDI)
        if (cleanPhone.startsWith('55') && cleanPhone.length > 11) {
            cleanPhone = cleanPhone.substring(2);
        }

        console.log('[Webhook] Buscando pedido para cliente com telefone (contém):', cleanPhone);

        // 2. Buscar Cliente usando RPC (ignora formatação de telefone)
        const { data: customerResults, error: customerError } = await supabaseClient
            .rpc('find_customer_by_phone', { phone_input: cleanPhone });

        if (customerError) {
            console.error('[Webhook] Erro ao buscar cliente via RPC:', customerError);
        }

        // RPC retorna array, pegamos o primeiro
        const customerData = customerResults && customerResults.length > 0 ? customerResults[0] : null;

        if (!customerData) {
            console.error('[Webhook] Cliente não encontrado para o telefone (RPC):', cleanPhone);
            return new Response(JSON.stringify({ message: 'Customer not found' }), { status: 200 });
        }

        // 3. Buscar último pedido desse cliente
        const { data: order } = await supabaseClient
            .from('orders')
            .select('id, order_number')
            .eq('customer_id', customerData.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!order) {
            console.error('[Webhook] Nenhum pedido encontrado para cliente:', customerData.id);
            return new Response(JSON.stringify({ message: 'Order not found' }), { status: 200 });
        }

        console.log('[Webhook] Pedido vinculado:', order.order_number);

        // Mapear Score
        let score = 0;
        let category = '';
        if (feedbackCategory === 'positive') { score = 5; category = 'positive'; }
        else if (feedbackCategory === 'neutral') { score = 3; category = 'neutral'; }
        else if (feedbackCategory === 'negative') { score = 1; category = 'negative'; }

        // Salvar Feedback
        const { error } = await supabaseClient
            .from('order_feedback')
            .insert({
                order_id: order.id,
                customer_id: customerData.id,
                nps_score: score,
                category: category,
                comment: `Feedback via WhatsApp (${senderName})`
            });

        if (error) {
            console.error('[WhatsApp Webhook] ❌ Erro ao salvar feedback:', error);
            throw error;
        }

        // Enviar Agradecimento
        let replyText = '';
        if (score === 5) replyText = "😍 Ficamos muito felizes que você amou! Obrigado pelo carinho! 💜";
        else if (score === 3) replyText = "Obrigado pelo feedback! Vamos trabalhar para melhorar na próxima. 🙏";
        else replyText = "Sinto muito que sua experiência não foi ideal. Nossa equipe vai verificar o que houve. 😔";

        // Limpar telefone (remover @s.whatsapp.net se houver)
        const replyPhone = senderPhone.replace('@s.whatsapp.net', '').replace(/\D/g, '');

        // Enviar mensagem de texto simples
        await fetch(`${BTZAP_URL}/send/text`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'token': BTZAP_TOKEN
            },
            body: JSON.stringify({
                number: replyPhone,
                text: replyText
            })
        });

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders, status: 200 });

    } catch (error: any) {
        console.error('[WhatsApp Webhook] ❌ Erro:', error);
        return new Response(JSON.stringify({ error: error.message }), { headers: corsHeaders, status: 500 });
    }
});
