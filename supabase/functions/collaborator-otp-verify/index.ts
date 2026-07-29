// CheckGrau — verifica o OTP do colaborador e devolve uma sessão Supabase real.
// Fluxo: valida o código (whatsapp_verifications) → garante um usuário Supabase por
// telefone (email sintético) vinculado ao colaborador → gera sessão (senha efêmera →
// signInWithPassword) → devolve tokens p/ o app fazer setSession.
//
// Deploy: supabase functions deploy collaborator-otp-verify

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { whatsapp, code } = await req.json();
    const digits = String(whatsapp ?? '').replace(/\D/g, '');
    if (!digits || !code) return json({ error: 'whatsapp e code obrigatórios' }, 400);

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });

    // 1) valida o código
    const { data: verif } = await admin
      .from('whatsapp_verifications')
      .select('id')
      .eq('phone', digits).eq('code', String(code)).eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (!verif) return json({ error: 'Código inválido ou expirado.' }, 401);
    await admin.from('whatsapp_verifications').update({ verified: true }).eq('id', verif.id);

    // 2) acha o colaborador (compara por dígitos, tolerante ao prefixo 55)
    const localDigits = (s: string) => {
      let d = String(s ?? '').replace(/\D/g, '');
      if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
      return d;
    };
    const inputLocal = localDigits(whatsapp);
    const { data: collabs } = await admin
      .from('checkgrau_collaborators')
      .select('id, name, cargo, status, auth_user_id, whatsapp, has_pin');
    const collab = (collabs ?? []).find((c: any) => localDigits(c.whatsapp) === inputLocal);
    if (!collab) return json({ error: 'WhatsApp não cadastrado como colaborador.' }, 403);
    if (collab.status !== 'ativo') return json({ error: `Colaborador ${collab.status}.` }, 403);

    // 3) garante o usuário Supabase (email sintético por telefone)
    const email = `cg${digits}@checkgrau.local`;
    let userId = collab.auth_user_id as string | null;
    if (!userId) {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, email_confirm: true,
        user_metadata: { checkgrau_collaborator: true, whatsapp: digits, name: collab.name },
      });
      if (created?.user) {
        userId = created.user.id;
      } else if (cErr) {
        // já existe: localiza pelo email
        const { data: list } = await admin.auth.admin.listUsers();
        userId = (list?.users ?? []).find((u: any) => u.email === email)?.id ?? null;
      }
      if (!userId) return json({ error: 'Falha ao preparar o acesso.' }, 500);
      await admin.from('checkgrau_collaborators').update({ auth_user_id: userId }).eq('id', collab.id);
    }

    // 4) sessão: define senha efêmera e faz login server-side p/ obter tokens
    const tempPass = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    await admin.auth.admin.updateUserById(userId, { password: tempPass });
    const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY') ?? '', { auth: { persistSession: false } });
    const { data: signIn, error: sErr } = await anon.auth.signInWithPassword({ email, password: tempPass });
    if (sErr || !signIn?.session) return json({ error: 'Falha ao iniciar sessão.' }, 500);

    // 5) lojas do colaborador
    const { data: links } = await admin
      .from('checkgrau_collaborator_stores')
      .select('store:stores(id, name, city)')
      .eq('collaborator_id', collab.id);
    const stores = (links ?? []).map((l: any) => l.store).filter(Boolean);

    return json({
      access_token: signIn.session.access_token,
      refresh_token: signIn.session.refresh_token,
      collaborator: { id: collab.id, name: collab.name, cargo: collab.cargo },
      stores,
      needs_store_selection: stores.length > 1,
      has_pin: !!collab.has_pin,
    });
  } catch (e) {
    console.error('[collaborator-otp-verify]', e);
    return json({ error: 'erro interno' }, 500);
  }
});
