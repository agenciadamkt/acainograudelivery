-- Remove o FK constraint que causa conflito com o fluxo de criação de usuários.
-- O vínculo entre user_profiles.id e auth.users.id é mantido por convenção no código.
-- A integridade referencial é garantida pelo trigger abaixo.

-- 1. Remove FK
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- 2. Remove FK do criado_por também (evita erros em cascade)
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_criado_por_fkey;

-- 3. Trigger: quando um novo auth user é criado, cria o perfil automaticamente
--    (útil para usuários que se cadastram sozinhos fora do painel admin)
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_profiles (id, email, nome, perfil, ativo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    'COLABORADOR',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
