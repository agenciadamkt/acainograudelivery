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
    const { token, amount, email, installments } = await req.json()

    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!accessToken) {
      throw new Error('Mercado Pago access token not configured')
    }

    // Processar pagamento com Mercado Pago
    const paymentResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        token,
        transaction_amount: amount,
        installments: installments || 1,
        payment_method_id: 'visa', // Será detectado automaticamente pelo MP
        payer: {
          email,
        },
        description: 'Pedido - Açaí Delivery',
      }),
    })

    const paymentData = await paymentResponse.json()

    if (!paymentResponse.ok) {
      throw new Error(paymentData.message || 'Payment failed')
    }

    return new Response(
      JSON.stringify({
        payment_id: paymentData.id,
        status: paymentData.status,
        status_detail: paymentData.status_detail,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})