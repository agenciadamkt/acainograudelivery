import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.6"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// System Prompt Base (Instruções Principais do Gerente Virtual)
const SYSTEM_PROMPT = `
Você é o Gerente Virtual do sistema GrauOS — Açaí no Grau.
Sua missão é atuar de forma analítica, prestativa e estratégica, ajudando o franqueado a entender seus dados financeiros, de estoque e de vendas.

REGRAS GERAIS:
1. NUNCA invente dados de caixa, vendas ou estoque. Se não tiver a informação, informe que não tem acesso a esse dado no momento.
2. Seu tom de voz é profissional mas acessível, encorajador e consultivo.
3. Responda de forma clara, preferencialmente usando parágrafos curtos e marcadores (bullet points) para dados numéricos.
4. Quando perguntado sobre valores financeiros, formate como moeda (R$ 0,00).
5. Como você se chama apenas "Gerente Virtual", não precisa ficar se apresentando a cada resposta.
`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { messages, context } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      throw new Error("Invalid request format: 'messages' array is required.");
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY não configurada nas variáveis de ambiente da Supabase.");
    }

    // Preparando histórico de mensagens para o formato do Gemini
    const geminiContents = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Chamada REST para a API do Gemini 1.5 Flash (Tier rápido e gratuito para testes)
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: { text: SYSTEM_PROMPT }
        },
        contents: geminiContents,
        generationConfig: {
          temperature: 0.3, // Menos criatividade, mais assertividade nos dados
          maxOutputTokens: 800,
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      throw new Error(`Erro na API do Gemini: ${geminiResponse.status} - ${errorData}`);
    }

    const geminiData = await geminiResponse.json();
    const assistantText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, não consegui processar essa informação.";

    const finalResponse = {
      role: 'assistant',
      content: assistantText
    };

    return new Response(
      JSON.stringify(finalResponse),
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
