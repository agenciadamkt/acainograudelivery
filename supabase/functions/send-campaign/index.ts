import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BTZAP_TOKEN = "4a0e432a-2717-42ed-a2cf-39127a768cd8";
const BTZAP_URL = "https://btzap.uazapi.com";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        const { segment, campaign_data, scheduled_campaign_id } = await req.json();

        console.log(`[Send Campaign] 📤 Iniciando envio para segmento: ${segment}`);

        // 1. Buscar clientes baseado no segmento
        let query = supabaseClient
            .from('customers')
            .select('id, name, phone, created_at, birth_date, orders(created_at)');

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Aplicar filtros baseados no segmento
        if (segment === 'new') {
            query = query.gte('created_at', sevenDaysAgo.toISOString());
        } else if (segment === 'birthday') {
            // Aniversariantes do dia
            const month = now.getMonth() + 1;
            const day = now.getDate();
            query = query.not('birth_date', 'is', null);
            // Filtro de aniversariantes será feito em memória devido às limitações do Postgres
        }

        const { data: customers, error: customersError } = await query;

        if (customersError) throw customersError;
        if (!customers || customers.length === 0) {
            return new Response(
                JSON.stringify({ success: false, message: 'Nenhum cliente encontrado no segmento' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Filtrar clientes baseado no segmento
        let filteredCustomers = customers;

        if (segment === 'inactive') {
            filteredCustomers = customers.filter(customer => {
                const orders = customer.orders || [];
                if (orders.length === 0) return true;
                const lastOrderDate = new Date(orders[0].created_at);
                return lastOrderDate < thirtyDaysAgo;
            });
        } else if (segment === 'birthday') {
            const month = now.getMonth() + 1;
            const day = now.getDate();
            filteredCustomers = customers.filter(customer => {
                if (!customer.birth_date) return false;
                const birthDate = new Date(customer.birth_date);
                return birthDate.getMonth() + 1 === month && birthDate.getDate() === day;
            });
        }

        console.log(`[Send Campaign] 👥 ${filteredCustomers.length} clientes encontrados`);

        // 2. Atualizar campanha agendada se existir
        if (scheduled_campaign_id) {
            await supabaseClient
                .from('scheduled_campaigns')
                .update({
                    status: 'sending',
                    total_recipients: filteredCustomers.length
                })
                .eq('id', scheduled_campaign_id);
        }

        // 3. Enviar mensagens em lote (batch de 10 para evitar sobrecarga)
        let sentCount = 0;
        let failedCount = 0;
        const batchSize = 10;
        const delayBetweenBatches = 2000; // 2 segundos

        for (let i = 0; i < filteredCustomers.length; i += batchSize) {
            const batch = filteredCustomers.slice(i, i + batchSize);

            const sendPromises = batch.map(async (customer) => {
                try {
                    const phone = customer.phone;
                    if (!phone) return { success: false, reason: 'no_phone' };

                    // Personalizar mensagem
                    let personalizedMessage = campaign_data.text.replace(/\{name\}/g, customer.name || 'Cliente');

                    // Se for aniversariante, adicionar idade
                    if (segment === 'birthday' && customer.birth_date) {
                        const age = now.getFullYear() - new Date(customer.birth_date).getFullYear();
                        personalizedMessage = personalizedMessage.replace(/\{age\}/g, age.toString());
                    }

                    const cleanPhone = phone.replace(/\D/g, '');
                    const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

                    const body: any = {
                        number: formattedPhone,
                        type: 'button',
                        text: personalizedMessage,
                        choices: campaign_data.choices || [],
                        footerText: campaign_data.footerText || "Açaí no Grau"
                    };

                    if (campaign_data.imageButton) {
                        body.imageButton = campaign_data.imageButton;
                    }

                    const btzapResponse = await fetch(`${BTZAP_URL}/send/menu`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'token': BTZAP_TOKEN },
                        body: JSON.stringify(body)
                    });

                    const result = await btzapResponse.json();

                    // Registrar log
                    await supabaseClient.from('marketing_logs').insert({
                        customer_id: customer.id,
                        status: 'sent',
                        segment: segment,
                        campaign_type: scheduled_campaign_id ? 'scheduled' : 'manual',
                        details: { btzap_result: result, scheduled_campaign_id }
                    });

                    return { success: true };
                } catch (error: any) {
                    console.error(`Erro ao enviar para ${customer.name}:`, error.message);

                    // Registrar log de erro
                    await supabaseClient.from('marketing_logs').insert({
                        customer_id: customer.id,
                        status: 'failed',
                        segment: segment,
                        campaign_type: scheduled_campaign_id ? 'scheduled' : 'manual',
                        details: { error: error.message }
                    });

                    return { success: false, reason: error.message };
                }
            });

            const results = await Promise.all(sendPromises);
            sentCount += results.filter(r => r.success).length;
            failedCount += results.filter(r => !r.success).length;

            // Atualizar progresso da campanha agendada
            if (scheduled_campaign_id) {
                await supabaseClient
                    .from('scheduled_campaigns')
                    .update({
                        sent_count: sentCount,
                        failed_count: failedCount
                    })
                    .eq('id', scheduled_campaign_id);
            }

            // Aguardar entre lotes
            if (i + batchSize < filteredCustomers.length) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }

        // 4. Finalizar campanha agendada
        if (scheduled_campaign_id) {
            await supabaseClient
                .from('scheduled_campaigns')
                .update({
                    status: failedCount === filteredCustomers.length ? 'failed' : 'sent',
                    sent_count: sentCount,
                    failed_count: failedCount
                })
                .eq('id', scheduled_campaign_id);
        }

        console.log(`[Send Campaign] ✅ Concluído: ${sentCount} enviados, ${failedCount} falhas`);

        return new Response(
            JSON.stringify({
                success: true,
                total: filteredCustomers.length,
                sent: sentCount,
                failed: failedCount
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[Send Campaign] ❌ Erro:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
