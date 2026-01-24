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

      // Buscar detalhes do pagamento
      const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
      const paymentResponse = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      )

      const paymentData = await paymentResponse.json()

      // Atualizar status do pedido no banco
      const { error } = await supabase
        .from('orders')
        .update({
          mercadopago_status: paymentData.status,
          payment_status: paymentData.status === 'approved' ? 'paid' : 'pending',
        })
        .eq('mercadopago_payment_id', paymentId)

      if (error) {
        throw error
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