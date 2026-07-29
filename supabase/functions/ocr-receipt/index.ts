// OCR de comprovantes via OpenAI (GPT-4o-mini com visão).
// Substitui o Gemini (limites de free tier instáveis). Mesmo contrato de saída:
//   { success: true, data: { amount, date, payer_name, tid, bank, type } }
//
// Secret necessária: OPENAI_API_KEY
// Deploy: supabase functions deploy ocr-receipt

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const json = (b: unknown, s = 200) =>
        new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    try {
        let body;
        try {
            body = await req.json();
        } catch (_e) {
            throw new Error('Corpo da requisição JSON inválido.');
        }

        if (body.ping) {
            return json({ success: true, message: 'IA Online e Respondendo!' });
        }

        const apiKey = Deno.env.get('OPENAI_API_KEY');
        if (!apiKey) throw new Error('OPENAI_API_KEY não configurada.');

        const { fileBase64, contentType } = body;
        if (!fileBase64) throw new Error('Dados da imagem não recebidos.');

        const mime = contentType || 'image/jpeg';
        const dataUrl = `data:${mime};base64,${fileBase64}`;

        const prompt = `Você é um extrator de dados de comprovantes de pagamento/transferência bancária (PIX, TED, transferência).
Analise a imagem e responda APENAS um objeto JSON com exatamente estas chaves:
{
  "amount": número (valor da transação, use ponto decimal, sem símbolo de moeda),
  "date": "YYYY-MM-DD" (data da transação),
  "payer_name": "nome de quem pagou/enviou",
  "tid": "identificador da transação / TID / código de autenticação",
  "bank": "banco ou instituição",
  "type": "PIX" ou "TED" ou "TRANSFERENCIA"
}
Se algum campo não for encontrado, use string vazia (ou 0 para amount). Não invente dados.`;

        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
                    ],
                }],
                response_format: { type: 'json_object' },
                temperature: 0.1,
                max_tokens: 500,
            }),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            console.error(`[OCR] OpenAI erro (${resp.status}):`, errText);
            return json({ success: false, error: `OpenAI Error ${resp.status}`, details: errText }, resp.status);
        }

        const result = await resp.json();
        const responseText = result.choices?.[0]?.message?.content;
        if (!responseText) throw new Error('A IA não retornou dados. Tente uma imagem mais nítida.');

        let extractedData;
        try {
            extractedData = JSON.parse(responseText);
        } catch (_e) {
            console.error('[OCR] JSON Parse Error:', responseText);
            throw new Error('Falha ao processar os dados extraídos pela IA.');
        }

        return json({ success: true, data: extractedData });
    } catch (error: any) {
        console.error('[OCR] Error:', error.message);
        return json({ success: false, error: error.message }, 500);
    }
});
