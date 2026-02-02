-- ============================================
-- LIMPAR DADOS PARA NOVO CADASTRO DE TESTE
-- Execute no SQL Editor do Supabase
-- ============================================

-- 1. Primeiro, veja o que vai ser removido:
SELECT 'VERIFICAÇÕES:' as tipo, phone, code, verified, created_at FROM whatsapp_verifications WHERE phone = '86994373802';
SELECT 'CLIENTE:' as tipo, name, phone, email FROM customers WHERE phone = '86994373802';

-- 2. Agora limpe os dados:

-- Deletar verificações do telefone
DELETE FROM whatsapp_verifications WHERE phone = '86994373802';

-- Deletar cliente do telefone  
DELETE FROM customers WHERE phone = '86994373802';

-- 3. Ver usuários que precisam ser deletados no Dashboard:
SELECT id, email, raw_user_meta_data->>'phone' as phone, created_at 
FROM auth.users 
WHERE raw_user_meta_data->>'phone' = '86994373802'
   OR email LIKE '%86994373802%';

-- ⚠️ IMPORTANTE: 
-- Você também precisa deletar o usuário no Dashboard:
-- Acesse: Authentication → Users → Encontre e delete o usuário

-- 4. Verificar se já existe alguém com o email:
SELECT id, email FROM auth.users WHERE email = 'marketinglinkmedix@gmail.com';

-- Se retornar resultado, esse email já está cadastrado!
-- Você pode deletá-lo no Dashboard ou usar outro email
