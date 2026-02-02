import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BTZAP_TOKEN = "4a0e432a-2717-42ed-a2cf-39127a768cd8";
const BTZAP_URL = "https://btzap.uazapi.com";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Gera um código numérico de 6 dígitos
function generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Formata o telefone para o padrão brasileiro
function formatPhone(phone: string): string {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { phone, name } = await req.json();

        if (!phone) {
            return new Response(
                JSON.stringify({ error: 'Telefone é obrigatório' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        // Limpar códigos antigos deste telefone
        const cleanPhone = phone.replace(/\D/g, '');
        await supabaseClient
            .from('whatsapp_verifications')
            .delete()
            .eq('phone', cleanPhone);

        // Gerar novo código
        const code = generateCode();

        // Salvar no banco
        const { error: insertError } = await supabaseClient
            .from('whatsapp_verifications')
            .insert({
                phone: cleanPhone,
                code: code,
                name: name || null,
                expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutos
            });

        if (insertError) {
            console.error('[Verification] Erro ao salvar código:', insertError);
            throw insertError;
        }

        // Enviar via WhatsApp com botões interativos
        const formattedPhone = formatPhone(cleanPhone);

        // Texto da mensagem conforme solicitado
        const messageText = `Seu código de verificação é *${code}*. Para sua segurança, não o compartilhe.`;

        console.log(`[Verification] Enviando código ${code} para ${formattedPhone}`);

        // Tentar enviar com botões interativos
        const btzapResponse = await fetch(`${BTZAP_URL}/send/buttons`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'token': BTZAP_TOKEN
            },
            body: JSON.stringify({
                number: formattedPhone,
                title: "Açaí no Grau",
                text: messageText,
                footer: "",
                buttons: [
                    {
                        id: `copy_${code}`,
                        text: "Copiar código"
                    },
                    {
                        id: "not_requested",
                        text: "Não pedi um código"
                    }
                ]
            })
        });

        const btzapResult = await btzapResponse.json();
        console.log('[Verification] Resultado BTZAP:', btzapResult);

        // Se botões não funcionarem, enviar como texto simples
        if (!btzapResponse.ok || btzapResult.error) {
            console.log('[Verification] Tentando enviar como texto simples...');

            const textResponse = await fetch(`${BTZAP_URL}/send/text`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': BTZAP_TOKEN
                },
                body: JSON.stringify({
                    number: formattedPhone,
                    text: messageText
                })
            });

            const textResult = await textResponse.json();
            if (!textResponse.ok || textResult.error) {
                throw new Error(textResult.message || 'Erro ao enviar WhatsApp');
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Código enviado com sucesso',
                // Não retornar o código por segurança!
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[Verification] Erro:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Erro ao enviar código' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
