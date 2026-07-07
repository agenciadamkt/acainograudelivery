-- Garante que agenciadamkt@gmail.com sempre tem franchisee_master
INSERT INTO user_roles (user_id, role)
SELECT au.id, 'franchisee_master'::app_role
FROM auth.users au
WHERE au.email = 'agenciadamkt@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Remove qualquer outro role do master (deixa só franchisee_master)
DELETE FROM user_roles
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'agenciadamkt@gmail.com')
  AND role != 'franchisee_master';

-- Diagnóstico: mostra estado atual de todos os usuários
SELECT
  au.email,
  up.perfil,
  up.ativo,
  STRING_AGG(ur.role::text, ', ') AS roles
FROM auth.users au
LEFT JOIN user_profiles up ON up.id = au.id
LEFT JOIN user_roles ur ON ur.user_id = au.id
GROUP BY au.email, up.perfil, up.ativo
ORDER BY au.email;
