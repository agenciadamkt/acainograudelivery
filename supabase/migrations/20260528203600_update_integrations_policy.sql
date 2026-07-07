-- Update RLS policies for public.integrations to allow managers and franchisee masters to edit integrations.
DROP POLICY IF EXISTS "Apenas admins podem gerenciar integrações" ON public.integrations;

CREATE POLICY "Admins, managers e master franqueados podem gerenciar integrações"
  ON public.integrations FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'franchisee_master'::app_role)
  );
