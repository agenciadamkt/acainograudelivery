-- Remove TODOS os FK constraints das tabelas RBAC dinamicamente
-- (independente do nome exato do constraint)

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tc.table_name, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN (
        'user_profiles',
        'rbac_usuario_permissoes',
        'rbac_auditoria',
        'user_unidades'
      )
      AND ccu.table_schema = 'auth'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
      r.table_name,
      r.constraint_name
    );
    RAISE NOTICE 'Dropped FK: %.%', r.table_name, r.constraint_name;
  END LOOP;
END;
$$;
