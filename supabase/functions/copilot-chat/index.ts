import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `
Você é o Gerente Virtual do sistema GrauOS — Açaí no Grau.
Você tem acesso DIRETO ao banco de dados da loja por meio de ferramentas (tools).
Você também recebe o contexto da tela que o usuário está visualizando.

INSTRUÇÕES CRÍTICAS:
1. Quando o usuário perguntar QUALQUER coisa sobre saldo, caixa, financeiro, despesas, receitas, contas a receber, balanço ou dinheiro → chame get_financial_kpis IMEDIATAMENTE.
2. Quando perguntar sobre vendas, pedidos, faturamento do dia → chame get_sales_summary IMEDIATAMENTE.
3. Quando perguntar sobre estoque, produtos, ingredientes, itens críticos → chame get_inventory_status IMEDIATAMENTE.
4. Quando perguntar sobre clientes devedores ou inadimplência → chame get_debtors IMEDIATAMENTE.
5. Quando perguntar "o que devo fazer nessa tela?" ou pedir orientação sobre a tela → use o campo CONTEXTO DA TELA que está na mensagem para dar orientações operacionais.
6. NUNCA invente valores. Use SOMENTE os dados retornados pelas ferramentas.
7. Seu tom é profissional, acessível e consultivo como um gerente experiente.
8. Formate valores financeiros como moeda brasileira (R$ 0,00).
9. Use parágrafos curtos e bullet points para organizar dados numéricos.
10. Não se apresente a cada resposta — seja direto e eficiente.
11. SEMPRE responda em português do Brasil.
12. Adapte a profundidade da resposta ao [PERFIL DO USUÁRIO] quando esse campo vier na mensagem: MASTER e FRANQUEADO podem receber visão estratégica e financeira completa; COLABORADOR deve receber foco operacional e prático do dia a dia da loja.
13. Quando a mensagem trouxer um bloco [BASE DE CONHECIMENTO], ele é a fonte oficial de procedimentos/políticas da franquia — priorize-o para perguntas de "como faço" / "qual o procedimento". Se usar algo de lá, termine a resposta com uma linha "Fonte: <título do documento>". NUNCA invente um procedimento que não esteja nesse bloco nem nos dados das ferramentas. Se a pergunta não puder ser respondida nem pelas ferramentas nem pelo bloco de conhecimento, responda exatamente: "Não encontrei essa informação na documentação oficial da franquia."
`;

// Tools no formato OpenAI (chat/completions → type:"function").
const tools = [
  {
    type: "function",
    function: {
      name: "get_financial_kpis",
      description: "Busca KPIs financeiros: saldo total, despesas pendentes, contas a receber. Use quando o assunto for saldo, caixa, finanças, despesas ou receitas.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_sales_summary",
      description: "Busca resumo de vendas/pedidos do dia. Use quando o assunto for vendas, faturamento, pedidos ou receita de hoje.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_inventory_status",
      description: "Busca status do estoque, produtos com baixo estoque, alertas. Use quando o assunto for estoque, ingredientes ou produtos críticos.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_debtors",
      description: "Busca clientes devedores e contas a receber pendentes. Use quando o assunto for inadimplência, clientes que devem ou cobranças.",
      parameters: { type: "object", properties: {}, required: [] }
    }
  }
];

// ─── Funções de cada Tool ───
async function executeGetFinancialKpis(supabaseClient: any) {
  const { data: accounts, error: e1 } = await supabaseClient
    .from('financial_accounts')
    .select('name, balance');

  const { data: expenses, error: e2 } = await supabaseClient
    .from('expenses')
    .select('amount, description, category, due_date')
    .eq('paid', false);

  const { data: receivables, error: e3 } = await supabaseClient
    .from('accounts_receivable')
    .select('amount, description, customer_name, due_date')
    .eq('paid', false);

  if (e1) console.error("Erro accounts:", e1.message);
  if (e2) console.error("Erro expenses:", e2.message);
  if (e3) console.error("Erro receivables:", e3.message);

  const totalBalance = (accounts || []).reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
  const totalPendingExpenses = (expenses || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const totalPendingReceivables = (receivables || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

  return {
    saldo_total_em_contas: totalBalance,
    contas_detalhadas: (accounts || []).map((a: any) => ({ nome: a.name, saldo: Number(a.balance || 0) })),
    despesas_pendentes: {
      total: totalPendingExpenses,
      quantidade: (expenses || []).length,
      itens: (expenses || []).slice(0, 10).map((e: any) => ({
        descricao: e.description,
        categoria: e.category,
        valor: Number(e.amount),
        vencimento: e.due_date
      }))
    },
    contas_a_receber: {
      total: totalPendingReceivables,
      quantidade: (receivables || []).length,
      itens: (receivables || []).slice(0, 10).map((r: any) => ({
        descricao: r.description,
        cliente: r.customer_name,
        valor: Number(r.amount),
        vencimento: r.due_date
      }))
    },
    data_consulta: new Date().toISOString()
  };
}

async function executeGetSalesSummary(supabaseClient: any) {
  const today = new Date().toISOString().split('T')[0];

  // Pedidos do dia
  const { data: orders, error: e1 } = await supabaseClient
    .from('orders')
    .select('id, total, status, created_at')
    .gte('created_at', today + 'T00:00:00')
    .lte('created_at', today + 'T23:59:59');

  // Fechamentos de caixa de hoje
  const { data: closings, error: e2 } = await supabaseClient
    .from('cash_closings')
    .select('total_sales, closing_date')
    .gte('closing_date', today);

  if (e1) console.error("Erro orders:", e1.message);
  if (e2) console.error("Erro closings:", e2.message);

  const totalSales = (orders || []).reduce((s: number, o: any) => s + Number(o.total || 0), 0);
  const ordersByStatus: Record<string, number> = {};
  (orders || []).forEach((o: any) => {
    ordersByStatus[o.status || 'unknown'] = (ordersByStatus[o.status || 'unknown'] || 0) + 1;
  });

  return {
    data: today,
    total_pedidos: (orders || []).length,
    faturamento_total: totalSales,
    pedidos_por_status: ordersByStatus,
    ticket_medio: (orders || []).length > 0 ? totalSales / (orders || []).length : 0,
    fechamentos_caixa: (closings || []).map((c: any) => ({
      total_vendas: Number(c.total_sales),
      data: c.closing_date
    }))
  };
}

async function executeGetInventoryStatus(supabaseClient: any) {
  // Produtos de estoque
  const { data: inventory, error: e1 } = await supabaseClient
    .from('inventory_items')
    .select('id, name, current_stock, minimum_stock, unit')
    .order('current_stock', { ascending: true });

  if (e1) console.error("Erro inventory:", e1.message);

  const items = inventory || [];
  const critical = items.filter((i: any) => Number(i.current_stock) <= Number(i.minimum_stock));
  const healthy = items.filter((i: any) => Number(i.current_stock) > Number(i.minimum_stock));

  return {
    total_itens: items.length,
    itens_criticos: {
      quantidade: critical.length,
      lista: critical.slice(0, 15).map((i: any) => ({
        nome: i.name,
        estoque_atual: i.current_stock,
        estoque_minimo: i.minimum_stock,
        unidade: i.unit
      }))
    },
    itens_saudaveis: healthy.length,
    resumo: critical.length === 0
      ? 'Estoque saudável — todos os itens acima do mínimo.'
      : `ATENÇÃO: ${critical.length} item(ns) abaixo do estoque mínimo.`
  };
}

async function executeGetDebtors(supabaseClient: any) {
  const { data: receivables, error } = await supabaseClient
    .from('accounts_receivable')
    .select('id, customer_name, amount, description, due_date, paid')
    .eq('paid', false)
    .order('due_date', { ascending: true });

  if (error) console.error("Erro debtors:", error.message);

  const items = receivables || [];
  const totalDebt = items.reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const today = new Date();

  const overdue = items.filter((r: any) => r.due_date && new Date(r.due_date) < today);
  const upcoming = items.filter((r: any) => !r.due_date || new Date(r.due_date) >= today);

  return {
    total_devedores: items.length,
    total_em_divida: totalDebt,
    vencidos: {
      quantidade: overdue.length,
      total: overdue.reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
      lista: overdue.slice(0, 10).map((r: any) => ({
        cliente: r.customer_name,
        valor: Number(r.amount),
        descricao: r.description,
        vencimento: r.due_date
      }))
    },
    a_vencer: {
      quantidade: upcoming.length,
      total: upcoming.reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
      lista: upcoming.slice(0, 10).map((r: any) => ({
        cliente: r.customer_name,
        valor: Number(r.amount),
        descricao: r.description,
        vencimento: r.due_date
      }))
    }
  };
}

// ─── Busca (textual, v1) na Base de Conhecimento ───
// Sem embeddings/pgvector ainda (fase futura) — o volume de documentos hoje
// é pequeno o suficiente para trazer todos os registros ativos e pontuar
// localmente por: (a) rota da tela atual bater com route_pattern, (b) tags
// citadas na pergunta do usuário, (c) palavras do título citadas na pergunta.
function scoreKnowledgeRow(row: any, userMessageLower: string, currentRoute: string | null): number {
  let score = 0;

  if (row.route_pattern && currentRoute) {
    if (currentRoute.startsWith(row.route_pattern) || row.route_pattern.startsWith(currentRoute)) {
      score += 5;
    }
  }

  const tags: string[] = Array.isArray(row.tags) ? row.tags : [];
  for (const tag of tags) {
    if (tag && userMessageLower.includes(String(tag).toLowerCase())) score += 2;
  }

  const titleWords = String(row.title || '')
    .toLowerCase()
    .split(/[\s—-]+/)
    .filter((w: string) => w.length > 3);
  for (const w of titleWords) {
    if (userMessageLower.includes(w)) score += 1;
  }

  return score;
}

async function retrieveKnowledge(supabaseClient: any, userMessage: string, currentRoute: string | null) {
  const { data: rows, error } = await supabaseClient
    .from('copilot_knowledge')
    .select('id, title, content, module, route_pattern, tags')
    .eq('active', true);

  if (error) {
    console.error('Erro ao buscar copilot_knowledge:', error.message);
    return [];
  }

  const userMessageLower = (userMessage || '').toLowerCase();
  const scored = (rows || [])
    .map((row: any) => ({ row, score: scoreKnowledgeRow(row, userMessageLower, currentRoute) }))
    .filter((s: any) => s.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 4);

  return scored.map((s: any) => s.row);
}

// ─── Persistência de conversa (best-effort — nunca derruba a resposta) ───
async function persistTurn(
  supabaseClient: any,
  userId: string | null,
  sessionId: string | null,
  userText: string,
  assistantText: string,
  sources: string[]
) {
  if (!userId || !sessionId) return;
  try {
    await supabaseClient.from('copilot_conversations').insert([
      { user_id: userId, session_id: sessionId, role: 'user', content: userText },
      {
        user_id: userId,
        session_id: sessionId,
        role: 'assistant',
        content: assistantText,
        metadata: sources.length > 0 ? { sources } : {},
      },
    ]);
  } catch (e: any) {
    console.error('Erro ao persistir conversa do copilot:', e.message);
  }
}

// ─── Main Handler ───
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { messages, context, session_id: sessionId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Invalid request format: 'messages' array is required.");
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) throw new Error("OPENAI_API_KEY não configurada.");

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
    const currentRoute: string | null = context?.current_route ?? null;

    // Busca na base de conhecimento oficial (camada "Especialista da Franquia"
    // / "Especialista do Sistema") relevante para a tela atual + a pergunta.
    const knowledgeRows = lastUserMessage
      ? await retrieveKnowledge(supabaseClient, lastUserMessage.content, currentRoute)
      : [];

    // Injeta contexto da tela, perfil do usuário e base de conhecimento na
    // última mensagem do usuário.
    let contextPrefix = '';
    if (context) {
      contextPrefix += `\n\n[CONTEXTO DA TELA ATUAL]\nO usuário está na tela: ${context.current_screen || 'desconhecida'}\nRota: ${context.current_route || 'N/A'}\nTimestamp: ${context.timestamp || new Date().toISOString()}\n`;
    }
    if (context?.user_profile) {
      contextPrefix += `\n[PERFIL DO USUÁRIO]\nPerfil: ${context.user_profile}\n`;
    }
    if (knowledgeRows.length > 0) {
      contextPrefix += `\n[BASE DE CONHECIMENTO]\nTrechos da documentação oficial da franquia relevantes para esta pergunta/tela:\n`;
      knowledgeRows.forEach((row: any) => {
        contextPrefix += `\n--- ${row.title} ---\n${row.content}\n`;
      });
    }

    // Formato OpenAI: system + histórico. O contexto (tela/perfil/base de
    // conhecimento) é anexado à última mensagem do usuário.
    const chatMessages: any[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map((msg: any, index: number) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: (index === messages.length - 1 && contextPrefix) ? msg.content + contextPrefix : msg.content,
      })),
    ];

    const MODEL = 'gpt-4o-mini';

    // Chama a OpenAI (chat/completions). Com useTools, expõe as ferramentas de
    // dados; sem, força uma resposta textual final (2ª volta pós-ferramenta).
    const callOpenAI = async (msgs: any[], useTools: boolean): Promise<any> => {
      const body: any = {
        model: MODEL,
        temperature: 0.2,
        max_tokens: 2048,
        messages: msgs,
      };
      if (useTools) {
        body.tools = tools;
        body.tool_choice = 'auto';
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro OpenAI (${response.status}):`, errorText);
        if (response.status === 429) {
          throw new Error(
            'Nosso cérebro está descansando! 🧠💤 Muitas consultas em pouco tempo (limite de uso). ' +
            'Aguarde 1 minuto e tente novamente.'
          );
        }
        throw new Error(`Falha na IA (${response.status}): ${errorText.slice(0, 300)}`);
      }
      return response.json();
    };

    const runTool = async (functionName: string): Promise<any> => {
      switch (functionName) {
        case 'get_financial_kpis':
          return await executeGetFinancialKpis(supabaseClient);
        case 'get_sales_summary':
          return await executeGetSalesSummary(supabaseClient);
        case 'get_inventory_status':
          return await executeGetInventoryStatus(supabaseClient);
        case 'get_debtors':
          return await executeGetDebtors(supabaseClient);
        default:
          return { error: `Ferramenta desconhecida: ${functionName}` };
      }
    };

    // ── Primeira chamada (com ferramentas) ──
    let data = await callOpenAI(chatMessages, true);
    let choice = data.choices?.[0]?.message;
    const toolCalls = choice?.tool_calls;

    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      // Anexa a mensagem do assistente (com os tool_calls) e as respostas.
      const followUp: any[] = [...chatMessages, choice];
      for (const tc of toolCalls) {
        const fnName = tc.function?.name;
        console.log(`Tool chamada: ${fnName}`);
        const toolResult = await runTool(fnName);
        followUp.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(toolResult),
        });
      }
      // Segunda volta: sem ferramentas, para forçar a resposta textual final.
      data = await callOpenAI(followUp, false);
      choice = data.choices?.[0]?.message;
    }

    const finalText = choice?.content || "Desculpe, não consegui processar essa informação.";
    const sources = knowledgeRows.map((row: any) => row.title);

    if (lastUserMessage) {
      const { data: authData } = await supabaseClient.auth.getUser();
      await persistTurn(supabaseClient, authData?.user?.id ?? null, sessionId ?? null, lastUserMessage.content, finalText, sources);
    }

    return new Response(
      JSON.stringify({
        role: 'assistant',
        content: finalText,
        sources
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    console.error("Erro no Copilot:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
