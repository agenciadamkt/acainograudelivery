-- ============================================================================
-- Permite que GESTORES da loja (admin/manager vinculados por franchisee_user_id
-- OU por user_unidades, além do franchisee_master) editem os dados da loja.
-- As policies antigas só cobriam franchisee_master e o dono (franchisee_user_id),
-- deixando managers vinculados via user_unidades sem UPDATE — o save "sucede"
-- mas atualiza 0 linhas (RLS), parecendo que não salva.
-- Policy PERMISSIVA e aditiva: só amplia o acesso, usa o helper já existente.
-- ============================================================================
DROP POLICY IF EXISTS "Gestores da loja podem editar seus dados" ON public.stores;
CREATE POLICY "Gestores da loja podem editar seus dados"
  ON public.stores
  FOR UPDATE
  USING (public.user_manages_store(auth.uid(), id))
  WITH CHECK (public.user_manages_store(auth.uid(), id));
