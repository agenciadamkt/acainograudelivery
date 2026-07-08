-- Corrige isolamento de tenant na tabela integrations.
-- A policy anterior permitia que qualquer admin/manager/franchisee_master
-- lesse as integrações de TODOS os franqueados sem restrição de tenant.
-- Agora cada role só acessa as próprias integrações, exceto admin que vê tudo.

DROP POLICY IF EXISTS "Admins, managers e master franqueados podem gerenciar integrações" ON public.integrations;

-- Admins veem e gerenciam tudo (suporte / backoffice)
CREATE POLICY "Admins gerenciam todas as integrações"
  ON public.integrations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers e franchisee_masters só acessam as próprias integrações
CREATE POLICY "Managers e franqueados gerenciam suas integrações"
  ON public.integrations FOR ALL
  USING (
    franchisee_id = auth.uid()
    AND (
      has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'franchisee_master'::app_role)
    )
  );
