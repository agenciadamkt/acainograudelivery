import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { phone, code } = await req.json();

        if (!phone || !code) {
            return new Response(
                JSON.stringify({ error: 'Telefone e código são obrigatórios' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseClient = createClient(supabaseUrl, supabaseKey);

        const cleanPhone = phone.replace(/\D/g, '');

        // Buscar código válido
        const { data: verification, error: fetchError } = await supabaseClient
            .from('whatsapp_verifications')
            .select('*')
            .eq('phone', cleanPhone)
            .eq('code', code)
            .eq('verified', false)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (fetchError || !verification) {
            console.log('[Verify] Código não encontrado ou expirado:', { phone: cleanPhone, code });
            return new Response(
                JSON.stringify({
                    valid: false,
                    error: 'Código inválido ou expirado'
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Marcar como verificado
        await supabaseClient
            .from('whatsapp_verifications')
            .update({ verified: true })
            .eq('id', verification.id);

        console.log('[Verify] Código verificado com sucesso:', cleanPhone);

        return new Response(
            JSON.stringify({
                valid: true,
                name: verification.name,
                phone: cleanPhone,
                message: 'Telefone verificado com sucesso!'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[Verify] Erro:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Erro ao verificar código' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
