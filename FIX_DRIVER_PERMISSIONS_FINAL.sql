-- FIX COMPLETO DE PERMISSÕES PARA O APP DO ENTREGADOR

-- 1. Garante permissões de LEITURA e ESCRITA nas tabelas principais
GRANT SELECT, INSERT, UPDATE, DELETE ON "public"."delivery_drivers" TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE         ON "public"."orders"           TO anon, authenticated, service_role;
GRANT SELECT                         ON "public"."customers"        TO anon, authenticated, service_role;
GRANT SELECT                         ON "public"."customer_addresses" TO anon, authenticated, service_role;

-- 2. Garante uso das Sequências (para IDs automáticos)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 3. Recria as Políticas de Segurança (RLS) para serem permissivas para o APP

-- Tabela: delivery_drivers
ALTER TABLE "public"."delivery_drivers" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Driver Public Policies" ON "public"."delivery_drivers";
CREATE POLICY "Driver Public Policies" ON "public"."delivery_drivers" 
FOR ALL USING (true) WITH CHECK (true);

-- Tabela: orders
ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Orders Public Policies" ON "public"."orders";
CREATE POLICY "Orders Public Policies" ON "public"."orders" 
FOR ALL USING (true) WITH CHECK (true);

-- Tabela: customers
ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Customers Public Read" ON "public"."customers";
CREATE POLICY "Customers Public Read" ON "public"."customers" 
FOR SELECT USING (true);

-- Tabela: customer_addresses
ALTER TABLE "public"."customer_addresses" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Addresses Public Read" ON "public"."customer_addresses";
CREATE POLICY "Addresses Public Read" ON "public"."customer_addresses" 
FOR SELECT USING (true);

-- 4. Confirmação
SELECT 'Permissões corrigidas com sucesso!' as status;
