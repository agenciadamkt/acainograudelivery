import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { order_id, store_id } = await req.json();
    console.log('[Push] 📥 Recebido pedido:', { order_id, store_id });

    // 1. Buscar dados completos do pedido
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select(`
        *,
        customer:customers(name, phone)
      `)
      .eq('id', order_id)
      .single();

    if (orderError) {
      console.error('[Push] ❌ Erro ao buscar pedido:', orderError);
      throw orderError;
    }

    console.log('[Push] ✅ Pedido encontrado:', order.order_number);

    // 2. Buscar todas as subscriptions de admins/staff da loja
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('store_id', store_id);

    if (subError) {
      console.error('[Push] ❌ Erro ao buscar subscriptions:', subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push] ⚠️ Nenhuma subscription encontrada para store:', store_id);
      return new Response(JSON.stringify({ message: 'No subscriptions found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    console.log('[Push] 📱 Subscriptions encontradas:', subscriptions.length);

    // 3. Preparar payload da notificação
    const payload = JSON.stringify({
      title: '🔔 NOVO PEDIDO CHEGOU!',
      body: `Pedido #${order.order_number}\nCliente: ${order.customer?.name || 'Cliente'}\nValor: R$ ${order.total_amount?.toFixed(2) || '0.00'}`,
      icon: '/logo-192x192.png',
      badge: '/logo-192x192.png',
      tag: 'new-order-' + order.id,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      data: {
        orderId: order.id,
        url: '/admin/orders'
      }
    });

    // 4. Enviar Web Push para cada subscription usando Web Push API
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[Push] ❌ VAPID keys não configuradas');
      throw new Error('VAPID keys not configured');
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          console.log('[Push] 🚀 Enviando push para:', sub.endpoint.substring(0, 50) + '...');
          
          // Importar web-push dinamicamente
          const webpush = await import('https://esm.sh/web-push@3.6.3');
          
          webpush.setVapidDetails(
            'mailto:dev.acainograu@gmail.com',
            vapidPublicKey,
            vapidPrivateKey
          );

          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth
              }
            },
            payload
          );

          console.log('[Push] ✅ Push enviado com sucesso');
          return { success: true };
        } catch (error: any) {
          console.error('[Push] ❌ Erro ao enviar push:', error);
          
          // Se o subscription está inválido (410 Gone), remover do DB
          if (error?.statusCode === 410) {
            console.log('[Push] 🗑️ Removendo subscription inválida');
            await supabaseClient
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }
          
          return { success: false, error: error?.message || 'Unknown error' };
        }
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    console.log('[Push] 📊 Resultado:', { total: subscriptions.length, success: successCount });

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications sent',
        total: subscriptions.length,
        success: successCount
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[Push] ❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
