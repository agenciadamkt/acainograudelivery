-- Remove acesso direto ao access_token do MercadoPago para roles de cliente.
-- A coluna continua acessível via service_role (Edge Functions).
-- Isso é uma defesa em profundidade: mesmo que algum hook use select('*'),
-- o banco nunca devolve o segredo para anon/authenticated.

REVOKE SELECT (mercadopago_access_token) ON public.stores FROM anon;
REVOKE SELECT (mercadopago_access_token) ON public.stores FROM authenticated;
