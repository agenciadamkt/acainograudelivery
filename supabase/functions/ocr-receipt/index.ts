// Minimal Resilient OCR Function
// Using Deno.serve (Native) for maximum stability
Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log(`[OCR] New Request: ${req.method} ${new Date().toISOString()}`);

        let body;
        try {
            body = await req.json();
        } catch (e) {
            throw new Error('Corpo da requisição JSON inválido.');
        }

        if (body.ping) {
            return new Response(
                JSON.stringify({ success: true, message: 'IA Online e Respondendo!' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) throw new Error('GEMINI_API_KEY não configurada.');

        const { fileBase64, contentType } = body;
        if (!fileBase64) throw new Error('Dados da imagem não recebidos.');

        // 5. Google Gemini API Call (Using ALIAS gemini-flash-latest)
        const prompt = `Analise este comprovante e extraia os dados em JSON puro.
        Retorne exatamente este formato:
        {
            "amount": número,
            "date": "YYYY-MM-DD",
            "payer_name": "string",
            "tid": "string",
            "bank": "string",
            "type": "PIX" | "TED" | "TRANSFERENCIA"
        }
        Retorne apenas o objeto JSON, sem markdown ou explicações.`;

        const modelName = 'gemini-flash-latest';
        const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        console.log(`[OCR] Using Model: ${modelName}`);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: contentType || "image/jpeg",
                                data: fileBase64
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 1024
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[OCR] Google API Error (${response.status}):`, errorText);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Google API Error ${response.status}`,
                    details: errorText
                }),
                { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const result = await response.json();
        const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            throw new Error('A IA não retornou dados. Tente uma imagem mais nítida.');
        }

        // Clean up JSON response (in case AI adds markdown block)
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith('```')) {
            cleanJson = cleanJson.replace(/```json|```/g, '').trim();
        }

        let extractedData;
        try {
            extractedData = JSON.parse(cleanJson);
        } catch (e) {
            console.error('[OCR] JSON Parse Error:', cleanJson);
            throw new Error('Falha ao processar os dados extraídos pela IA.');
        }

        return new Response(
            JSON.stringify({ success: true, data: extractedData }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[OCR] Error:', error.message);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
