# Scheduled campaign runner rollout

## Findings

- The Edge Function used a custom guard that accepted a service role value only as `Authorization: Bearer ...`; it did not authenticate service calls from `apikey`.
- `supabase/config.toml` had no explicit entry for this function, so the platform default JWT verification ran before the handler.
- The handler changed a campaign to `sending` without an atomic claim, had no runner-wide overlap guard, and returned HTTP 200 for uncaught processing errors.
- The two production cron jobs described in the incident are not created by migrations in this repository. The repository cannot prove which production job was the latest; the `v2` suffix alone is not proof.
- XP remains a product feature with a documented inactivity rule in the driver career UI. The implementation of `apply_inactivity_decay()` and its underlying persistence could not be found in this repository or the searched Git history. Keep the production XP job paused and investigate it separately; this campaign change does not touch it.

## Authentication and rollout requirements

The function uses Supabase's `@supabase/server` wrapper with `user` and `secret` auth modes. User calls still require a valid user JWT and a staff role. Service calls use the project's default secret API key on `apikey`; the API key is never sent as a bearer token.

The cron migration reads these existing Vault entry names at execution time:

- `grauos_project_url`
- `grauos_cron_secret_key`

Provision them in the Supabase Dashboard's Vault before applying the migration. The secret entry must hold the current default `sb_secret_...` API key for this exact project. Do not put any key in Git, SQL source, CLI arguments, or logs. The migration checks that both names exist and that the URL matches the project ref, but it cannot prove that the secret value is a current default secret key. A successful authenticated healthcheck must prove that before applying the migration.

Roll out in this order:

1. Confirm project API keys support the current `@supabase/server` user and secret auth modes. In particular, verify that existing staff JWTs are accepted with the function's platform `verify_jwt` setting disabled. If the project still uses a legacy JWT format that the wrapper cannot validate, stop and plan that compatibility change separately.
2. Deploy the Edge Function without enabling any cron job.
3. Call `{ "mode": "healthcheck" }` using a valid user/staff session or a secret key on `apikey`. The healthcheck checks the campaign schema without returning rows, verifies the Uazapi instance status, and obtains an FCM access token. It does not query customers, send WhatsApp/push, or mutate campaign data. Expect 2xx only when those checks pass.
4. Apply `20261023120000_scheduled_campaigns_service_auth.sql`. Its preflight requires the two named campaign jobs to be paused and the Vault entries to exist. It removes only those two names, preserves the XP and birthday jobs, and creates `scheduled-campaigns-check-canonical` at one-minute intervals.
5. Confirm the canonical job's three consecutive HTTP responses are 2xx and that no campaign is duplicated. Disable the canonical job immediately for any 401, timeout, or duplicate.

The migration has a compensating script at `supabase/rollback/20261023_scheduled_campaigns_service_auth.sql`. It stops the canonical scheduler and removes only its lock/claim objects. It intentionally does not recreate the two obsolete jobs. Keep this file outside `supabase/migrations` so a normal migration push cannot immediately undo the change.

## Validation boundary

Local tests use generated synthetic keys and mocks. They prove the wrapper's `apikey` behavior and that dry-run/claim/lease branches do not invoke campaign delivery. They do not prove production Vault configuration, the live project JWT format, production cron metadata, external service credentials, or three live 2xx runs. Do not mark the incident resolved until those production checks have been observed.
