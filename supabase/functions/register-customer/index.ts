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
        const { phone, name, password, email, address, birthdate } = await req.json();

        if (!phone || !name || !password) {
            return new Response(
                JSON.stringify({ error: 'Telefone, nome e senha são obrigatórios' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const supabaseClient = createClient(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // Verificar se o telefone já foi verificado
        const cleanPhone = phone.replace(/\D/g, '');
        const { data: verification, error: verifyError } = await supabaseClient
            .from('whatsapp_verifications')
            .select('*')
            .eq('phone', cleanPhone)
            .eq('verified', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (verifyError || !verification) {
            console.log('[Register] Telefone não verificado:', cleanPhone);
            return new Response(
                JSON.stringify({ error: 'Telefone não verificado. Por favor, verifique seu WhatsApp primeiro.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Verificar se o telefone já está cadastrado
        const { data: existingCustomer } = await supabaseClient
            .from('customers')
            .select('phone')
            .eq('phone', cleanPhone)
            .limit(1)
            .single();

        if (existingCustomer) {
            return new Response(
                JSON.stringify({ error: 'Este telefone já está cadastrado. Faça login.' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Usar email real ou criar um fictício baseado no telefone
        const userEmail = email || `${cleanPhone}@acainograu.app`;

        // Criar usuário com admin API (já confirmado automaticamente!)
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
            email: userEmail,
            password: password,
            email_confirm: true, // Auto-confirma o email!
            user_metadata: {
                name: name,
                phone: cleanPhone,
            }
        });

        if (authError) {
            console.error('[Register] Erro ao criar usuário:', authError);

            if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
                return new Response(
                    JSON.stringify({ error: 'Este email já está cadastrado.' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            return new Response(
                JSON.stringify({ error: authError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const userId = authData.user?.id;

        // Criar registro de customer
        const { error: customerError } = await supabaseClient
            .from('customers')
            .insert({
                id: userId,
                user_id: userId,
                name: name,
                phone: cleanPhone,
                email: email || null,
                birthdate: birthdate || null,
                default_address: address || null,
            });

        if (customerError) {
            console.error('[Register] Erro ao criar customer:', customerError);
            // Não falhar - o trigger handle_new_user pode já ter criado
        }

        // Limpar verificações usadas
        await supabaseClient
            .from('whatsapp_verifications')
            .delete()
            .eq('phone', cleanPhone);

        console.log('[Register] Usuário criado com sucesso:', userId);

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Conta criada com sucesso!',
                email: userEmail // Retornar o email para usar no login
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[Register] Erro:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Erro ao criar conta' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
