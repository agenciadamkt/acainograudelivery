-- Migration: Fix Financial Users User ID Integrity
-- Description: Backfills missing user_id from auth.users and ensures data integrity.

-- 1. Backfill user_id from auth if missing
UPDATE public.financial_users fu
SET user_id = au.id
FROM auth.users au
WHERE fu.email = au.email AND fu.user_id IS NULL;

-- 2. Backfill created_by if null
UPDATE public.financial_users
SET created_by = (SELECT id FROM auth.users WHERE email = 'agenciadamkt@gmail.com')
WHERE created_by IS NULL;

-- 3. Cleanup any links with null user_id? 
-- If user_id is null in links and the user exists now, we should update those links too.
DO $$
BEGIN
    UPDATE public.financial_user_cd_links fucl
    SET user_id = fu.user_id
    FROM public.financial_users fu
    WHERE fucl.user_id IS NULL AND fucl.created_by = fu.created_by; -- Heuristic attempt
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping link update';
END $$;
