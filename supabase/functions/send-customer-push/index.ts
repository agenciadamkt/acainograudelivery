import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getFcmAccessToken, sendFcmMessage } from "../_shared/fcm.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mensagens do push nativo do app "Açaí no Grau" (cliente) — mesmos status
// já usados em whatsapp-notification/index.ts, só que resumidos pro formato
// de notificação (título + corpo curto) em vez de mensagem de WhatsApp.
const PUSH_MESSAGES: Record<string, (order: any) => { title: string; body: string }> = {
  pending: (order) => ({
    title: 'Pedido recebido',
    body: `Recebemos seu pedido #${order.order_number}. Aguardando confirmação do pagamento.`,
  }),
  confirmed: (order) => ({
    title: 'Pedido confirmado ✅',
    body: `Seu pedido #${order.order_number} foi confirmado e já entrou na fila de produção.`,
  }),
  preparing: (order) => ({
    title: 'Preparando seu açaí 🍦',
    body: `Seu pedido #${order.order_number} já está sendo preparado.`,
  }),
  ready: (order) => ({
    title: 'Pedido pronto!',
    body: order.order_type === 'delivery'
      ? `Seu pedido #${order.order_number} está pronto e já saiu com o motoboy! 🛵`
      : `Seu pedido #${order.order_number} está pronto pra retirada! 🛍️`,
  }),
  out_for_delivery: (order) => ({
    title: 'Saiu para entrega 🛵',
    body: `Seu pedido #${order.order_number} está a caminho.`,
  }),
  delivered: (order) => ({
    title: 'Pedido entregue 💜',
    body: `Pedido #${order.order_number} entregue! Bom apetite.`,
  }),
  cancelled: (order) => ({
    title: 'Pedido cancelado',
    body: `Seu pedido #${order.order_number} foi cancelado.`,
  }),
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const payload = await req.json();
    const { order_id, status } = payload;
    console.log('[CustomerPush] 📥 Recebido:', payload);

    // Modo teste/campanha manual (Marketing > Testar) — mesmo padrão do
    // test_phone em whatsapp-notification/index.ts, só que aqui manda pro
    // token de push do cliente em vez do WhatsApp.
    if (payload.test_phone) {
      const { data: customer } = await supabaseClient
        .from('customers')
        .select('id')
        .eq('phone', payload.test_phone.replace(/\D/g, ''))
        .maybeSingle();

      if (!customer) {
        return new Response(JSON.stringify({ error: 'Cliente não encontrado com esse telefone' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        });
      }

      const { data: tokens } = await supabaseClient
        .from('customer_push_tokens')
        .select('*')
        .eq('customer_id', customer.id);

      if (!tokens || tokens.length === 0) {
        return new Response(JSON.stringify({ error: 'Cliente não tem o app instalado (sem token de push)' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const serviceAccountRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
      if (!serviceAccountRaw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not configured');
      const serviceAccount = JSON.parse(serviceAccountRaw);
      const accessToken = await getFcmAccessToken(serviceAccount);

      const results = await Promise.allSettled(
        tokens.map((row) => sendFcmMessage(
          accessToken,
          serviceAccount.project_id,
          row.token,
          { title: payload.test_title || 'Teste', body: payload.test_message || 'Mensagem de teste' },
        )),
      );
      const success = results.filter((r) => r.status === 'fulfilled' && (r.value as any).ok).length;

      return new Response(JSON.stringify({ message: 'Test push sent', total: tokens.length, success }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const messageBuilder = PUSH_MESSAGES[status];
    if (!messageBuilder) {
      return new Response(JSON.stringify({ message: 'No template for status' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('id, order_number, order_type, customer_id')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('[CustomerPush] ❌ Pedido não encontrado:', orderError);
      throw orderError || new Error('Order not found');
    }

    const { data: tokens, error: tokensError } = await supabaseClient
      .from('customer_push_tokens')
      .select('*')
      .eq('customer_id', order.customer_id);

    if (tokensError) throw tokensError;

    if (!tokens || tokens.length === 0) {
      console.log('[CustomerPush] ⚠️ Cliente sem token de push registrado:', order.customer_id);
      return new Response(JSON.stringify({ message: 'No push tokens for customer' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const serviceAccountRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountRaw) {
      console.error('[CustomerPush] ❌ FIREBASE_SERVICE_ACCOUNT_JSON não configurado');
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not configured');
    }
    const serviceAccount = JSON.parse(serviceAccountRaw);
    const accessToken = await getFcmAccessToken(serviceAccount);
    const { title, body } = messageBuilder(order);

    const results = await Promise.allSettled(
      tokens.map(async (row) => {
        const result = await sendFcmMessage(
          accessToken,
          serviceAccount.project_id,
          row.token,
          { title, body },
          { orderId: String(order.id) },
        );
        if (!result.ok) {
          if (result.unregistered) {
            await supabaseClient.from('customer_push_tokens').delete().eq('id', row.id);
          }
          throw new Error(`FCM error (${row.platform}): ${result.error}`);
        }
        return result;
      }),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    console.log('[CustomerPush] 📊 Resultado:', { total: tokens.length, success: successCount });

    return new Response(
      JSON.stringify({ message: 'Push notifications sent', total: tokens.length, success: successCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (error: any) {
    console.error('[CustomerPush] ❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
