-- ==============================================================
-- FIX: "Um ou mais produtos do carrinho não estão mais disponíveis"
--      (Key is not present in table "profiles")
--
-- Causa raiz:
--   franchisee_orders.franchisee_user_id possui FK para public.profiles(id)
--   (franchisee_orders_franchisee_user_id_fkey), usada para exibir o nome
--   do franqueado nas telas de pedidos/frota.
--
--   Em 2026-04-24, o trigger que criava automaticamente a linha em
--   public.profiles para cada novo usuário foi substituído por um trigger
--   que cria apenas em user_profiles. Usuários (franqueados) criados depois
--   dessa data ficaram sem linha em public.profiles, então qualquer INSERT
--   em franchisee_orders falha com violação de FK ("profiles"), o que o
--   checkout reporta como "produto não disponível".
--
-- Execute no Supabase SQL Editor.
-- ==============================================================

-- 1. Backfill: cria profiles para usuários que ainda não têm
INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Atualiza o trigger de novo usuário para também criar a linha em
--    public.profiles (além de user_profiles), evitando recorrência
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

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
