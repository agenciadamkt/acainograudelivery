import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { requireStaffOrService } from "../_shared/auth.ts";

const BTZAP_TOKEN = Deno.env.get('BTZAP_TOKEN') ?? '';
const BTZAP_URL = "https://acainograu.uazapi.com";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    // Aciona apenas via cron (service_role) ou staff autenticado.
    const authError = await requireStaffOrService(req);
    if (authError) return authError;

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        console.log('[Remarketing] 🕒 Iniciando automação de 48h...');

        // 1. Buscar pedidos entregues entre 47h e 49h atrás
        const fortySevenHoursAgo = new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString();
        const fortyNineHoursAgo = new Date(Date.now() - 49 * 60 * 60 * 1000).toISOString();

        const { data: recentOrders, error: ordersError } = await supabaseClient
            .from('orders')
            .select(`
                id,
                order_number,
                status,
                delivered_at,
                customer:customers(id, name, phone)
            `)
            .eq('status', 'delivered')
            .gte('updated_at', fortyNineHoursAgo)
            .lte('updated_at', fortySevenHoursAgo);

        if (ordersError) throw ordersError;
        if (!recentOrders || recentOrders.length === 0) {
            console.log('[Remarketing] ✅ Nenhum pedido encontrado na janela de 48h.');
            return new Response(JSON.stringify({ message: 'No orders found for remarketing' }), { status: 200 });
        }

        console.log(`[Remarketing] 📦 Encontrados ${recentOrders.length} pedidos para processar.`);

        for (const order of recentOrders) {
            const customerId = order.customer?.id;
            const phone = order.customer?.phone;
            if (!customerId || !phone) continue;

            // 2. Verificar se já recebeu remarketing para este pedido recentemente (nos últimos 3 dias)
            const { data: existingLog } = await supabaseClient
                .from('marketing_logs')
                .select('id')
                .eq('customer_id', customerId)
                .gte('sent_at', new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
                .limit(1);

            if (existingLog && existingLog.length > 0) {
                console.log(`[Remarketing] ⏭️ Pulando cliente ${order.customer.name} (já recebeu contato recente)`);
                continue;
            }

            // 3. Preparar e enviar mensagem de Menu Interativo
            const cleanPhone = phone.replace(/\D/g, '');
            const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
            const message = `Olá ${order.customer.name}! Faz dois dias que você provou nosso açaí. 🍦\n\nA saudade bateu? Que tal pedir de novo hoje?`;

            const body = {
                number: formattedPhone,
                type: 'button',
                text: message,
                choices: [
                    "Pedir Agora 🍦|order_now",
                    "Ver Cardápio |view_menu"
                ],
                footerText: "Açaí no Grau - Remarketing"
            };

            const btzapResponse = await fetch(`${BTZAP_URL}/send/menu`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'token': BTZAP_TOKEN },
                body: JSON.stringify(body)
            });

            const result = await btzapResponse.json();

            // 4. Registrar log
            await supabaseClient.from('marketing_logs').insert({
                customer_id: customerId,
                status: 'sent',
                details: { order_id: order.id, btzap_result: result }
            });

            console.log(`[Remarketing] 🚀 Enviado para ${order.customer.name}`);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (error: any) {
        console.error('[Remarketing] ❌ Erro:', error);
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
});
