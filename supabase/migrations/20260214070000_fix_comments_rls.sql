-- Drop existing select policy containing the restriction
DROP POLICY IF EXISTS "Public sees approved comments" ON public.community_comments;

-- Create new policy that allows:
-- 1. Everyone to see approved comments
-- 2. Users to see their own comments (any status)
-- 3. Admin (agenciadamkt@gmail.com) to see ALL comments (including pending)
CREATE POLICY "Public sees approved, Admin sees all" ON public.community_comments 
FOR SELECT USING (
  status = 'approved' 
  OR auth.uid() = user_id 
  OR (auth.jwt() ->> 'email') = 'agenciadamkt@gmail.com'
);
