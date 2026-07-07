-- ═══════════════════════════════════════════════════════════════
-- RLS Fix — versão segura, sem loops dinâmicos
-- Cole e execute inteiro no SQL Editor do Supabase
-- ═══════════════════════════════════════════════════════════════

-- ── user_profiles: remove TODAS as policies conhecidas ──────────
DROP POLICY IF EXISTS "users_read_own_profile"       ON user_profiles;
DROP POLICY IF EXISTS "master_read_all_profiles"     ON user_profiles;
DROP POLICY IF EXISTS "master_write_profiles"        ON user_profiles;
DROP POLICY IF EXISTS "master_insert_profiles"       ON user_profiles;
DROP POLICY IF EXISTS "master_update_profiles"       ON user_profiles;
DROP POLICY IF EXISTS "master_delete_profiles"       ON user_profiles;
DROP POLICY IF EXISTS "franqueado_manage_unit_users" ON user_profiles;
DROP POLICY IF EXISTS "franqueado_read_unit_users"   ON user_profiles;
DROP POLICY IF EXISTS "franqueado_insert_unit_users" ON user_profiles;
DROP POLICY IF EXISTS "franqueado_update_unit_users" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile"     ON user_profiles;
DROP POLICY IF EXISTS "read_own"                     ON user_profiles;
DROP POLICY IF EXISTS "update_own"                   ON user_profiles;
DROP POLICY IF EXISTS "managers_read_all"            ON user_profiles;
DROP POLICY IF EXISTS "managers_insert"              ON user_profiles;
DROP POLICY IF EXISTS "managers_update_all"          ON user_profiles;
DROP POLICY IF EXISTS "master_delete"                ON user_profiles;

-- ── user_profiles: novas policies sem recursão ──────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "up_read_own"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "up_update_own"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "up_managers_read"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('franchisee_master','admin','manager')
    )
  );

CREATE POLICY "up_managers_insert"
  ON user_profiles FOR INSERT
  WITH CHECK (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('franchisee_master','admin','manager')
    )
  );

CREATE POLICY "up_managers_update"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('franchisee_master','admin','manager')
    )
  );

CREATE POLICY "up_master_delete"
  ON user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'franchisee_master'
    )
  );

-- ── rbac_usuario_permissoes ──────────────────────────────────────
DROP POLICY IF EXISTS "master_manage_all_permissions"      ON rbac_usuario_permissoes;
DROP POLICY IF EXISTS "franqueado_manage_unit_permissions" ON rbac_usuario_permissoes;
DROP POLICY IF EXISTS "users_read_own_permissions"         ON rbac_usuario_permissoes;
DROP POLICY IF EXISTS "read_own_permissions"               ON rbac_usuario_permissoes;
DROP POLICY IF EXISTS "managers_manage_permissions"        ON rbac_usuario_permissoes;

ALTER TABLE rbac_usuario_permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perm_read_own"
  ON rbac_usuario_permissoes FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "perm_managers_all"
  ON rbac_usuario_permissoes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('franchisee_master','admin','manager')
    )
  );

-- ── rbac_auditoria ───────────────────────────────────────────────
DROP POLICY IF EXISTS "master_read_audit"           ON rbac_auditoria;
DROP POLICY IF EXISTS "managers_read_audit"         ON rbac_auditoria;
DROP POLICY IF EXISTS "authenticated_insert_audit"  ON rbac_auditoria;

ALTER TABLE rbac_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_managers_read"
  ON rbac_auditoria FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('franchisee_master','admin','manager')
    )
  );

CREATE POLICY "audit_insert"
  ON rbac_auditoria FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ── user_unidades ────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_read_own_unidades"         ON user_unidades;
DROP POLICY IF EXISTS "master_manage_unidades"          ON user_unidades;
DROP POLICY IF EXISTS "franqueado_manage_unit_unidades" ON user_unidades;
DROP POLICY IF EXISTS "franqueado_manage_unidades"      ON user_unidades;
DROP POLICY IF EXISTS "read_own_unidades"               ON user_unidades;
DROP POLICY IF EXISTS "managers_manage_unidades"        ON user_unidades;

ALTER TABLE user_unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "un_read_own"
  ON user_unidades FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "un_managers_all"
  ON user_unidades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('franchisee_master','admin','manager')
    )
  );

-- ── Remove funções antigas se existirem ─────────────────────────
DROP FUNCTION IF EXISTS get_my_perfil();
DROP FUNCTION IF EXISTS get_my_unidade_id();
