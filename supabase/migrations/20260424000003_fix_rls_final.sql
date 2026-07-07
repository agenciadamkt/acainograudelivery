-- ═══════════════════════════════════════════════════════════════
-- Fix FINAL: troca user_profiles por user_roles nas policies
-- user_roles não tem recursão — é a tabela segura para checar roles
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Limpa TODAS as policies existentes de user_profiles ──────
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', r.policyname);
  END LOOP;
END$$;

-- ── 2. Novas policies SEM recursão (usa user_roles, não user_profiles) ──

-- Lê o próprio perfil
CREATE POLICY "read_own"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Atualiza o próprio perfil (dados pessoais)
CREATE POLICY "update_own"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());

-- Gerentes/Master leem todos os perfis
CREATE POLICY "managers_read_all"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('franchisee_master', 'admin', 'manager')
    )
  );

-- Gerentes/Master criam perfis
CREATE POLICY "managers_insert"
  ON user_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('franchisee_master', 'admin', 'manager')
    )
    -- Ou o próprio usuário inserindo o próprio perfil (na criação)
    OR id = auth.uid()
  );

-- Gerentes/Master atualizam qualquer perfil
CREATE POLICY "managers_update_all"
  ON user_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('franchisee_master', 'admin', 'manager')
    )
  );

-- Apenas Master deleta
CREATE POLICY "master_delete"
  ON user_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('franchisee_master')
    )
  );

-- ── 3. Limpa e recria policies das outras tabelas ────────────────

-- rbac_usuario_permissoes
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'rbac_usuario_permissoes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON rbac_usuario_permissoes', r.policyname);
  END LOOP;
END$$;

CREATE POLICY "read_own_permissions"
  ON rbac_usuario_permissoes FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "managers_manage_permissions"
  ON rbac_usuario_permissoes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('franchisee_master', 'admin', 'manager')
    )
  );

-- rbac_auditoria
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'rbac_auditoria' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON rbac_auditoria', r.policyname);
  END LOOP;
END$$;

CREATE POLICY "managers_read_audit"
  ON rbac_auditoria FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('franchisee_master', 'admin', 'manager')
    )
  );

CREATE POLICY "authenticated_insert_audit"
  ON rbac_auditoria FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- user_unidades
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'user_unidades' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON user_unidades', r.policyname);
  END LOOP;
END$$;

CREATE POLICY "read_own_unidades"
  ON user_unidades FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "managers_manage_unidades"
  ON user_unidades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('franchisee_master', 'admin', 'manager')
    )
  );

-- ── 4. Remove funções antigas se existirem ───────────────────────
DROP FUNCTION IF EXISTS get_my_perfil();
DROP FUNCTION IF EXISTS get_my_unidade_id();
