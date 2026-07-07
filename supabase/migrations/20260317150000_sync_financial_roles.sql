-- 1. Função para sincronizar funções financeiras com papéis do sistema
CREATE OR REPLACE FUNCTION public.sync_financial_user_role()
RETURNS TRIGGER AS $$
DECLARE
    v_user_role public.app_role;
    v_user_id UUID;
BEGIN
    -- Obter o ID do usuário (auth.users) pelo e-mail se o user_id for nulo
    IF NEW.user_id IS NULL THEN
        SELECT id INTO v_user_id FROM auth.users WHERE email = NEW.email;
    ELSE
        v_user_id := NEW.user_id;
    END IF;

    -- Se não encontrarmos o usuário, não fazemos nada (o perfil pode ser criado depois)
    IF v_user_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Mapear papel financeiro para papel do sistema
    -- admin -> admin
    -- operator -> manager (acesso a produtos, pedidos, relatórios)
    IF NEW.role = 'admin' THEN
        v_user_role := 'admin'::public.app_role;
    ELSIF NEW.role = 'operator' THEN
        v_user_role := 'manager'::public.app_role;
    ELSE
        RETURN NEW;
    END IF;

    -- Upsert na tabela user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, v_user_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Criar Trigger
DROP TRIGGER IF EXISTS on_financial_user_upsert ON public.financial_users;
CREATE TRIGGER on_financial_user_upsert
AFTER INSERT OR UPDATE OF role ON public.financial_users
FOR EACH ROW
EXECUTE FUNCTION public.sync_financial_user_role();

-- 3. Sincronizar usuários existentes
DO $$
DECLARE
    r RECORD;
    v_user_id UUID;
    v_user_role public.app_role;
BEGIN
    FOR r IN SELECT * FROM public.financial_users WHERE active = true LOOP
        -- Buscar ID do usuário
        SELECT id INTO v_user_id FROM auth.users WHERE email = r.email;
        
        IF v_user_id IS NOT NULL THEN
            IF r.role = 'admin' THEN
                v_user_role := 'admin'::public.app_role;
            ELSIF r.role = 'operator' THEN
                v_user_role := 'manager'::public.app_role;
            ELSE
                CONTINUE;
            END IF;

            INSERT INTO public.user_roles (user_id, role)
            VALUES (v_user_id, v_user_role)
            ON CONFLICT (user_id, role) DO NOTHING;
        END IF;
    END LOOP;
END;
$$;
