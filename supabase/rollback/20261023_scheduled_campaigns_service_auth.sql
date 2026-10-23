-- Compensating rollback for 20261023120000_scheduled_campaigns_service_auth.sql.
-- Keep this outside supabase/migrations so normal migration deployment does
-- not immediately undo the scheduler change. Run only as an explicit rollback.
-- This stops the canonical scheduler and removes only objects from that change;
-- the two obsolete jobs remain removed.
DO $rollback$
DECLARE canonical_job_id bigint;
BEGIN
  SELECT jobid INTO canonical_job_id
  FROM cron.job
  WHERE jobname = 'scheduled-campaigns-check-canonical'
  LIMIT 1;
  IF canonical_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(canonical_job_id);
  END IF;
END;
$rollback$;

DROP FUNCTION IF EXISTS public.claim_scheduled_campaign(uuid);
DROP FUNCTION IF EXISTS public.release_scheduled_campaign_runner();
DROP FUNCTION IF EXISTS public.renew_scheduled_campaign_runner();
DROP FUNCTION IF EXISTS public.acquire_scheduled_campaign_runner();
DROP TABLE IF EXISTS public.scheduled_campaign_runner_lock;
