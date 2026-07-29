// ============================================================================
// Edge Function: fiscal-empresa
// Gerencia a empresa fiscal (PlugNotas) de uma loja.
// Actions:
//   · set-token → cria/garante fiscal_companies e cifra o token PlugNotas
//   · sync      → cadastra/atualiza a empresa no PlugNotas a partir da store
//   · test      → valida o token consultando a empresa no PlugNotas
// Nenhum token trafega de volta ao cliente.
// ============================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { requireStaffOrService, jsonError } from '../_shared/auth.ts';
import { adminClient, getCompanyByStore, setToken, getToken, logCall } from '../_shared/fiscal.ts';
import { PlugNotasService } from '../_shared/plugnotas.ts';
import { FocusNfeService } from '../_shared/focusnfe.ts';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Payload de empresa do PlugNotas.
function buildEmpresaPayload(store: any) {
  return {
    cpfCnpj: (store.cnpj || '').replace(/\D/g, ''),
    inscricaoEstadual: store.inscricao_estadual || undefined,
    inscricaoMunicipal: store.inscricao_municipal || undefined,
    razaoSocial: store.razao_social || store.name,
    nomeFantasia: store.name,
    regimeTributario: store.regime_tributario ?? undefined,
    email: store.email || undefined,
    telefone: (store.phone || '').replace(/\D/g, '') || undefined,
    endereco: {
      logradouro: store.address || undefined,
      bairro: store.neighborhood || undefined,
      cep: (store.zip_code || '').replace(/\D/g, '') || undefined,
      municipio: store.city || undefined,
      uf: store.state || undefined,
      codigoCidade: store.codigo_municipio_ibge || undefined,
    },
  };
}

// Payload de empresa da Focus NFe. Obrigatórios (doc): razao_social, cnpj, inscricao_estadual, uf.
function buildFocusEmpresa(store: any) {
  return {
    razao_social: store.razao_social || store.name,
    nome_fantasia: store.name,
    cnpj: (store.cnpj || '').replace(/\D/g, ''),
    inscricao_estadual: store.inscricao_estadual || undefined,
    uf: store.state || undefined,
    regime_tributario: store.regime_tributario ? String(store.regime_tributario) : undefined,
    email: store.email || undefined,
    telefone: (store.phone || '').replace(/\D/g, '') || undefined,
    logradouro: store.address || undefined,
    bairro: store.neighborhood || undefined,
    cep: (store.zip_code || '').replace(/\D/g, '') || undefined,
    municipio: store.city || undefined,
    codigo_municipio: store.codigo_municipio_ibge || undefined,
    habilita_nfce: true,
    habilita_nfe: true,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authError = await requireStaffOrService(req);
  if (authError) return authError;

  try {
    const { action, storeId, token } = await req.json();
    if (!storeId) return jsonError('storeId é obrigatório', 400);
    const db = adminClient();

    // Garante a linha fiscal_companies para a loja
    let company = await getCompanyByStore(db, storeId);
    if (!company) {
      const { data: created, error } = await db
        .from('fiscal_companies')
        .insert({ store_id: storeId })
        .select('id, store_id, plugnotas_company_id, ambiente, timeout_seg, auto_emitir, webhook_secret, ativo, provider')
        .single();
      if (error) return jsonError('Falha ao criar empresa fiscal: ' + error.message, 500);
      company = created as any;
    }

    // ── set-token ──────────────────────────────────────────────────────────
    if (action === 'set-token') {
      if (!token || String(token).trim().length < 8) return jsonError('Token inválido', 400);
      await setToken(db, company.id, String(token).trim());
      return json({ ok: true, message: 'Token salvo com segurança.' });
    }

    const isFocus = (company as any).provider === 'focusnfe';
    const provLabel = isFocus ? 'Focus NFe' : 'PlugNotas';

    // ── sync ─────────────────────────────────────────────────────────────────
    if (action === 'sync') {
      const tk = await getToken(db, company.id);
      if (!tk) return jsonError(`Configure o token do ${provLabel} antes de sincronizar.`, 400);

      const { data: store } = await db.from('stores').select('*').eq('id', storeId).single();
      if (!store) return jsonError('Loja não encontrada', 404);
      if (!store.cnpj) return jsonError('A loja precisa ter CNPJ preenchido (Dados da Loja).', 400);
      if (isFocus && (!store.inscricao_estadual || !store.state)) return jsonError('Focus NFe exige Inscrição Estadual e UF da loja (Dados da Loja).', 400);
      const cnpj = (store.cnpj || '').replace(/\D/g, '');

      let res: any; let payload: any; let providerCompanyId: string;
      if (isFocus) {
        const fc = new FocusNfeService(tk, company.ambiente, company.timeout_seg);
        payload = buildFocusEmpresa(store);
        const existing = await fc.consultarEmpresa(cnpj);
        const existingId = existing.ok && (existing.data?.[0]?.id || existing.data?.id);
        res = existingId ? await fc.atualizarEmpresa(existingId, payload) : await fc.cadastrarEmpresa(payload);
        providerCompanyId = String((res.data && (res.data.id || res.data.empresa?.id)) || existingId || cnpj);
      } else {
        const pn = new PlugNotasService(tk, company.ambiente, company.timeout_seg);
        payload = buildEmpresaPayload(store);
        const existing = await pn.consultarEmpresa(cnpj);
        res = existing.ok ? await pn.atualizarEmpresa(cnpj, payload) : await pn.cadastrarEmpresa(payload);
        providerCompanyId = String((res.data && (res.data.id || res.data.companyId)) || cnpj);
      }

      await logCall(db, { store_id: storeId, endpoint: res.endpoint, metodo: res.method, request: payload, response: res.data, status_code: res.status, erro: res.error, duracao_ms: res.durationMs });
      if (!res.ok) return jsonError(`${provLabel} recusou o cadastro: ` + (res.error || JSON.stringify(res.data)), 502);

      await db.from('fiscal_companies').update({ plugnotas_company_id: providerCompanyId, ultimo_sync: new Date().toISOString() }).eq('id', company.id);
      return json({ ok: true, plugnotas_company_id: providerCompanyId });
    }

    // ── test ─────────────────────────────────────────────────────────────────
    if (action === 'test') {
      const tk = await getToken(db, company.id);
      if (!tk) return jsonError('Nenhum token configurado.', 400);
      const { data: store } = await db.from('stores').select('cnpj').eq('id', storeId).single();
      const cnpj = (store?.cnpj || '').replace(/\D/g, '');
      const res = isFocus
        ? await new FocusNfeService(tk, company.ambiente, company.timeout_seg).consultarEmpresa(cnpj)
        : await new PlugNotasService(tk, company.ambiente, company.timeout_seg).consultarEmpresa(cnpj);
      await logCall(db, { store_id: storeId, endpoint: res.endpoint, metodo: res.method, response: res.data, status_code: res.status, erro: res.error, duracao_ms: res.durationMs });
      const authOk = res.status !== 401 && res.status !== 403 && res.status !== 0;
      return json({ ok: authOk, status: res.status, message: authOk ? `Conexão com o ${provLabel} OK.` : `Token rejeitado pelo ${provLabel}.` });
    }

    return jsonError('Ação desconhecida: ' + action, 400);
  } catch (e) {
    return jsonError((e as Error).message, 500);
  }
});
