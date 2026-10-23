-- Canonical scheduled-campaign runner. Requires Vault secrets named
-- grauos_project_url and grauos_cron_secret_key to be provisioned first.
-- The latter must be the project's default Supabase secret API key.
DO $preflight$
DECLARE
  missing_secrets text;
  active_job text;
BEGIN
  SELECT string_agg(required.name, ', ')
    INTO missing_secrets
  FROM (VALUES ('grauos_project_url'), ('grauos_cron_secret_key')) AS required(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = required.name
  );
  IF missing_secrets IS NOT NULL THEN
    RAISE EXCEPTION 'Required Supabase Vault entries are missing: %', missing_secrets;
  END IF;

  SELECT jobname INTO active_job
  FROM cron.job
  WHERE jobname IN ('check-marketing-campaigns', 'check-marketing-campaigns-v2')
    AND active
  LIMIT 1;
  IF active_job IS NOT NULL THEN
    RAISE EXCEPTION 'Expected paused campaign job before migration: %', active_job;
  END IF;

  IF EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'grauos_project_url'
      AND decrypted_secret <> 'https://sixzfcpdjtnftacuwvph.supabase.co'
  ) THEN
    RAISE EXCEPTION 'Vault project URL does not match the expected project';
  END IF;
END;
$preflight$;

CREATE TABLE IF NOT EXISTS public.scheduled_campaign_runner_lock (
  lock_id boolean PRIMARY KEY DEFAULT true CHECK (lock_id),
  lease_until timestamptz NOT NULL DEFAULT '-infinity',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.scheduled_campaign_runner_lock (lock_id) VALUES (true)
ON CONFLICT (lock_id) DO NOTHING;
REVOKE ALL ON public.scheduled_campaign_runner_lock FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.scheduled_campaign_runner_lock TO service_role;

CREATE OR REPLACE FUNCTION public.acquire_scheduled_campaign_runner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE affected integer;
BEGIN
  UPDATE public.scheduled_campaign_runner_lock
  SET lease_until = clock_timestamp() + interval '15 minutes', updated_at = clock_timestamp()
  WHERE lock_id = true AND lease_until < clock_timestamp();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.renew_scheduled_campaign_runner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE affected integer;
BEGIN
  UPDATE public.scheduled_campaign_runner_lock
  SET lease_until = clock_timestamp() + interval '15 minutes', updated_at = clock_timestamp()
  WHERE lock_id = true AND lease_until >= clock_timestamp();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_scheduled_campaign_runner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE affected integer;
BEGIN
  UPDATE public.scheduled_campaign_runner_lock
  SET lease_until = '-infinity', updated_at = clock_timestamp()
  WHERE lock_id = true;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_scheduled_campaign(p_campaign_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE affected integer;
BEGIN
  UPDATE public.scheduled_campaigns
  SET status = 'sending'
  WHERE id = p_campaign_id
    AND status = 'pending'
    AND scheduled_for <= clock_timestamp();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected > 0;
END;
$function$;

REVOKE ALL ON FUNCTION public.acquire_scheduled_campaign_runner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.renew_scheduled_campaign_runner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_scheduled_campaign_runner() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_scheduled_campaign(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_scheduled_campaign_runner() TO service_role;
GRANT EXECUTE ON FUNCTION public.renew_scheduled_campaign_runner() TO service_role;
GRANT EXECUTE ON FUNCTION public.release_scheduled_campaign_runner() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_scheduled_campaign(uuid) TO service_role;

DO $schedule$
DECLARE existing_job record;
BEGIN
  FOR existing_job IN
    SELECT jobid, jobname FROM cron.job
    WHERE jobname IN (
      'check-marketing-campaigns',
      'check-marketing-campaigns-v2',
      'scheduled-campaigns-check-canonical'
    )
  LOOP
    PERFORM cron.unschedule(existing_job.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'scheduled-campaigns-check-canonical',
    '* * * * *',
    $cron$
      SELECT net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'grauos_project_url'),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'grauos_cron_secret_key')
        ),
        body := '{"mode":"process"}'::jsonb
      );
    $cron$
  );
END;
$schedule$;
