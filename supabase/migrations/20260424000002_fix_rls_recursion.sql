-- ═══════════════════════════════════════════════════════════════
-- Fix: infinite recursion in user_profiles RLS policies
-- Solução: funções SECURITY DEFINER que bypassam o RLS
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Funções auxiliares (SECURITY DEFINER bypassa RLS) ────────

CREATE OR REPLACE FUNCTION get_my_perfil()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT perfil FROM user_profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_unidade_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT unidade_id FROM user_profiles WHERE id = auth.uid()
$$;

-- ── 2. Recriar policies de user_profiles sem recursão ───────────

DROP POLICY IF EXISTS "users_read_own_profile"      ON user_profiles;
DROP POLICY IF EXISTS "master_read_all_profiles"    ON user_profiles;
DROP POLICY IF EXISTS "master_write_profiles"       ON user_profiles;
DROP POLICY IF EXISTS "franqueado_manage_unit_users" ON user_profiles;

-- Qualquer usuário lê o próprio perfil
CREATE POLICY "users_read_own_profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Master lê todos
CREATE POLICY "master_read_all_profiles"
  ON user_profiles FOR SELECT
  USING (get_my_perfil() = 'MASTER');

-- Master escreve todos (exceto is_protected via app logic)
CREATE POLICY "master_insert_profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (get_my_perfil() = 'MASTER');

CREATE POLICY "master_update_profiles"
  ON user_profiles FOR UPDATE
  USING (get_my_perfil() = 'MASTER');

CREATE POLICY "master_delete_profiles"
  ON user_profiles FOR DELETE
  USING (get_my_perfil() = 'MASTER');

-- Franqueado lê colaboradores da própria unidade
CREATE POLICY "franqueado_read_unit_users"
  ON user_profiles FOR SELECT
  USING (
    get_my_perfil() = 'FRANQUEADO'
    AND unidade_id = get_my_unidade_id()
    AND perfil = 'COLABORADOR'
  );

-- Franqueado cria colaboradores na própria unidade
CREATE POLICY "franqueado_insert_unit_users"
  ON user_profiles FOR INSERT
  WITH CHECK (
    get_my_perfil() = 'FRANQUEADO'
    AND unidade_id = get_my_unidade_id()
    AND perfil = 'COLABORADOR'
  );

-- Franqueado atualiza colaboradores da própria unidade
CREATE POLICY "franqueado_update_unit_users"
  ON user_profiles FOR UPDATE
  USING (
    get_my_perfil() = 'FRANQUEADO'
    AND unidade_id = get_my_unidade_id()
    AND perfil = 'COLABORADOR'
  );

-- Usuário atualiza o próprio perfil (dados pessoais)
CREATE POLICY "users_update_own_profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- ── 3. Recriar policies de rbac_usuario_permissoes ──────────────

DROP POLICY IF EXISTS "master_manage_all_permissions"      ON rbac_usuario_permissoes;
DROP POLICY IF EXISTS "franqueado_manage_unit_permissions" ON rbac_usuario_permissoes;
DROP POLICY IF EXISTS "users_read_own_permissions"        ON rbac_usuario_permissoes;

CREATE POLICY "users_read_own_permissions"
  ON rbac_usuario_permissoes FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "master_manage_all_permissions"
  ON rbac_usuario_permissoes FOR ALL
  USING (get_my_perfil() = 'MASTER');

CREATE POLICY "franqueado_manage_unit_permissions"
  ON rbac_usuario_permissoes FOR ALL
  USING (get_my_perfil() = 'FRANQUEADO');

-- ── 4. Recriar policies de rbac_auditoria ───────────────────────

DROP POLICY IF EXISTS "master_read_audit" ON rbac_auditoria;

CREATE POLICY "master_read_audit"
  ON rbac_auditoria FOR SELECT
  USING (get_my_perfil() IN ('MASTER', 'FRANQUEADO'));

CREATE POLICY "authenticated_insert_audit"
  ON rbac_auditoria FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── 5. Recriar policies de user_unidades ────────────────────────

DROP POLICY IF EXISTS "users_read_own_unidades"           ON user_unidades;
DROP POLICY IF EXISTS "master_manage_unidades"            ON user_unidades;
DROP POLICY IF EXISTS "franqueado_manage_unit_unidades"   ON user_unidades;

CREATE POLICY "users_read_own_unidades"
  ON user_unidades FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "master_manage_unidades"
  ON user_unidades FOR ALL
  USING (get_my_perfil() = 'MASTER');

CREATE POLICY "franqueado_manage_unidades"
  ON user_unidades FOR ALL
  USING (get_my_perfil() = 'FRANQUEADO');
