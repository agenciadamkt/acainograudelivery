-- Create Post Types table
CREATE TABLE IF NOT EXISTS public.community_post_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL, -- e.g. "Anúncio"
    value TEXT NOT NULL UNIQUE, -- e.g. "announcement"
    color TEXT DEFAULT 'blue', -- blue, green, yellow, etc
    icon TEXT, -- emoji or icon name
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed defaults
INSERT INTO public.community_post_types (label, value, color, icon) VALUES
('Anúncio Oficial', 'announcement', 'blue', '📢'),
('Case de Sucesso', 'case', 'green', '📊'),
('Dica Operacional', 'tip', 'yellow', '💡')
ON CONFLICT (value) DO NOTHING;

-- Remove constraint from posts
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'community_posts_type_check' 
        AND table_name = 'community_posts'
    ) THEN
        ALTER TABLE public.community_posts DROP CONSTRAINT community_posts_type_check;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.community_post_types ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read types" ON public.community_post_types FOR SELECT USING (true);
CREATE POLICY "Admin manage types" ON public.community_post_types FOR ALL USING (auth.role() = 'authenticated');
