import { assertEquals } from 'jsr:@std/assert@1';
import { createScheduledCampaignHandler, runCampaigns } from './index.ts';

const fakeContext = { authMode: 'secret', supabaseAdmin: {} as never };

Deno.test('dry-run returns readiness without invoking the campaign processor', async () => {
  let processCalls = 0;
  const handler = createScheduledCampaignHandler({
    readiness: async () => ({ ready: true }),
    process: async () => {
      processCalls++;
      return new Response('processed');
    },
  });
  const response = await handler(new Request('http://localhost/function', {
    method: 'POST', body: JSON.stringify({ mode: 'dry-run' }),
  }), fakeContext);
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { mode: 'dry-run', ready: true });
  assertEquals(processCalls, 0);
});

Deno.test('dry-run returns 503 when readiness checks fail', async () => {
  const handler = createScheduledCampaignHandler({
    readiness: async () => ({ ready: false, reason: 'configuration_unavailable' }),
    process: async () => new Response('unexpected'),
  });
  const response = await handler(new Request('http://localhost/function', {
    method: 'POST', body: JSON.stringify({ mode: 'healthcheck' }),
  }), fakeContext);
  assertEquals(response.status, 503);
});

function campaignQuery(campaigns: unknown[]) {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'lte', 'order', 'limit']) {
    query[method] = () => query;
  }
  query.then = (resolve: (result: unknown) => void) => resolve({ data: campaigns, error: null });
  return query;
}

Deno.test('runner skips when another invocation holds the global lease', async () => {
  let leaseHeld = false;
  const supabase = {
    rpc: async (name: string) => {
      if (name === 'acquire_scheduled_campaign_runner') {
        if (leaseHeld) return { data: false, error: null };
        leaseHeld = true;
        return { data: true, error: null };
      }
      if (name === 'release_scheduled_campaign_runner') leaseHeld = false;
      return { data: true, error: null };
    },
    from: () => campaignQuery([]),
  };
  const first = runCampaigns(supabase as never);
  const second = await runCampaigns(supabase as never);
  assertEquals(await second.json(), { success: true, skipped: 'already_running' });
  assertEquals((await first).status, 200);
});

Deno.test('runner does not process a campaign already claimed elsewhere', async () => {
  const rpcCalls: string[] = [];
  const supabase = {
    rpc: async (name: string) => {
      rpcCalls.push(name);
      if (name === 'claim_scheduled_campaign') return { data: false, error: null };
      return { data: true, error: null };
    },
    from: () => campaignQuery([{ id: '00000000-0000-4000-8000-000000000001' }]),
  };
  const response = await runCampaigns(supabase as never);
  assertEquals(response.status, 200);
  assertEquals(rpcCalls, [
    'acquire_scheduled_campaign_runner',
    'claim_scheduled_campaign',
    'release_scheduled_campaign_runner',
  ]);
});
