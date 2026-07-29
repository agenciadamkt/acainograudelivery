// CheckGrau — define o PIN de acesso do colaborador (após o 1º OTP ou reset).
// Exige a sessão autenticada (Authorization: Bearer <access_token>). Guarda o PIN
// como hash PBKDF2-HMAC-SHA256 (salt aleatório embutido), nunca em texto.
//
// Deploy: supabase functions deploy collaborator-set-pin --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const PBKDF2_ITERATIONS = 210000;
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));

/** Hash adaptativo com PBKDF2-HMAC-SHA256 nativo (Web Crypto — sem dependências). */
async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' }, km, 256);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(bits)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { pin } = await req.json();
    if (!/^\d{6}$/.test(String(pin ?? ''))) return json({ error: 'O PIN deve ter 6 dígitos.' }, 400);

    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Sessão ausente.' }, 401);

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });

    // valida a sessão e descobre o usuário
    const { data: userData, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !userData?.user) return json({ error: 'Sessão inválida.' }, 401);
    const userId = userData.user.id;

    const { data: collab } = await admin
      .from('checkgrau_collaborators').select('id').eq('auth_user_id', userId).maybeSingle();
    if (!collab) return json({ error: 'Colaborador não encontrado.' }, 403);

    const pin_hash = await hashPin(String(pin));

    const { error: upErr } = await admin
      .from('checkgrau_collaborators')
      .update({ has_pin: true, pin_hash, pin_attempts: 0, pin_locked_until: null })
      .eq('id', collab.id);
    if (upErr) return json({ error: 'Falha ao salvar o PIN.' }, 500);

    return json({ ok: true });
  } catch (e) {
    console.error('[collaborator-set-pin]', e);
    return json({ error: 'erro interno' }, 500);
  }
});
