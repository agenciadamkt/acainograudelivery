import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `
Você é o Gerente Virtual do sistema GrauOS — Açaí no Grau.
Você tem acesso DIRETO ao banco de dados da loja por meio de ferramentas (tools).

INSTRUÇÕES CRÍTICAS:
1. Quando o usuário perguntar QUALQUER coisa sobre saldo, caixa, financeiro, despesas, receitas, contas a receber, balanço ou dinheiro, você DEVE chamar a ferramenta get_financial_kpis IMEDIATAMENTE. Nunca pergunte antes — apenas chame a ferramenta.
2. NUNCA invente valores. Use SOMENTE os dados retornados pelas ferramentas.
3. Seu tom é profissional, acessível e consultivo.
4. Formate valores financeiros como moeda brasileira (R$ 0,00).
5. Use parágrafos curtos e bullet points para organizar dados numéricos.
6. Não se apresente a cada resposta.
`;

const tools = [
  {
    functionDeclarations: [
      {
        name: "get_financial_kpis",
        description: "Busca os KPIs financeiros atuais do banco de dados da loja: saldo total em contas, despesas pendentes e contas a receber pendentes. SEMPRE use esta ferramenta quando o usuário perguntar sobre saldo, caixa, financeiro, despesas, receitas ou dinheiro.",
        parameters: {
          type: "OBJECT",
          properties: {},
          required: []
        }
      }
    ]
  }
];

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

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Invalid request format: 'messages' array is required.");
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY não configurada.");

    const geminiContents = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Função auxiliar para chamar o Gemini
    const callGemini = async (contents: any[], useTools = true) => {
      const body: any = {
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
      };

      if (useTools) {
        body.tools = tools;
        // Força o modelo a preferir usar tools quando disponíveis
        body.tool_config = { function_calling_config: { mode: "AUTO" } };
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error:", errorText);
        throw new Error(`Erro na API do Gemini (${response.status}): ${errorText}`);
      }
      return response.json();
    };

    // ── Primeira chamada ao Gemini ──
    let geminiData = await callGemini(geminiContents);
    let candidate = geminiData.candidates?.[0]?.content;
    let parts = candidate?.parts || [];

    // Verificar se alguma part contém functionCall
    const functionCallPart = parts.find((p: any) => p.functionCall);

    if (functionCallPart) {
      const functionName = functionCallPart.functionCall.name;
      console.log(`Tool chamada: ${functionName}`);

      let toolResult: any = {};

      if (functionName === "get_financial_kpis") {
        const { data: accounts, error: e1 } = await supabaseClient
          .from('financial_accounts')
          .select('name, balance');

        const { data: expenses, error: e2 } = await supabaseClient
          .from('expenses')
          .select('amount')
          .eq('paid', false);

        const { data: receivables, error: e3 } = await supabaseClient
          .from('accounts_receivable')
          .select('amount')
          .eq('paid', false);

        if (e1) console.error("Erro accounts:", e1.message);
        if (e2) console.error("Erro expenses:", e2.message);
        if (e3) console.error("Erro receivables:", e3.message);

        const totalBalance = (accounts || []).reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
        const totalPendingExpenses = (expenses || []).reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
        const totalPendingReceivables = (receivables || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

        // Lista de contas individuais
        const accountsList = (accounts || []).map((a: any) => ({
          nome: a.name,
          saldo: Number(a.balance || 0)
        }));

        toolResult = {
          saldo_total_em_contas: totalBalance,
          despesas_pendentes: totalPendingExpenses,
          contas_a_receber_pendentes: totalPendingReceivables,
          contas_detalhadas: accountsList,
          data_consulta: new Date().toISOString()
        };
      }

      // Montar a conversa com a resposta da tool
      const updatedContents = [
        ...geminiContents,
        {
          role: "model",
          parts: [{ functionCall: functionCallPart.functionCall }]
        },
        {
          role: "user",
          parts: [{
            functionResponse: {
              name: functionName,
              response: toolResult
            }
          }]
        }
      ];

      // Segunda chamada: Gemini interpreta os dados
      geminiData = await callGemini(updatedContents, false);
      candidate = geminiData.candidates?.[0]?.content;
      parts = candidate?.parts || [];
    }

    // Extrair texto da resposta final
    const textPart = parts.find((p: any) => p.text);

    return new Response(
      JSON.stringify({
        role: 'assistant',
        content: textPart?.text || "Desculpe, não consegui processar essa informação."
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Erro no Copilot:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
