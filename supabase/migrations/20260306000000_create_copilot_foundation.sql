-- ====================================================
-- GrauOS Copilot (Gerente Virtual) - Fase 1: Fundação
-- ====================================================

-- 1. Camada de Memória (Conversas)
CREATE TABLE IF NOT EXISTS public.copilot_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    session_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conv_session ON public.copilot_conversations(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conv_user ON public.copilot_conversations(user_id, created_at DESC);

-- RLS: Apenas o usuário que iniciou a conversa pode acessá-la
ALTER TABLE public.copilot_conversations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'copilot_conversations' AND policyname = 'Users manage own conversations'
    ) THEN
        CREATE POLICY "Users manage own conversations"
            ON public.copilot_conversations FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END$$;


-- 2. Camada Knowledge Base (Procedimentos e Regras)
CREATE TABLE IF NOT EXISTS public.copilot_knowledge (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL, -- Ex: procedimento, regra_negocio, ajuda_tela, faq, politica
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    module TEXT,
    route_pattern TEXT,
    tags TEXT[],
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Conhecimento é visível para todos os autenticados, mas só admin altera
ALTER TABLE public.copilot_knowledge ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'copilot_knowledge' AND policyname = 'Everyone can view active knowledge'
    ) THEN
        CREATE POLICY "Everyone can view active knowledge" 
            ON public.copilot_knowledge FOR SELECT 
            USING (active = true);
            
        CREATE POLICY "Admins manage knowledge" 
            ON public.copilot_knowledge FOR ALL 
            USING ((auth.jwt() ->> 'email') IN ('agenciadamkt@gmail.com', 'acainograuwagner@gmail.com'));
    END IF;
END$$;


-- 3. Camada Motor de Insights (Avisos Proativos)
CREATE TABLE IF NOT EXISTS public.copilot_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    franchisee_user_id UUID REFERENCES auth.users(id) NOT NULL,
    type TEXT NOT NULL, -- Ex: estoque_critico, vendas_queda
    category TEXT NOT NULL, -- Ex: estoque, financeiro, vendas
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
    module TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    action_suggestion TEXT,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para buscar insights rápidos da dashboard
CREATE INDEX IF NOT EXISTS idx_insights_user ON public.copilot_insights(franchisee_user_id, resolved, created_at DESC);

-- RLS: O franqueado vê/altera apenas os alertas da sua própria loja
ALTER TABLE public.copilot_insights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'copilot_insights' AND policyname = 'Users manage own insights'
    ) THEN
        CREATE POLICY "Users manage own insights"
            ON public.copilot_insights FOR ALL
            USING (auth.uid() = franchisee_user_id)
            WITH CHECK (auth.uid() = franchisee_user_id);
    END IF;
END$$;

-- 4. Inserindo dados de exemplo (Knowledge Base)
INSERT INTO public.copilot_knowledge (category, title, content, module, route_pattern, tags)
VALUES
    (
        'regra_negocio', 
        'Despesas Pagas em Dinheiro', 
        'Toda vez que uma despesa é dada como paga usando o método "Dinheiro Em Espécie", o valor é deduzido instantaneamente do saldo acumulado do Caixa Geral.', 
        'financial', 
        '/admin/financial/expenses',
        ARRAY['despesas', 'caixa_geral', 'dinheiro']
    ),
    (
        'procedimento', 
        'Fechamento de Caixa', 
        'O relatório de conferência do dia na operação. O valor final no Fechamento de Caixa compõe as receitas de Vendas (Dinheiro/Aplicativo) no DRE report.', 
        'pdv', 
        '/admin/pdv/caixa',
        ARRAY['fechamento', 'dre', 'vendas']
    )
ON CONFLICT DO NOTHING;
