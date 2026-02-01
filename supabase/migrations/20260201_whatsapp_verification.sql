-- ============================================
-- TABELA PARA VERIFICAÇÃO VIA WHATSAPP
-- ============================================

-- 1. Criar tabela para armazenar códigos de verificação
CREATE TABLE IF NOT EXISTS whatsapp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    name VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Criar índice para busca rápida por telefone
CREATE INDEX IF NOT EXISTS idx_whatsapp_verifications_phone ON whatsapp_verifications(phone);

-- 3. Criar índice para limpeza de códigos expirados
CREATE INDEX IF NOT EXISTS idx_whatsapp_verifications_expires ON whatsapp_verifications(expires_at);

-- 4. Função para limpar códigos expirados automaticamente
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS void AS $$
BEGIN
    DELETE FROM whatsapp_verifications WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 5. Permissões (anon pode inserir/verificar, mas não ler todos)
ALTER TABLE whatsapp_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert verification" ON whatsapp_verifications;
CREATE POLICY "Anyone can insert verification" ON whatsapp_verifications
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can verify their code" ON whatsapp_verifications;
CREATE POLICY "Anyone can verify their code" ON whatsapp_verifications
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update verification" ON whatsapp_verifications;
CREATE POLICY "Anyone can update verification" ON whatsapp_verifications
    FOR UPDATE USING (true);

-- 6. Conceder permissões
GRANT SELECT, INSERT, UPDATE ON whatsapp_verifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_verifications TO authenticated;
GRANT ALL ON whatsapp_verifications TO service_role;

-- ============================================
-- Verificação
-- ============================================
SELECT 'Tabela whatsapp_verifications criada com sucesso!' AS status;
