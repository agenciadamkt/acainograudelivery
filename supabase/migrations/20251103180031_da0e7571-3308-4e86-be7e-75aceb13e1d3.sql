-- Remover policies antigas que permitem ver todos os pedidos
DROP POLICY IF EXISTS "Staff autenticado pode ver todos os pedidos" ON orders;
DROP POLICY IF EXISTS "Staff autenticado pode gerenciar pedidos" ON orders;

-- Criar policy para SELECT que isola pedidos por loja
CREATE POLICY "Staff pode ver pedidos da sua loja"
ON orders FOR SELECT
TO authenticated
USING (
  -- Franchisee master pode ver tudo
  has_role(auth.uid(), 'franchisee_master'::app_role)
  OR
  -- Admin/Manager/Staff só vê pedidos da loja que gerencia
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
    AND
    store_id IN (
      SELECT id FROM stores WHERE franchisee_user_id = auth.uid()
    )
  )
  OR
  -- Cliente vê seus próprios pedidos
  customer_id IN (
    SELECT id FROM customers WHERE user_id = auth.uid()
  )
);

-- Criar policy para ALL (UPDATE/DELETE) que isola por loja
CREATE POLICY "Staff pode gerenciar pedidos da sua loja"
ON orders FOR ALL
TO authenticated
USING (
  -- Franchisee master pode gerenciar tudo
  has_role(auth.uid(), 'franchisee_master'::app_role)
  OR
  -- Admin/Manager/Staff só gerencia pedidos da sua loja
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
    AND
    store_id IN (
      SELECT id FROM stores WHERE franchisee_user_id = auth.uid()
    )
  )
);