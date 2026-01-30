
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
    const { token, amount, email, installments, storeId, description, paymentMethodId, payer } = await req.json()

    if (!storeId) {
      throw new Error('Store ID is required')
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch store's Mercado Pago Access Token
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('mercadopago_access_token')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      console.error('Error fetching store:', storeError);
      throw new Error('Store not found');
    }

    const accessToken = store.mercadopago_access_token;

    if (!accessToken) {
      throw new Error('Esta loja não possui o Mercado Pago configurado. Entre em contato com o estabelecimento.')
    }

    // Processar pagamento com Mercado Pago
    const paymentBody: any = {
      token,
      transaction_amount: amount,
      installments: installments || 1,
      description: description || 'Pedido - Açaí Delivery',
      statement_descriptor: 'ACAI APP',
      payer: {
        email,
        ...payer // Inclui identification, first_name, etc. enviados pelo frontend
      },
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
    };

    if (paymentMethodId) {
      paymentBody.payment_method_id = paymentMethodId;
    }

    const paymentResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify(paymentBody),
    })

    const paymentData = await paymentResponse.json()

    if (!paymentResponse.ok) {
      console.error('Mercado Pago Error:', paymentData);
      throw new Error(paymentData.message || 'Payment processing failed')
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