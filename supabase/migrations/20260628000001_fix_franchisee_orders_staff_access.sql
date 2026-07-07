-- franchisee_orders só tinha policies para o e-mail master fixo
-- (agenciadamkt@gmail.com) e o próprio franqueado — nenhum outro
-- colaborador (staff/manager/admin) conseguia ver ou receber eventos de
-- Realtime dessas linhas, mesmo logado em /admin/orders/management.
-- Política aditiva (RLS combina policies permissivas com OR): amplia o
-- acesso sem remover as regras já existentes.

CREATE POLICY "Staff can manage franchisee orders"
  ON public.franchisee_orders
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );
