-- ============================================
-- FIX: PERMISSÕES PARA WHATSAPP VERIFICATIONS
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Verificar se a tabela existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'whatsapp_verifications') THEN
        CREATE TABLE whatsapp_verifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            phone VARCHAR(20) NOT NULL,
            code VARCHAR(6) NOT NULL,
            name VARCHAR(255),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
            verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. Garantir que RLS está habilitado
ALTER TABLE whatsapp_verifications ENABLE ROW LEVEL SECURITY;

-- 3. Remover todas as policies antigas
DROP POLICY IF EXISTS "Anyone can insert verification" ON whatsapp_verifications;
DROP POLICY IF EXISTS "Anyone can verify their code" ON whatsapp_verifications;
DROP POLICY IF EXISTS "Anyone can update verification" ON whatsapp_verifications;
DROP POLICY IF EXISTS "Service can delete expired" ON whatsapp_verifications;
DROP POLICY IF EXISTS "Enable all for service_role" ON whatsapp_verifications;
DROP POLICY IF EXISTS "anon_insert" ON whatsapp_verifications;
DROP POLICY IF EXISTS "anon_select" ON whatsapp_verifications;
DROP POLICY IF EXISTS "anon_update" ON whatsapp_verifications;
DROP POLICY IF EXISTS "anon_delete" ON whatsapp_verifications;

-- 4. Criar policy que permite TUDO para service_role (usado pelas Edge Functions)
CREATE POLICY "Enable all for service_role" ON whatsapp_verifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. Criar policies para anon (caso as Edge Functions usem anon key por engano)
CREATE POLICY "anon_insert" ON whatsapp_verifications
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "anon_select" ON whatsapp_verifications
    FOR SELECT TO anon
    USING (true);

CREATE POLICY "anon_update" ON whatsapp_verifications
    FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "anon_delete" ON whatsapp_verifications
    FOR DELETE TO anon
    USING (true);

-- 6. Também para authenticated
CREATE POLICY "authenticated_all" ON whatsapp_verifications
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 7. Conceder permissões explícitas
GRANT ALL ON whatsapp_verifications TO anon;
GRANT ALL ON whatsapp_verifications TO authenticated;
GRANT ALL ON whatsapp_verifications TO service_role;

-- 8. Verificar
SELECT 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE tablename = 'whatsapp_verifications';
