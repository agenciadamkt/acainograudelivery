// GrauOS Operações 2.0 — IA Operacional (M5) via OpenAI (GPT-4o-mini, visão)
// Ações: validate_photo | compare_reference | daily_summary
// Deploy: supabase functions deploy operations-ai --no-verify-jwt  (usa OPENAI_API_KEY)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const MODEL = 'gpt-4o-mini';
const DEFAULT_UAZ_URL = 'https://acainograu.uazapi.com';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Anti-SSRF: só aceita imagens do Storage do próprio projeto Supabase (https).
function assertSafeImageUrl(url: string) {
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error('URL de imagem inválida'); }
  const supaHost = new URL(Deno.env.get('SUPABASE_URL') ?? 'https://invalid.local').host;
  if (parsed.protocol !== 'https:' || parsed.host !== supaHost || !parsed.pathname.startsWith('/storage/v1/object/')) {
    throw new Error('URL de imagem não permitida (use o Storage do projeto)');
  }
}

async function fetchImageB64(url: string): Promise<{ mime: string; base64: string }> {
  assertSafeImageUrl(url);
  const r = await fetch(url, { redirect: 'manual' });
  if (!r.ok) throw new Error(`imagem indisponível (${r.status})`);
  const buf = new Uint8Array(await r.arrayBuffer());
  let binary = '';
  for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
  return { mime: r.headers.get('content-type') || 'image/jpeg', base64: btoa(binary) };
}

async function askAI(prompt: string, images: { mime: string; base64: string }[], jsonMode = false): Promise<string> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY não configurada.');
  const content: any[] = [{ type: 'text', text: prompt }];
  for (const im of images) content.push({ type: 'image_url', image_url: { url: `data:${im.mime};base64,${im.base64}`, detail: 'high' } });
  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content }],
      temperature: 0.2,
      max_tokens: 1024,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI erro ${resp.status}: ${await resp.text()}`);
  const result = await resp.json();
  return result.choices?.[0]?.message?.content ?? '';
}

function parseJson(text: string): any {
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try { return JSON.parse(clean); } catch { return null; }
}

async function sendWhatsApp(supabase: any, storeId: string, phone: string, text: string) {
  let uazUrl = DEFAULT_UAZ_URL;
  let token = Deno.env.get('BTZAP_TOKEN') ?? '';
  const { data: store } = await supabase.from('stores').select('franchisee_user_id').eq('id', storeId).maybeSingle();
  if (store?.franchisee_user_id) {
    const { data: intg } = await supabase.from('integrations').select('config, active')
      .eq('name', 'uazapi_whatsapp').eq('franchisee_id', store.franchisee_user_id).maybeSingle();
    if (intg?.active && intg.config) { uazUrl = intg.config.base_url || uazUrl; token = intg.config.token || token; }
  }
  const num = (phone || '').replace(/\D/g, '');
  await fetch(`${uazUrl.replace(/\/$/, '')}/send/text`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', token },
    body: JSON.stringify({ number: num.startsWith('55') ? num : `55${num}`, text }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // ── Autenticação: exige um usuário logado válido ───────────────────
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    const { data: userData, error: authErr } = await supabase.auth.getUser(jwt);
    const userId = userData?.user?.id;
    const userEmail = userData?.user?.email ?? '';
    if (!userId) {
      // Diagnóstico: revela se o token chega (jwt_len/prefix) e por que o
      // getUser recusou (detail) — sem vazar o token.
      return json({
        error: 'não autenticado',
        detail: authErr?.message ?? null,
        jwt_len: jwt.length,
        jwt_prefix: jwt.slice(0, 3),
      }, 401);
    }

    // Admin master (mesma regra da função is_admin_master do app)
    let isAdmin = userEmail === 'agenciadamkt@gmail.com';
    if (!isAdmin && userEmail) {
      const { data: fin } = await supabase.from('financial_users')
        .select('role, active').eq('email', userEmail).eq('role', 'admin').eq('active', true).maybeSingle();
      isAdmin = !!fin;
    }

    const payload = await req.json();
    const action = payload.action as string;

    // ── Autorização: o usuário precisa ter acesso à unidade ────────────
    async function assertStoreAccess(storeId: string | null | undefined) {
      if (!storeId || isAdmin) return;
      const { data: member } = await supabase
        .from('user_unidades').select('id')
        .eq('usuario_id', userId).eq('store_id', storeId).maybeSingle();
      if (!member) throw new Error('forbidden');
    }

    // ── Validação de foto ──────────────────────────────────────────────
    if (action === 'validate_photo') {
      await assertStoreAccess(payload.store_id);
      const img = await fetchImageB64(payload.photo_url);
      const prompt =
        `Você é um auditor de operações de food service. Avalie a foto para o item "${payload.item_name ?? 'tarefa'}", ` +
        `considerando limpeza, organização e conformidade com boas práticas. ` +
        `Responda APENAS um JSON, sem markdown: ` +
        `{"approved": boolean, "score": inteiro 0-100, "reason": "frase curta em português", ` +
        `"fraud_suspected": boolean (true se parece print de tela, imagem reutilizada ou manipulada)}.`;
      const text = await askAI(prompt, [img], true);
      const parsed = parseJson(text) ?? { approved: null, score: null, reason: text, fraud_suspected: false };
      await supabase.from('ai_analysis').insert({
        store_id: payload.store_id ?? null, type: 'photo_validation',
        execution_item_id: payload.execution_item_id ?? null,
        approved: parsed.approved ?? null, score: parsed.score ?? null, reason: parsed.reason ?? null, raw: parsed,
      });
      return json(parsed);
    }

    // ── Comparação com referência ──────────────────────────────────────
    if (action === 'compare_reference') {
      await assertStoreAccess(payload.store_id);
      const [ref, sent] = await Promise.all([
        fetchImageB64(payload.reference_image_url), fetchImageB64(payload.photo_url),
      ]);
      const prompt =
        `A PRIMEIRA imagem é a REFERÊNCIA do padrão para "${payload.item_name ?? 'tarefa'}". ` +
        `A SEGUNDA é a foto enviada pelo operador. Compare-as. ` +
        `Responda APENAS um JSON, sem markdown: {"approved": boolean (true se CONFORME com a referência), ` +
        `"score": inteiro 0-100, "reason": "frase curta em português"}.`;
      const text = await askAI(prompt, [ref, sent], true);
      const parsed = parseJson(text) ?? { approved: null, score: null, reason: text };
      await supabase.from('ai_analysis').insert({
        store_id: payload.store_id ?? null, type: 'comparison',
        execution_item_id: payload.execution_item_id ?? null,
        approved: parsed.approved ?? null, score: parsed.score ?? null, reason: parsed.reason ?? null, raw: parsed,
      });
      return json(parsed);
    }

    // ── Resumo gerencial do dia (uma ou várias unidades) ───────────────
    if (action === 'daily_summary') {
      const storeIds: string[] = Array.isArray(payload.store_ids) && payload.store_ids.length
        ? payload.store_ids
        : (payload.store_id ? [payload.store_id] : []);
      if (storeIds.length === 0) return json({ error: 'nenhuma loja informada' }, 400);
      for (const sid of storeIds) await assertStoreAccess(sid);

      const date = payload.date ?? new Date().toISOString().slice(0, 10);
      const { data: storesData } = await supabase.from('stores').select('id, name').in('id', storeIds);
      const nameById = new Map((storesData ?? []).map((s: any) => [s.id, s.name]));

      const { data: schedules } = await supabase
        .from('inventory_checklist_schedules')
        .select('store_id, status, critical, deadline_at, execution:inventory_checklist_executions(items:inventory_checklist_execution_items(passed))')
        .in('store_id', storeIds).eq('scheduled_date', date);

      const now = Date.now();
      const blank = () => ({ total: 0, executed: 0, missed: 0, critical: 0, outOfStandard: 0 });
      const overall = blank();
      const perStore = new Map<string, ReturnType<typeof blank>>();
      for (const sid of storeIds) perStore.set(sid, blank());

      for (const s of schedules ?? []) {
        const st = perStore.get(s.store_id) ?? blank();
        const overdue = (s.status === 'PENDING' || s.status === 'IN_PROGRESS') && new Date(s.deadline_at).getTime() < now;
        const effMissed = s.status === 'MISSED' || overdue;
        const exec = Array.isArray(s.execution) ? s.execution[0] : s.execution;
        const failed = (exec?.items ?? []).filter((it: any) => it.passed === false).length;
        for (const b of [overall, st]) {
          b.total++;
          if (s.status === 'COMPLETED' || s.status === 'LATE') b.executed++;
          if (effMissed) b.missed++;
          b.outOfStandard += failed;
          if (s.critical && (effMissed || failed > 0)) b.critical++;
        }
        perStore.set(s.store_id, st);
      }

      const pct = (b: any) => (b.total > 0 ? Math.round((b.executed / b.total) * 100) : 0);
      const geral = {
        unidades: storeIds.length,
        total_tarefas: overall.total, concluidas: overall.executed,
        atrasadas_ou_nao_executadas: overall.missed, percentual_conclusao: pct(overall),
        falhas_criticas: overall.critical, itens_fora_do_padrao: overall.outOfStandard,
      };
      const porUnidade = storeIds.map((sid) => {
        const b = perStore.get(sid)!;
        return { unidade: nameById.get(sid) ?? 'Unidade', conclusao_pct: pct(b), atrasadas: b.missed, falhas_criticas: b.critical, itens_fora_do_padrao: b.outOfStandard };
      });

      const isMulti = storeIds.length > 1;
      const regras =
        `Regras (siga à risca): texto puro em português do Brasil, sem markdown, asteriscos, cabeçalhos, ` +
        `numeração, setas ou emojis; não explique seu raciocínio nem repita estas instruções; responda APENAS o resumo.\n` +
        `Escreva exatamente três linhas, cada uma começando com o rótulo:\n`;
      const prompt = isMulti
        ? `Você é o supervisor de operações da rede Açaí no Grau. Gere um resumo CONSOLIDADO do dia ${date} de ${storeIds.length} unidades.\n` +
          `Números gerais da rede: ${JSON.stringify(geral)}.\nPor unidade: ${JSON.stringify(porUnidade)}.\n\n` + regras +
          `Situação: (panorama geral da rede, citando o percentual médio de conclusão)\n` +
          `Destaques: (cite a unidade com PIOR desempenho e a com melhor, com números)\n` +
          `Ação imediata: (qual unidade o gestor deve priorizar e por quê)`
        : `Você é o supervisor de operações da rede Açaí no Grau. Gere um resumo do dia ${date} para a unidade ` +
          `"${nameById.get(storeIds[0]) ?? 'unidade'}", com base nestes números: ${JSON.stringify(geral)}.\n\n` + regras +
          `Situação: (panorama geral, citando o percentual de conclusão)\n` +
          `Destaques: (o que mais pesou — atrasos, falhas críticas, itens fora do padrão; se tudo em ordem, diga)\n` +
          `Ação imediata: (o que o gestor deve fazer agora; se não houver pendência, oriente a manter o padrão)`;

      let summary = await askAI(prompt, []);
      summary = summary.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim();
      await supabase.from('ai_analysis').insert({ store_id: storeIds[0], type: 'summary', reason: summary, raw: { geral, porUnidade, date, store_ids: storeIds } });

      // WhatsApp: só faz sentido para uma unidade específica (destinatário configurado dela)
      if (payload.send_whatsapp && !isMulti) {
        const { data: cfg } = await supabase
          .from('operation_alert_settings').select('recipient_phone').eq('store_id', storeIds[0]).maybeSingle();
        if (cfg?.recipient_phone) {
          await sendWhatsApp(supabase, storeIds[0], cfg.recipient_phone, `📋 Resumo Operacional — ${nameById.get(storeIds[0]) ?? ''} (${date})\n\n${summary}`);
        }
      }
      return json({ summary, stats: geral });
    }

    // ── Relatório Inteligente (análise gerencial do período) ───────────
    if (action === 'intelligent_report') {
      const storeIds: string[] = Array.isArray(payload.store_ids) && payload.store_ids.length
        ? payload.store_ids
        : (payload.store_id ? [payload.store_id] : []);
      if (storeIds.length === 0) return json({ error: 'nenhuma loja informada' }, 400);
      for (const sid of storeIds) await assertStoreAccess(sid);

      // O cliente já computou os agregados (mesmos números do relatório na tela)
      // — a IA só interpreta, não recalcula, garantindo que a análise reconcilie
      // com o que o gestor vê.
      const ctx = payload.context ?? {};
      const prompt =
        `Você é um consultor de operações da rede Açaí no Grau analisando o desempenho do período ` +
        `${ctx.period?.from ?? '?'} a ${ctx.period?.to ?? '?'} de ${storeIds.length} unidade(s).\n` +
        `Dados consolidados (use SOMENTE estes números, não invente): ${JSON.stringify(ctx)}.\n\n` +
        `Responda em JSON com exatamente estas chaves (português do Brasil, objetivo, sem markdown):\n` +
        `{\n` +
        `  "riscos": [strings — principais riscos operacionais do período, com números],\n` +
        `  "destaques": [strings — colaboradores/lojas em destaque positivo, citando nome e score],\n` +
        `  "em_risco": [strings — colaboradores/lojas que precisam de atenção, citando nome e o motivo],\n` +
        `  "tendencia": "string — a tendência operacional (melhora/piora/estável) com base na evolução semanal",\n` +
        `  "recomendacoes": [strings — ações práticas e priorizadas que o gestor deve tomar]\n` +
        `}\n` +
        `Cada lista deve ter de 2 a 4 itens curtos. Se não houver dados para alguma lista, use uma frase explicando.`;

      const raw = await askAI(prompt, [], true);
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = { riscos: [], destaques: [], em_risco: [], tendencia: raw, recomendacoes: [] };
      }
      try {
        await supabase.from('ai_analysis').insert({
          store_id: storeIds[0], type: 'intelligent_report', reason: JSON.stringify(parsed),
          raw: { context: ctx, store_ids: storeIds },
        });
      } catch { /* best-effort */ }
      return json(parsed);
    }

    return json({ error: 'ação inválida' }, 400);
  } catch (e) {
    console.error('[operations-ai]', e);
    const msg = String((e as Error)?.message ?? 'erro');
    if (msg === 'forbidden') return json({ error: 'sem acesso à unidade' }, 403);
    // Devolve a causa real para diagnóstico, mascarando qualquer querystring
    // que possa conter a API key (ex.: URLs upstream com ?key=...).
    const safe = msg.replace(/key=[^&\s]+/gi, 'key=***').slice(0, 400);
    return json({ error: safe }, 500);
  }
});
