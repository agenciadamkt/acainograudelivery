-- Community Posts
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('case', 'announcement', 'tip')),
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Gamification Challenges
CREATE TABLE IF NOT EXISTS public.gamification_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_points INTEGER NOT NULL DEFAULT 100,
  icon TEXT DEFAULT '🎯',
  end_date TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_challenges ENABLE ROW LEVEL SECURITY;

-- Policies
-- Posts: Everyone can read, Authenticated can create (for now, ideal is granular role check)
CREATE POLICY "Public read posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated create posts" ON public.community_posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users delete own posts" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

-- Challenges: Everyone can read, Authenticated can create (admin logic in app level for MVP)
CREATE POLICY "Public read challenges" ON public.gamification_challenges FOR SELECT USING (true);
CREATE POLICY "Authenticated create challenges" ON public.gamification_challenges FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated update challenges" ON public.gamification_challenges FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete challenges" ON public.gamification_challenges FOR DELETE USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX idx_gamification_challenges_end_date ON public.gamification_challenges(end_date);
