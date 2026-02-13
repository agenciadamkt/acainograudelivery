-- FIX: Add RLS policies to allow authenticated users to Manage University Content
-- Run this in your Supabase SQL Editor to fix the "Error saving lesson" issue.

-- 1. Trails
CREATE POLICY "Allow authenticated insert trails" ON public.uni_trails FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update trails" ON public.uni_trails FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete trails" ON public.uni_trails FOR DELETE TO authenticated USING (true);

-- 2. Lessons
CREATE POLICY "Allow authenticated insert lessons" ON public.uni_lessons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update lessons" ON public.uni_lessons FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete lessons" ON public.uni_lessons FOR DELETE TO authenticated USING (true);

-- 3. Materials
CREATE POLICY "Allow authenticated insert materials" ON public.uni_materials FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated delete materials" ON public.uni_materials FOR DELETE TO authenticated USING (true);

-- 4. Links
CREATE POLICY "Allow authenticated insert links" ON public.uni_links FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated delete links" ON public.uni_links FOR DELETE TO authenticated USING (true);

-- 5. Questions (Add update for answering)
CREATE POLICY "Allow authenticated update questions" ON public.uni_questions FOR UPDATE TO authenticated USING (true);
