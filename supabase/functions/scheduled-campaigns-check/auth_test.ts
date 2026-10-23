import { withSupabase } from 'npm:@supabase/server@1';
import { assertEquals } from 'jsr:@std/assert@1';

const randomBytes = crypto.getRandomValues(new Uint8Array(32));
const encodedKey = btoa(String.fromCharCode(...randomBytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
const secretKey = `sb_secret_${encodedKey}`;
const publishableKey = `sb_publishable_${encodedKey}`;

Deno.test('service auth accepts the configured secret only from apikey', async () => {
  const previousUrl = Deno.env.get('SUPABASE_URL');
  const previousKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  const previousPublishableKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  Deno.env.set('SUPABASE_URL', 'http://127.0.0.1:54321');
  Deno.env.set('SUPABASE_SECRET_KEYS', JSON.stringify({ default: secretKey }));
  Deno.env.set('SUPABASE_PUBLISHABLE_KEYS', JSON.stringify({ default: publishableKey }));

  try {
    const handler = withSupabase({ auth: ['user', 'secret'] }, async () => new Response('accepted', { status: 200 }));
    const valid = await handler(new Request('http://localhost/function', {
      method: 'POST', headers: { apikey: secretKey },
    }));
    assertEquals(valid.status, 200);

    const invalid = await handler(new Request('http://localhost/function', {
      method: 'POST', headers: { apikey: 'invalid-key' },
    }));
    assertEquals(invalid.status, 401);

    const bearerOnly = await handler(new Request('http://localhost/function', {
      method: 'POST', headers: { Authorization: `Bearer ${secretKey}` },
    }));
    assertEquals(bearerOnly.status, 401);
  } finally {
    if (previousUrl === undefined) Deno.env.delete('SUPABASE_URL');
    else Deno.env.set('SUPABASE_URL', previousUrl);
    if (previousKeys === undefined) Deno.env.delete('SUPABASE_SECRET_KEYS');
    else Deno.env.set('SUPABASE_SECRET_KEYS', previousKeys);
    if (previousPublishableKeys === undefined) Deno.env.delete('SUPABASE_PUBLISHABLE_KEYS');
    else Deno.env.set('SUPABASE_PUBLISHABLE_KEYS', previousPublishableKeys);
  }
});
