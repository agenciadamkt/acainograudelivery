
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

    const numericAmount = Number(amount)
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error('Valor do pedido inválido. Por favor, refaça o pedido.')
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

    // Detectar se é PIX pelo payment_method_id
    const isPix = paymentMethodId === 'pix';

    // Construir payload de acordo com o tipo de pagamento
    let paymentBody: any;

    if (isPix) {
      // PIX: NÃO enviar token nem installments — a API rejeita se receber token nulo
      paymentBody = {
        transaction_amount: numericAmount,
        payment_method_id: 'pix',
        description: description || 'Pedido - Açaí Delivery',
        statement_descriptor: 'ACAI APP',
        payer: {
          email,
          ...(payer?.identification ? { identification: payer.identification } : {}),
          ...(payer?.first_name ? { first_name: payer.first_name } : {}),
          ...(payer?.last_name ? { last_name: payer.last_name } : {}),
        },
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
      };
    } else {
      // Cartão de Crédito/Débito: enviar token, installments, etc.
      paymentBody = {
        token,
        transaction_amount: numericAmount,
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
    }

    console.log(`[process-payment] Tipo: ${isPix ? 'PIX' : 'Cartão'}, Valor: ${numericAmount}, Store: ${storeId}`);

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
      console.error('Mercado Pago Error:', JSON.stringify(paymentData));
      // Melhorar mensagem de erro para o usuário
      const mpMessage = paymentData.message || '';
      const mpCause = paymentData.cause?.[0]?.description || '';
      throw new Error(mpCause || mpMessage || 'Falha ao processar pagamento. Tente novamente.')
    }

    // Resposta — incluir dados extras para PIX (QR code, copia-e-cola)
    const responseBody: any = {
      payment_id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      payment_type_id: paymentData.payment_type_id, // 'credit_card', 'debit_card', 'bank_transfer' (pix), etc.
    };

    // Para PIX, incluir dados do QR Code para exibição no frontend
    if (isPix && paymentData.point_of_interaction) {
      responseBody.pix_qr_code = paymentData.point_of_interaction.transaction_data?.qr_code;
      responseBody.pix_qr_code_base64 = paymentData.point_of_interaction.transaction_data?.qr_code_base64;
      responseBody.pix_ticket_url = paymentData.point_of_interaction.transaction_data?.ticket_url;
    }

    return new Response(
      JSON.stringify(responseBody),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    console.error('[process-payment] Error:', errorMessage);
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