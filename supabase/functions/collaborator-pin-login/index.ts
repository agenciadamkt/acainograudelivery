// CheckGrau — login do colaborador por WhatsApp + PIN (sem OTP).
// Verifica o PIN (hash), limita tentativas e gera uma sessão Supabase real
// (senha efêmera → signInWithPassword), como o fluxo de OTP.
//
// Deploy: supabase functions deploy collaborator-pin-login  (Verify JWT: OFF)

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

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/** Verifica um PIN contra o hash "pbkdf2$iter$salt$hash" (constant-time). */
async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = String(stored ?? '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = parseInt(parts[1], 10);
  const salt = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
  const expected = Uint8Array.from(atob(parts[3]), (c) => c.charCodeAt(0));
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const derived = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, km, expected.length * 8));
  if (derived.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i];
  return diff === 0;
}

const localDigits = (s: string) => {
  let d = String(s ?? '').replace(/\D/g, '');
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  return d;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { whatsapp, pin } = await req.json();
    const digits = String(whatsapp ?? '').replace(/\D/g, '');
    if (!digits || !/^\d{6}$/.test(String(pin ?? ''))) return json({ error: 'WhatsApp e PIN (6 dígitos) obrigatórios.' }, 400);

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });

    // acha o colaborador pelo telefone (tolerante ao prefixo 55)
    const inputLocal = localDigits(whatsapp);
    const { data: collabs } = await admin
      .from('checkgrau_collaborators')
      .select('id, name, cargo, status, auth_user_id, whatsapp, has_pin, pin_hash, pin_attempts, pin_locked_until');
    const collab = (collabs ?? []).find((c: any) => localDigits(c.whatsapp) === inputLocal);
    if (!collab) return json({ error: 'WhatsApp não cadastrado.' }, 403);
    if (collab.status !== 'ativo') return json({ error: `Colaborador ${collab.status}.` }, 403);
    if (!collab.has_pin || !collab.pin_hash) return json({ error: 'PIN não configurado. Entre com o código do WhatsApp.', code: 'NO_PIN' }, 409);
    if (collab.pin_locked_until && new Date(collab.pin_locked_until) > new Date()) {
      return json({ error: 'Muitas tentativas. Tente novamente em alguns minutos ou use o código.' }, 429);
    }

    // verifica o PIN (PBKDF2, comparação constant-time)
    const ok = await verifyPin(String(pin), String(collab.pin_hash));
    if (!ok) {
      const attempts = (collab.pin_attempts ?? 0) + 1;
      const locked = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() : null;
      await admin.from('checkgrau_collaborators')
        .update({ pin_attempts: locked ? 0 : attempts, pin_locked_until: locked })
        .eq('id', collab.id);
      return json({ error: locked ? 'PIN incorreto. Acesso bloqueado por alguns minutos.' : 'PIN incorreto.' }, 401);
    }

    // sucesso → zera tentativas e gera sessão
    await admin.from('checkgrau_collaborators').update({ pin_attempts: 0, pin_locked_until: null }).eq('id', collab.id);

    const email = `cg${digits}@checkgrau.local`;
    if (!collab.auth_user_id) return json({ error: 'Acesso não preparado. Entre com o código do WhatsApp.', code: 'NO_PIN' }, 409);

    const tempPass = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    await admin.auth.admin.updateUserById(collab.auth_user_id, { password: tempPass });
    const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { auth: { persistSession: false } });
    const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({ email, password: tempPass });
    if (sErr || !signIn?.session) return json({ error: 'Falha ao iniciar sessão.' }, 500);

    const { data: links } = await admin
      .from('checkgrau_collaborator_stores').select('store:stores(id, name, city)').eq('collaborator_id', collab.id);
    const stores = (links ?? []).map((l: any) => l.store).filter(Boolean);

    return json({
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      collaborator: { id: collab.id, name: collab.name, cargo: collab.cargo },
      stores,
      needs_store_selection: stores.length > 1,
    });
  } catch (e) {
    console.error('[collaborator-pin-login]', e);
    return json({ error: 'erro interno' }, 500);
  }
});
