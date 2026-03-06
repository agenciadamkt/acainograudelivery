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
`;

const tools = [
  {
    functionDeclarations: [
      {
        name: "get_financial_kpis",
        description: "Busca KPIs financeiros: saldo total, despesas pendentes, contas a receber. Use quando o assunto for saldo, caixa, finanças, despesas ou receitas.",
        parameters: { type: "OBJECT", properties: {}, required: [] }
      },
      {
        name: "get_sales_summary",
        description: "Busca resumo de vendas/pedidos do dia. Use quando o assunto for vendas, faturamento, pedidos ou receita de hoje.",
        parameters: { type: "OBJECT", properties: {}, required: [] }
      },
      {
        name: "get_inventory_status",
        description: "Busca status do estoque, produtos com baixo estoque, alertas. Use quando o assunto for estoque, ingredientes ou produtos críticos.",
        parameters: { type: "OBJECT", properties: {}, required: [] }
      },
      {
        name: "get_debtors",
        description: "Busca clientes devedores e contas a receber pendentes. Use quando o assunto for inadimplência, clientes que devem ou cobranças.",
        parameters: { type: "OBJECT", properties: {}, required: [] }
      }
    ]
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

    const { messages, context } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Invalid request format: 'messages' array is required.");
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY não configurada.");

    // Injeta contexto da tela na primeira mensagem do sistema
    let contextPrefix = '';
    if (context) {
      contextPrefix = `\n\n[CONTEXTO DA TELA ATUAL]\nO usuário está na tela: ${context.current_screen || 'desconhecida'}\nRota: ${context.current_route || 'N/A'}\nTimestamp: ${context.timestamp || new Date().toISOString()}\n`;
    }

    const geminiContents = messages.map((msg: any, index: number) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: (index === messages.length - 1 && contextPrefix) ? msg.content + contextPrefix : msg.content }]
    }));

    // Modelos em ordem de preferência (cada um tem cota separada)
    const MODELS = [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-flash-lite-preview-06-17',
    ];

    const callGeminiWithModel = async (model: string, contents: any[], useTools: boolean): Promise<Response> => {
      const body: any = {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 }
      };

      if (useTools) {
        body.tools = tools;
        body.tool_config = { function_calling_config: { mode: "AUTO" } };
      }

      return fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );
    };

    const callGemini = async (contents: any[], useTools = true): Promise<any> => {
      let lastError = '';

      for (const model of MODELS) {
        try {
          console.log(`Tentando modelo: ${model}`);
          const response = await callGeminiWithModel(model, contents, useTools);

          if (response.status === 429) {
            console.warn(`Rate limit para ${model}, tentando próximo modelo...`);
            lastError = `Modelo ${model} com cota esgotada.`;
            continue; // tenta o próximo modelo
          }

          if (response.status === 404) {
            console.warn(`Modelo ${model} não encontrado, tentando próximo...`);
            continue;
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Erro ${model}:`, errorText);
            lastError = errorText;
            continue;
          }

          console.log(`Sucesso com modelo: ${model}`);
          return response.json();
        } catch (e: any) {
          console.error(`Exceção com ${model}:`, e.message);
          lastError = e.message;
          continue;
        }
      }

      // Todos os modelos falharam
      throw new Error(
        'Nosso cérebro está descansando! 🧠💤 Muitas consultas foram feitas em pouco tempo. ' +
        'Aguarde 1 minuto e tente novamente. (' + lastError + ')'
      );
    };

    // ── Primeira chamada ──
    let geminiData = await callGemini(geminiContents);
    let candidate = geminiData.candidates?.[0]?.content;
    let parts = candidate?.parts || [];

    const functionCallPart = parts.find((p: any) => p.functionCall);

    if (functionCallPart) {
      const functionName = functionCallPart.functionCall.name;
      console.log(`Tool chamada: ${functionName}`);

      let toolResult: any = {};

      switch (functionName) {
        case 'get_financial_kpis':
          toolResult = await executeGetFinancialKpis(supabaseClient);
          break;
        case 'get_sales_summary':
          toolResult = await executeGetSalesSummary(supabaseClient);
          break;
        case 'get_inventory_status':
          toolResult = await executeGetInventoryStatus(supabaseClient);
          break;
        case 'get_debtors':
          toolResult = await executeGetDebtors(supabaseClient);
          break;
        default:
          toolResult = { error: `Ferramenta desconhecida: ${functionName}` };
      }

      const updatedContents = [
        ...geminiContents,
        { role: "model", parts: [{ functionCall: functionCallPart.functionCall }] },
        { role: "user", parts: [{ functionResponse: { name: functionName, response: toolResult } }] }
      ];

      geminiData = await callGemini(updatedContents, false);
      candidate = geminiData.candidates?.[0]?.content;
      parts = candidate?.parts || [];
    }

    const textPart = parts.find((p: any) => p.text);

    return new Response(
      JSON.stringify({
        role: 'assistant',
        content: textPart?.text || "Desculpe, não consegui processar essa informação."
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
