-- ============================================================================
-- Correção de RLS e Sincronização de Roles para Toppings (Complementos)
-- ============================================================================

-- 1. Trigger para manter user_roles sincronizado com user_profiles
CREATE OR REPLACE FUNCTION public.sync_user_profile_to_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o perfil mudou, atualiza a role correspondente na tabela user_roles
  IF (TG_OP = 'INSERT') OR (OLD.perfil IS DISTINCT FROM NEW.perfil) THEN
    -- Remove roles antigas para este usuário
    DELETE FROM public.user_roles WHERE user_id = NEW.id;
    
    -- Insere a nova role correspondente
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      NEW.id,
      CASE NEW.perfil
        WHEN 'MASTER'      THEN 'franchisee_master'::app_role
        WHEN 'FRANQUEADO'  THEN 'manager'::app_role
        ELSE                    'staff'::app_role
      END
    )
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Associa o trigger à tabela user_profiles
DROP TRIGGER IF EXISTS trg_sync_user_profile_to_role ON public.user_profiles;
CREATE TRIGGER trg_sync_user_profile_to_role
  AFTER INSERT OR UPDATE OF perfil ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_profile_to_role();

-- 2. Sincroniza retroativamente todos os usuários existentes de forma limpa
DELETE FROM public.user_roles;

INSERT INTO public.user_roles (user_id, role)
SELECT
  up.id,
  CASE up.perfil
    WHEN 'MASTER'      THEN 'franchisee_master'::app_role
    WHEN 'FRANQUEADO'  THEN 'manager'::app_role
    ELSE                    'staff'::app_role
  END
FROM public.user_profiles up
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Atualiza as políticas de RLS para Toppings (public.toppings)
DROP POLICY IF EXISTS "Staff pode gerenciar toppings da sua loja" ON public.toppings;

CREATE POLICY "Staff pode gerenciar toppings da sua loja"
ON public.toppings
FOR ALL
TO authenticated
USING (
  -- Caso o usuário logado seja MASTER no user_profiles
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.perfil = 'MASTER'
  )
  -- Caso o usuário logado seja o Franqueado responsável pela loja
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = toppings.store_id
      AND s.franchisee_user_id = auth.uid()
  )
  -- Caso o usuário seja funcionário e tenha permissão de editar toppings (nível >= 3)
  OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    LEFT JOIN public.rbac_usuario_permissoes uperm ON uperm.usuario_id = auth.uid() AND uperm.modulo_codigo = 'cardapio.toppings'
    LEFT JOIN public.rbac_perfil_permissoes pperm ON pperm.perfil = up.perfil AND pperm.modulo_codigo = 'cardapio.toppings'
    WHERE up.id = auth.uid()
      AND up.unidade_id = toppings.store_id
      AND COALESCE(uperm.nivel, pperm.nivel, 0) >= 3
  )
);

-- 4. Atualiza as políticas de RLS para Toppings Categories (public.topping_categories)
DROP POLICY IF EXISTS "Staff pode gerenciar categorias de toppings da sua loja" ON public.topping_categories;

CREATE POLICY "Staff pode gerenciar categorias de toppings da sua loja"
ON public.topping_categories
FOR ALL
TO authenticated
USING (
  -- Caso o usuário logado seja MASTER no user_profiles
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.perfil = 'MASTER'
  )
  -- Caso o usuário logado seja o Franqueado responsável pela loja
  OR EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = topping_categories.store_id
      AND s.franchisee_user_id = auth.uid()
  )
  -- Caso o usuário seja funcionário e tenha permissão de editar toppings (nível >= 3)
  OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    LEFT JOIN public.rbac_usuario_permissoes uperm ON uperm.usuario_id = auth.uid() AND uperm.modulo_codigo = 'cardapio.toppings'
    LEFT JOIN public.rbac_perfil_permissoes pperm ON pperm.perfil = up.perfil AND pperm.modulo_codigo = 'cardapio.toppings'
    WHERE up.id = auth.uid()
      AND up.unidade_id = topping_categories.store_id
      AND COALESCE(uperm.nivel, pperm.nivel, 0) >= 3
  )
);
