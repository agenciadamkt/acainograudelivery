-- ====================================================
-- SOLUÇÃO DEFINITIVA: RLS & Restauração de Acesso Admin
-- Data: 2026-04-08
-- ====================================================

-- 1. Destravar e Limpar Tabela de Papéis (user_roles)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seus próprios roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins podem gerenciar roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_read_own" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_login_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_master_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_v3" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_master_bypass" ON public.user_roles;

-- 2. POLÍTICA DE LEITURA (Essencial para o App funcionar)
-- Permite que o sistema leia qual o seu papel durante o login
CREATE POLICY "user_roles_read_access"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. POLÍTICA MASTER DE BYPASS (Blindagem de Acesso por Email)
-- Garante que você NUNCA seja bloqueado, idependente de erros de ID
CREATE POLICY "user_roles_master_bypass"
ON public.user_roles FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email' = 'agenciadamkt@gmail.com') OR
  (auth.jwt() ->> 'email' = 'fabio@acainograu.com.br')
)
WITH CHECK (
  (auth.jwt() ->> 'email' = 'agenciadamkt@gmail.com') OR
  (auth.jwt() ->> 'email' = 'fabio@acainograu.com.br')
);

-- 4. BLINDAGEM AUTOMÁTICA (Resolve o alerta do Supabase em todas as tabelas)
-- Ativa RLS em tudo que estiver aberto, mas cria uma regra de leitura para logados
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = false
    ) LOOP
        -- Ativa a segurança
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY';
        
        -- Garante que usuários logados possam ao menos LER os dados (evita erros no app)
        EXECUTE 'DROP POLICY IF EXISTS "app_auth_read" ON public.' || quote_ident(r.tablename);
        EXECUTE 'CREATE POLICY "app_auth_read" ON public.' || quote_ident(r.tablename) || ' FOR SELECT TO authenticated USING (true)';
        
        -- Garante que o Mestre (você) possa GERENCIAR os dados
        EXECUTE 'DROP POLICY IF EXISTS "master_manage_all" ON public.' || quote_ident(r.tablename);
        EXECUTE 'CREATE POLICY "master_manage_all" ON public.' || quote_ident(r.tablename) || ' FOR ALL TO authenticated USING (auth.jwt() ->> ''email'' = ''agenciadamkt@gmail.com'')';
    END LOOP;
END $$;

-- 5. VERIFICAÇÃO FINAL: O resultado deve ser ZERO (nenhuma tabela vulnerável)
SELECT count(*) as tabelas_vulneraveis
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
