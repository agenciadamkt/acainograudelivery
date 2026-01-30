import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify Mercado Pago webhook signature
    const xSignature = req.headers.get('x-signature')
    const xRequestId = req.headers.get('x-request-id')

    if (!xSignature || !xRequestId) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook source' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()

    // Mercado Pago envia notificações de pagamento
    if (body.type === 'payment') {
      const paymentId = body.data.id

      // 1. Encontrar o pedido pelo ID do pagamento
      let { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, store_id, payment_status')
        .or(`payment_id.eq.${paymentId},mercadopago_payment_id.eq.${paymentId}`)
        .single();

      // Fallback: Tentar encontrar via observações (se o link acima falhou)
      if (!order) {
        console.log('Order not found by ID columns, trying notes...');
        const { data: noteOrder, error: noteError } = await supabase
          .from('orders')
          .select('id, store_id, payment_status')
          .ilike('customer_notes', `%[Pagamento ID: ${paymentId}]%`)
          .limit(1)
          .maybeSingle(); // Usar maybeSingle para evitar erro se não encontrar

        if (noteOrder) {
          order = noteOrder;
          orderError = null;
        }
      }

      if (orderError || !order) {
        console.error('Order not found for payment:', paymentId);
        // Não lançar erro para não retentar infinitamente se não achou o pedido
        return new Response(JSON.stringify({ message: 'Order not found' }), { status: 200, headers: corsHeaders });
      }

      // 2. Buscar o token da loja
      const { data: store, error: storeError } = await supabase
        .from('stores')
        .select('mercadopago_access_token')
        .eq('id', order.store_id)
        .single();

      if (storeError || !store || !store.mercadopago_access_token) {
        console.error('Store/Token not found for order:', order.id);
        return new Response(JSON.stringify({ message: 'Store configuration error' }), { status: 200, headers: corsHeaders });
      }

      // 3. Consultar status no Mercado Pago
      const accessToken = store.mercadopago_access_token;
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      if (!paymentResponse.ok) {
        console.error('Error fetching payment from MP');
        return new Response(JSON.stringify({ message: 'MP API Error' }), { status: 200, headers: corsHeaders });
      }

      const paymentData = await paymentResponse.json()
      const newStatus = paymentData.status === 'approved' ? 'paid' : paymentData.status === 'pending' ? 'pending' : 'failed';

      // 4. Atualizar pedido se o status mudou
      if (order.payment_status !== 'paid' && newStatus === 'paid') {
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            // Se quiser salvar o JSON completo: mercadopago_data: paymentData 
          })
          .eq('id', order.id);

        if (updateError) {
          console.error('Error updating order:', updateError);
          throw updateError;
        }
      }
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})