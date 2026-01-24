import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, phone } = await req.json();

    if (!email && !phone) {
      return new Response(
        JSON.stringify({ error: 'Email ou telefone são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const conflicts: { email?: boolean; phone?: boolean } = {};

    // Verificar email
    if (email) {
      const { data: emailExists } = await supabase
        .from('customers')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (emailExists) {
        conflicts.email = true;
      }
    }

    // Verificar telefone
    if (phone) {
      const { data: phoneExists } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (phoneExists) {
        conflicts.phone = true;
      }
    }

    const available = Object.keys(conflicts).length === 0;

    console.log('Validation result:', { email, phone, available, conflicts });

    return new Response(
      JSON.stringify({ available, conflicts }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao validar dados' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
