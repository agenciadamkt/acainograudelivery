import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

const STAFF_ROLES = ['admin', 'manager', 'franchisee_master']

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Autoriza a requisição de uma Edge Function de operação privilegiada.
 * Aceita dois tipos de chamador:
 *   1. Interno/cron — usa a SUPABASE_SERVICE_ROLE_KEY como Bearer token
 *      (padrão usado pelos jobs pg_cron / net.http_post).
 *   2. Usuário autenticado com role de staff (admin / manager / franchisee_master).
 *
 * Retorna `null` quando autorizado, ou uma `Response` de erro (401/403) quando não.
 * Uso:  const authError = await requireStaffOrService(req); if (authError) return authError;
 */
export async function requireStaffOrService(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return jsonError('Unauthorized', 401)

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  // Chamada interna/cron: autentica com a service_role key.
  if (serviceKey && token === serviceKey) return null

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  const caller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error } = await caller.auth.getUser()
  if (error || !user) return jsonError('Unauthorized', 401)

  const admin = createClient(supabaseUrl, serviceKey)
  const { data: roles } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .in('role', STAFF_ROLES)
    .limit(1)

  if (!roles || roles.length === 0) return jsonError('Forbidden', 403)

  return null
}
