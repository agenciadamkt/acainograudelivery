
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
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { orderId } = await req.json()

        if (!orderId) {
            throw new Error('Order ID is required')
        }

        // 1. Buscar o pedido
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .select('id, store_id, payment_status, mercadopago_payment_id, customer_notes')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            throw new Error('Order not found')
        }

        // 2. Descobrir o ID do pagamento (Coluna ou Notas)
        let paymentId = order.mercadopago_payment_id;
        if (!paymentId && order.customer_notes) {
            const match = order.customer_notes.match(/\[Pagamento ID: (\d+)\]/);
            if (match) {
                paymentId = match[1];
            }
        }

        if (!paymentId) {
            return new Response(
                JSON.stringify({ message: 'Payment ID not found in order', status: 'not_found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Buscar Token da Loja
        const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('mercadopago_access_token')
            .eq('id', order.store_id)
            .single()

        if (storeError || !store || !store.mercadopago_access_token) {
            throw new Error('Store configuration not found')
        }

        // 4. Consultar Mercado Pago
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${store.mercadopago_access_token}`
            }
        })

        if (!response.ok) {
            throw new Error('Failed to fetch payment status from Mercado Pago')
        }

        const paymentData = await response.json()
        const status = paymentData.status

        // 5. Atualizar Pedido se necessário
        if (status === 'approved' && order.payment_status !== 'paid') {
            await supabase
                .from('orders')
                .update({
                    payment_status: 'paid',
                    mercadopago_payment_id: paymentId // Garante que fica salvo na coluna certa agora
                })
                .eq('id', orderId)
        }

        return new Response(
            JSON.stringify({
                status: status,
                paid: status === 'approved',
                payment_id: paymentId
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
