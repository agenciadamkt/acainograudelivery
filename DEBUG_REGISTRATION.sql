-- ============================================
-- DEBUG: Verificar problemas no cadastro
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Ver últimas verificações de WhatsApp
SELECT 
    id,
    phone,
    code,
    name,
    verified,
    expires_at,
    created_at,
    CASE 
        WHEN expires_at < NOW() THEN '❌ EXPIRADO'
        ELSE '✅ VÁLIDO'
    END as status
FROM whatsapp_verifications 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Ver se há clientes com o telefone que está tentando cadastrar
-- Substitua o número abaixo pelo telefone que está testando
SELECT * FROM customers WHERE phone LIKE '%86994373802%';

-- 3. Ver se há usuários com o email que está tentando cadastrar
SELECT id, email, created_at FROM auth.users 
WHERE email LIKE '%86994373802%' 
   OR email = 'marketinglinkmedix@gmail.com';

-- 4. Se precisar limpar os dados para testar novamente:
-- CUIDADO: Isso apagará os dados de teste!

-- Apagar verificações antigas do telefone:
-- DELETE FROM whatsapp_verifications WHERE phone = '86994373802';

-- Apagar cliente (se existir):
-- DELETE FROM customers WHERE phone = '86994373802';

-- Obs: Para apagar usuário do auth.users, use o Supabase Dashboard
