-- Suporte a múltiplas unidades por usuário
CREATE TABLE IF NOT EXISTS user_unidades (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id   UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  UNIQUE (usuario_id, store_id)
);

ALTER TABLE user_unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_unidades"
  ON user_unidades FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "master_manage_unidades"
  ON user_unidades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.perfil = 'MASTER'
    )
  );

CREATE POLICY "franqueado_manage_unit_unidades"
  ON user_unidades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.perfil = 'FRANQUEADO'
    )
  );

-- Migra unidade_id existente para a nova tabela
INSERT INTO user_unidades (usuario_id, store_id)
SELECT id, unidade_id
FROM user_profiles
WHERE unidade_id IS NOT NULL
ON CONFLICT (usuario_id, store_id) DO NOTHING;
