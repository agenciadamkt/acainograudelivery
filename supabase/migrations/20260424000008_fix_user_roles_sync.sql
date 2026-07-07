-- ═══════════════════════════════════════════════════════════════
-- Sincroniza user_roles com perfil do user_profiles
-- ═══════════════════════════════════════════════════════════════

-- Atualiza o trigger para também criar user_roles ao criar auth user
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cria perfil básico
  INSERT INTO user_profiles (id, email, nome, perfil, ativo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    'COLABORADOR',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  -- Cria role padrão
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'staff')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Função para mapear perfil RBAC → app_role existente
CREATE OR REPLACE FUNCTION perfil_to_app_role(p TEXT)
RETURNS app_role
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p
    WHEN 'MASTER'      THEN 'franchisee_master'::app_role
    WHEN 'FRANQUEADO'  THEN 'manager'::app_role
    ELSE                    'staff'::app_role
  END;
$$;

-- Adiciona user_roles faltantes para usuários existentes
INSERT INTO user_roles (user_id, role)
SELECT
  up.id,
  perfil_to_app_role(up.perfil)
FROM user_profiles up
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = up.id
)
ON CONFLICT DO NOTHING;
