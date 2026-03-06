import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System Prompt Base
const SYSTEM_PROMPT = `
Você é o Gerente Virtual do sistema GrauOS — Açaí no Grau.
Sua missão é atuar de forma analítica, prestativa e estratégica, ajudando o franqueado a entender seus dados financeiros, de estoque e de vendas.

REGRAS GERAIS:
1. NUNCA invente dados de caixa, vendas ou estoque. Use as ferramentas (tools) disponíveis para checar a informação real do banco de dados quando necessário. Se a ferramenta não retornar o dado, informe que não tem acesso a esse dado no momento.
2. Seu tom de voz é profissional mas acessível, encorajador e consultivo.
3. Responda de forma clara, preferencialmente usando parágrafos curtos e marcadores (bullet points) para dados numéricos.
4. Quando perguntado sobre valores financeiros reais obtidos pelas tools, formate como moeda (R$ 0,00).
5. Como você se chama apenas "Gerente Virtual", não precisa ficar se apresentando a cada resposta.
`;

const tools = [
  {
    functionDeclarations: [
      {
        name: "get_financial_kpis",
        description: "Obtém os KPIs financeiros atuais: Balanço total, Saldo em caixa, Recebíveis pendentes e Despesas totais",
        parameters: {
          type: "OBJECT",
          properties: {}
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

    let geminiContents = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Função auxiliar para chamar o Gemini
    const callGemini = async (contents: any[]) => {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: { text: SYSTEM_PROMPT } },
          contents,
          tools,
          generationConfig: { temperature: 0.2, maxOutputTokens: 800 }
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API do Gemini: ${response.status} - ${await response.text()}`);
      }
      return response.json();
    };

    let geminiData = await callGemini(geminiContents);
    let candidate = geminiData.candidates?.[0]?.content;
    let assistantPart = candidate?.parts?.[0];

    // Se o Gemini decidir usar a ferramenta
    if (assistantPart?.functionCall) {
      const functionName = assistantPart.functionCall.name;

      let functionResponseData = {};

      if (functionName === "get_financial_kpis") {
        // Consultar dados do Supabase
        const { data: accounts } = await supabaseClient.from('accounts').select('balance');
        const { data: expenses } = await supabaseClient.from('expenses').select('amount').eq('status', 'PENDING');
        const { data: receivables } = await supabaseClient.from('accounts_receivable').select('amount').eq('status', 'PENDING');

        const totalBalance = (accounts || []).reduce((acc, obj) => acc + Number(obj.balance || 0), 0);
        const totalPendingExpenses = (expenses || []).reduce((acc, obj) => acc + Number(obj.amount || 0), 0);
        const totalPendingReceivables = (receivables || []).reduce((acc, obj) => acc + Number(obj.amount || 0), 0);

        functionResponseData = {
          total_balance: totalBalance,
          total_pending_expenses: totalPendingExpenses,
          total_pending_receivables: totalPendingReceivables,
        };
      } else {
        functionResponseData = { error: "Unknown function" };
      }

      // Adicionamos a chamada na conversa do bot
      geminiContents.push({
        role: "model",
        parts: [{ functionCall: assistantPart.functionCall }]
      });

      // E adicionamos a resposta do sistema com o resultado real do bd
      geminiContents.push({
        role: "function",
        parts: [{
          functionResponse: {
            name: functionName,
            response: { name: functionName, content: functionResponseData }
          }
        }]
      });

      // Segunda chamada ao Gemini para ele interpretar os dados
      geminiData = await callGemini(geminiContents);
      candidate = geminiData.candidates?.[0]?.content;
      assistantPart = candidate?.parts?.[0];
    }

    const finalResponse = {
      role: 'assistant',
      content: assistantPart?.text || "Desculpe, não consegui processar essa informação."
    };

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error("Erro no Copilot:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
