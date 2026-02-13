-- 1. Trails Table
CREATE TABLE IF NOT EXISTS public.uni_trails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail TEXT,
    category TEXT NOT NULL DEFAULT 'geral', -- 'onboarding', 'operacao', 'marketing', 'financeiro', 'gestao'
    level TEXT NOT NULL DEFAULT 'Básico', -- 'Básico', 'Intermediário', 'Avançado'
    color TEXT DEFAULT '#e50914',
    required BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Lessons Table
CREATE TABLE IF NOT EXISTS public.uni_lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trail_id UUID REFERENCES public.uni_trails(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subtitle TEXT,
    duration TEXT DEFAULT '5 min',
    video_url TEXT,
    description TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Materials Table
CREATE TABLE IF NOT EXISTS public.uni_materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.uni_lessons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'pdf', -- 'pdf', 'doc', 'xls', 'img'
    size TEXT DEFAULT '—',
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Links Table
CREATE TABLE IF NOT EXISTS public.uni_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.uni_lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Questions Table
CREATE TABLE IF NOT EXISTS public.uni_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID REFERENCES public.uni_lessons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Link to auth user
    author_name TEXT, -- Fallback name
    author_avatar TEXT, -- Fallback avatar text (e.g. 'JP')
    text TEXT NOT NULL,
    answered BOOLEAN DEFAULT false,
    reply TEXT,
    reply_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. User Progress Table (Tracks completion)
CREATE TABLE IF NOT EXISTS public.uni_progress (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.uni_lessons(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT true,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, lesson_id)
);

-- Enable RLS
ALTER TABLE public.uni_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uni_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uni_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uni_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uni_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uni_progress ENABLE ROW LEVEL SECURITY;

-- Policies
-- Read access for all authenticated users
CREATE POLICY "Public read access for trails" ON public.uni_trails FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read access for lessons" ON public.uni_lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read access for materials" ON public.uni_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read access for links" ON public.uni_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "Public read access for questions" ON public.uni_questions FOR SELECT TO authenticated USING (true);

-- Write access for managers/admins (simplified: authenticated for questions, specific roles for content)
-- For now, allowing authenticated insert on questions
CREATE POLICY "Users can ask questions" ON public.uni_questions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view their own progress" ON public.uni_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.uni_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress update" ON public.uni_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- SEED DATA (Populating with existing mock data)
DO $$
DECLARE
    t1_id UUID;
    t2_id UUID;
    t3_id UUID;
    t7_id UUID;
    l1_1_id UUID;
    l1_2_id UUID;
BEGIN
    -- Trail 1: Abertura da Loja
    INSERT INTO public.uni_trails (title, description, category, level, color, required, active, thumbnail)
    VALUES ('Abertura da Loja', 'Procedimentos diários de abertura, checklist e rotinas matinais.', 'onboarding', 'Básico', '#e50914', true, true, '/assets/trails/abertura-loja.png')
    RETURNING id INTO t1_id;

    -- Lessons for Trail 1
    INSERT INTO public.uni_lessons (trail_id, title, subtitle, duration, video_url, description, "order")
    VALUES 
    (t1_id, 'Checklist de Abertura', 'Lista completa de verificação', '6 min', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'Nesta aula você aprenderá o checklist completo de abertura da loja.', 1)
    RETURNING id INTO l1_1_id;

    INSERT INTO public.uni_lessons (trail_id, title, subtitle, duration, video_url, description, "order")
    VALUES 
    (t1_id, 'Ligando Equipamentos', 'Ordem de ativação', '5 min', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'Aprenda a ordem correta de ativação dos equipamentos.', 2)
    RETURNING id INTO l1_2_id;

    INSERT INTO public.uni_lessons (trail_id, title, subtitle, duration, video_url, description, "order")
    VALUES (t1_id, 'Conferência de Estoque', 'Verificação dos insumos', '7 min', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'Conferência rápida de estoque pela manhã.', 3);
    
    INSERT INTO public.uni_lessons (trail_id, title, subtitle, duration, video_url, description, "order")
    VALUES (t1_id, 'Higienização Inicial', 'Limpeza padrão pré-operação', '6 min', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'Protocolo de limpeza de bancadas e utensílios.', 4);

    -- Materials for Lesson 1.1
    INSERT INTO public.uni_materials (lesson_id, name, type, size, url)
    VALUES (l1_1_id, 'Checklist de Abertura.pdf', 'pdf', '340 KB', '#');

    -- Links for Lesson 1.1
    INSERT INTO public.uni_links (lesson_id, title, url, description)
    VALUES (l1_1_id, 'Manual de Operações', '#', 'Capítulo 1');

    -- Questions for Lesson 1.1
    INSERT INTO public.uni_questions (lesson_id, author_name, author_avatar, text, answered, reply, reply_at)
    VALUES (l1_1_id, 'Maria Silva', 'MS', 'Quanto tempo antes devo chegar?', true, '30 minutos antes.', now());


    -- Trail 2: Fechamento de Caixa
    INSERT INTO public.uni_trails (title, description, category, level, color, required, active, thumbnail)
    VALUES ('Fechamento de Caixa', 'Rotina de encerramento do dia.', 'onboarding', 'Básico', '#e87c03', true, true, '/assets/trails/fechamento-caixa.png')
    RETURNING id INTO t2_id;

    INSERT INTO public.uni_lessons (trail_id, title, subtitle, duration, video_url, description, "order")
    VALUES (t2_id, 'Conferência do Caixa', 'Contagem e verificação', '5 min', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'Processo completo de conferência.', 1);


    -- Trail 3: Padrão de Atendimento
    INSERT INTO public.uni_trails (title, description, category, level, color, required, active, thumbnail)
    VALUES ('Padrão de Atendimento', 'Como encantar cada cliente.', 'onboarding', 'Básico', '#46d369', true, true, '/assets/trails/atendimento.png')
    RETURNING id INTO t3_id;

    INSERT INTO public.uni_lessons (trail_id, title, subtitle, duration, video_url, description, "order")
    VALUES (t3_id, 'Boas-vindas ao Cliente', 'Primeiro contato encantador', '6 min', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'Como receber o cliente com excelência.', 1);


    -- Trail 7: Montagem de Açaí
    INSERT INTO public.uni_trails (title, description, category, level, color, required, active, thumbnail)
    VALUES ('Montagem de Açaí', 'Padrão de montagem das receitas.', 'operacao', 'Básico', '#8D42DD', false, true, '/assets/trails/montagem-acai.png')
    RETURNING id INTO t7_id;

    INSERT INTO public.uni_lessons (trail_id, title, subtitle, duration, video_url, description, "order")
    VALUES (t7_id, 'Cadastros de Ingredientes', 'Cadastros de Ingredientes', '2 min', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'Cadastre todos os ingredientes.', 1);

    -- Other Trails (Placeholders)
    INSERT INTO public.uni_trails (title, description, category, level, color, required, active, thumbnail) VALUES 
    ('Uso do PDV', 'Domine o sistema de vendas.', 'operacao', 'Básico', '#2196f3', false, true, '/assets/trails/uso-pdv.png'),
    ('Gestão de Estoque', 'Controle de insumos.', 'gestao', 'Intermediário', '#9c27b0', false, true, '/assets/trails/estoque.png'),
    ('Higiene e BPF', 'Boas Práticas de Fabricação.', 'operacao', 'Básico', '#00bcd4', true, true, '/assets/trails/higiene.png'),
    ('Delivery Perfeito', 'Delivery com qualidade.', 'operacao', 'Intermediário', '#ff5722', false, true, '/assets/trails/delivery.png'),
    ('Marketing Local', 'Estratégias de marketing regional.', 'marketing', 'Avançado', '#f44336', false, true, '/assets/trails/marketing.png'),
    ('Redes Sociais', 'Conteúdo que engaja e vende.', 'marketing', 'Intermediário', '#e91e63', false, true, '/assets/trails/redes-sociais.png'),
    ('Upselling & Cross', 'Aumente o ticket médio.', 'vendas', 'Avançado', '#ff9800', false, true, '/assets/trails/upselling.png'),
    ('CMV e Precificação', 'Custos e margens.', 'financeiro', 'Avançado', '#4caf50', false, true, '/assets/trails/cmv.png'),
    ('Fluxo de Caixa', 'Controle financeiro.', 'financeiro', 'Intermediário', '#03a9f4', true, true, '/assets/trails/fluxo-caixa.png'),
    ('Liderança no Grau', 'Gestão de equipe.', 'gestao', 'Avançado', '#ffc107', false, true, '/assets/trails/lideranca.png'),
    ('Cardápio Sazonal', 'Produtos temporários.', 'marketing', 'Intermediário', '#e040fb', false, true, '/assets/trails/cardapio-sazonal.png');

END $$;
