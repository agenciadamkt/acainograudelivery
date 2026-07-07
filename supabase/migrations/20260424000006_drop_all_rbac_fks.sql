-- Remove todos os FK constraints das tabelas RBAC que referenciam auth.users
-- O vínculo é mantido pelo trigger on_auth_user_created e pela lógica da aplicação

-- rbac_usuario_permissoes
ALTER TABLE rbac_usuario_permissoes DROP CONSTRAINT IF EXISTS rbac_usuario_permissoes_usuario_id_fkey;

-- rbac_auditoria
ALTER TABLE rbac_auditoria DROP CONSTRAINT IF EXISTS rbac_auditoria_usuario_id_fkey;
ALTER TABLE rbac_auditoria DROP CONSTRAINT IF EXISTS rbac_auditoria_alterado_por_fkey;

-- user_unidades
ALTER TABLE user_unidades DROP CONSTRAINT IF EXISTS user_unidades_usuario_id_fkey;
