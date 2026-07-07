-- ═══════════════════════════════════════════════════════════════
-- Limpeza automática de perfis/permissões ao excluir um auth.user
--
-- Sintoma encontrado: rbac_usuario_permissoes_usuario_id_fkey,
-- user_unidades_usuario_id_fkey e user_profiles_id_fkey (-> auth.users)
-- foram removidas em 20260424000006_drop_all_rbac_fks.sql para evitar
-- problemas de FK cruzando para auth.users. Como consequência, excluir
-- um usuário (auth.users) nunca mais limpou user_profiles,
-- rbac_usuario_permissoes nem user_unidades — gerando perfis órfãos
-- (ex: permissões customizadas de nível 4 presas em um id que não
-- existe mais, enquanto a tela admin/settings/usuarios continuava
-- listando esses registros, causando confusão na hora de editar
-- permissões de um usuário real).
--
-- Este trigger espelha o já existente `on_auth_user_created` /
-- `handle_new_auth_user()`, mas para o caminho de exclusão.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_deleted_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.rbac_usuario_permissoes WHERE usuario_id = OLD.id;
  DELETE FROM public.user_unidades WHERE usuario_id = OLD.id;
  DELETE FROM public.user_profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;

CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_deleted_auth_user();

-- ── Limpeza dos órfãos já existentes hoje (ids sem auth.users nem user_profiles) ──
DELETE FROM public.rbac_usuario_permissoes
WHERE usuario_id IN ('2a9090f2-81b4-4f29-97ff-d0c32be4ac5a', 'cb63e6cf-1b4f-4502-83ec-67bbe1574990');

DELETE FROM public.user_unidades
WHERE usuario_id IN (
  '2a9090f2-81b4-4f29-97ff-d0c32be4ac5a',
  'cb63e6cf-1b4f-4502-83ec-67bbe1574990',
  'e4156e34-1356-4666-b1ce-88abb9c940cb'
);
