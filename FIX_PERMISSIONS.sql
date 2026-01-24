-- GARANTIR ACESSO TOTAL PARA SERVICE_ROLE
-- Isso resolve problemas onde a automação não consegue ler as campanhas

-- 1. Garantir Bypass de RLS
ALTER TABLE scheduled_campaigns FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service Role Total Access" ON scheduled_campaigns;

CREATE POLICY "Service Role Total Access"
ON scheduled_campaigns
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Garantir Grants explícitos
GRANT ALL ON scheduled_campaigns TO service_role;
GRANT ALL ON scheduled_campaigns TO postgres;
GRANT ALL ON scheduled_campaigns TO authenticated;

-- 3. Verificação de Sanidade (apenas para log)
DO $$
BEGIN
  RAISE NOTICE 'Permissões de service_role atualizadas com sucesso.';
END $$;
