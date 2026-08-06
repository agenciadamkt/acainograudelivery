-- ═══════════════════════════════════════════════════════════════
-- 🚨 FASE 2 — tira ESCRITA anônima de orders e delivery_drivers
--
-- Hoje, sem nenhum login, é possível APAGAR pedidos e entregadores:
--
--   orders            "Orders Public Policies"     ALL  {public}  USING(true)
--                     "Public Full Access Orders"  ALL  {public}  USING(true)
--   delivery_drivers  "Public Full Access Drivers" ALL  {public}  USING(true)
--                     "Driver Public Policies"     ALL  {public}  USING(true)
--
-- `ALL` cobre SELECT + INSERT + UPDATE + DELETE. Qualquer pessoa com a
-- chave publicável (que está no bundle JS) pode rodar um DELETE e limpar
-- a tabela de pedidos.
--
-- ── Por que este script é seguro ────────────────────────────────
-- As duas tabelas JÁ têm policies dedicadas para o que os fluxos
-- anônimos realmente precisam:
--
--   orders            "Public Read Orders"    SELECT {public}
--                     "Public Update Orders"  UPDATE {public}
--   delivery_drivers  "Public Read Drivers"   SELECT {public}
--                     "Anyone can read drivers" SELECT {public}
--                     "Public Update Drivers" UPDATE {public}
--                     "Drivers can update own location" UPDATE {public}
--
-- Apagando só as `ALL`, sobram SELECT e UPDATE — exatamente o que a
-- página pública de acompanhamento (/tracking/:orderId) e o app do
-- entregador usam. O que sai é INSERT e DELETE anônimos, que nenhum
-- fluxo legítimo usa: o checkout cria pedido com o cliente LOGADO
-- (Checkout.tsx usa user.id do useAuth).
--
-- Rodar no Supabase → SQL Editor. Idempotente.
-- ═══════════════════════════════════════════════════════════════

-- ── orders ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Orders Public Policies"    ON public.orders;
DROP POLICY IF EXISTS "Public Full Access Orders" ON public.orders;

-- ── delivery_drivers ────────────────────────────────────────────
DROP POLICY IF EXISTS "Public Full Access Drivers" ON public.delivery_drivers;
DROP POLICY IF EXISTS "Driver Public Policies"     ON public.delivery_drivers;

-- ═══════════════════════════════════════════════════════════════
-- CONFERÊNCIA
-- ═══════════════════════════════════════════════════════════════

-- Não deve sobrar nenhuma policy ALL para {public} nestas duas:
SELECT tablename, policyname, cmd, roles::text
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'delivery_drivers')
ORDER BY tablename, cmd, policyname;

-- Esperado depois de rodar:
--   delivery_drivers  Anyone can read drivers           SELECT  {public}
--   delivery_drivers  Public Read Drivers               SELECT  {public}
--   delivery_drivers  Drivers can update own location   UPDATE  {public}
--   delivery_drivers  Public Update Drivers             UPDATE  {public}
--   orders            Public Read Orders                SELECT  {public}
--   orders            Public Update Orders              UPDATE  {public}
--   (+ as policies de admin/staff que já existiam)

-- ── Teste de fumaça depois de rodar ─────────────────────────────
-- 1. /tracking/<numero-de-um-pedido> ainda mostra o pedido
-- 2. Login do entregador em /driver/login ainda funciona
-- 3. Checkout no app do cliente ainda fecha pedido
-- Se os três passarem, a fase 2 está concluída.

-- ═══════════════════════════════════════════════════════════════
-- ⚠️ O QUE ESTE SCRIPT **NÃO** RESOLVE
--
-- Continua possível, sem login, LER a tabela inteira de pedidos, de
-- clientes e de entregadores. Isso não dá para fechar só com policy,
-- porque dois fluxos dependem de leitura anônima:
--
-- 1. /tracking/:orderId é rota pública e faz join em customers(name,
--    phone), customer_addresses e delivery_drivers. É por isso que
--    `customers` está aberta para leitura.
--
-- 2. O login do entregador NÃO TEM SENHA. Veja
--    src/pages/driver/DriverLogin.tsx — ele consulta delivery_drivers
--    por telefone e, se achar, grava driver_id no localStorage. O
--    próprio código comenta "simple auth for now". Para essa consulta
--    funcionar, a tabela precisa ser legível sem login. Some-se a isso
--    o fato de a tabela inteira ser legível: dá para listar todos os
--    entregadores com seus telefones e entrar como qualquer um deles.
--
-- Corrigir de verdade exige mudar o produto, não a policy:
--   · tracking por token secreto na URL, em vez de order_number
--     adivinhável — aí a leitura anônima deixa de precisar ser ampla
--   · login de entregador com senha ou OTP, virando usuário do auth
--     (o CheckGrau já faz isso em collaborator-pin-login e serve de
--     modelo pronto)
--
-- Enquanto isso não acontece, esta fase 2 remove o pior: ninguém mais
-- apaga pedido nem cria entregador sem estar logado.
-- ═══════════════════════════════════════════════════════════════
