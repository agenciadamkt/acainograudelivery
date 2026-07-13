-- ============================================================================
-- MÓDULO FISCAL — Fase 5: cifra/decifra do token PlugNotas (pgcrypto)
--
-- A chave de cifra NÃO fica no banco: é passada pela edge function a cada
-- chamada (Deno.env FISCAL_ENCRYPTION_KEY). As funções são SECURITY DEFINER e
-- executáveis SOMENTE por service_role — nenhum cliente (anon/authenticated)
-- consegue chamá-las, então o token nunca vaza para o frontend.
-- ============================================================================

-- Grava o token cifrado
CREATE OR REPLACE FUNCTION public.fiscal_set_token(_company_id uuid, _token text, _key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  UPDATE public.fiscal_companies
     SET token_encrypted = pgp_sym_encrypt(_token, _key),
         updated_at = now()
   WHERE id = _company_id;
$$;

-- Lê o token em texto claro (somente server-side)
CREATE OR REPLACE FUNCTION public.fiscal_get_token(_company_id uuid, _key text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT pgp_sym_decrypt(token_encrypted, _key)
    FROM public.fiscal_companies
   WHERE id = _company_id
     AND token_encrypted IS NOT NULL;
$$;

-- Trava execução: apenas service_role (edge functions) pode chamar
REVOKE ALL ON FUNCTION public.fiscal_set_token(uuid, text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.fiscal_get_token(uuid, text)       FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fiscal_set_token(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.fiscal_get_token(uuid, text)       TO service_role;
