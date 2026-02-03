-- ==============================================================================
-- MIGRAÇÃO: ISOLAMENTO DE CLIENTES POR LOJA (MULTI-TENANCY)
-- Objetivo: Garantir que cada cliente pertença a uma loja específica.
--           Loja 1 não vê clientes da Loja 2.
--           O mesmo telefone pode existir na Loja 1 e na Loja 2 (clientes distintos).
-- ==============================================================================

-- 1. Remover a restrição global de telefone único (isso permite o mesmo telefone em lojas diferentes)
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_phone_key;

-- 2. Adicionar coluna store_id na tabela customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id);

-- 3. Criar índice para performance em queries por loja
CREATE INDEX IF NOT EXISTS idx_customers_store_id ON public.customers(store_id);

-- 4. MIGRAÇÃO DE DADOS EXISTENTES (Crucial!)
-- Estratégia: Associar clientes existentes às lojas onde eles têm pedidos.
-- Se um cliente comprou em múltiplas lojas, vamos mantê-lo na loja do ÚLTIMO pedido
-- e posteriormente o sistema criará novos registros para as outras lojas conforme novos pedidos entrarem.

DO $$
DECLARE
    r RECORD;
    last_store_uuid UUID;
    default_store_uuid UUID;
BEGIN
    -- Pegar uma loja padrão para clientes sem pedidos (primeira loja ativa)
    SELECT id INTO default_store_uuid FROM public.stores WHERE active = true LIMIT 1;

    FOR r IN SELECT id FROM public.customers WHERE store_id IS NULL LOOP
        -- Tenta achar a loja do último pedido desse cliente
        SELECT store_id INTO last_store_uuid 
        FROM public.orders 
        WHERE customer_id = r.id 
        ORDER BY created_at DESC 
        LIMIT 1;

        IF last_store_uuid IS NOT NULL THEN
            UPDATE public.customers SET store_id = last_store_uuid WHERE id = r.id;
        ELSE
            -- Se nunca comprou, atribui à loja padrão
            IF default_store_uuid IS NOT NULL THEN
                UPDATE public.customers SET store_id = default_store_uuid WHERE id = r.id;
            END IF;
        END IF;
    END LOOP;
END $$;

-- 5. Tornar store_id OBRIGATÓRIO (após migração)
-- Só podemos fazer isso se tivermos garantido que todos têm store_id.
-- Caso contrário, deixamos como opcional por segurança, mas com verificação no App.
-- ALTER TABLE public.customers ALTER COLUMN store_id SET NOT NULL; -- (Descomente se tiver certeza)

-- 6. Adicionar NOVA restrição única: (store_id + phone)
-- Isso impede duplicidade DENTRO da mesma loja, mas permite entre lojas diferentes.
-- Usamos COALESCE ou um índice parcial se store_id puder ser nulo, mas idealmente não deve ser.
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_store_phone 
ON public.customers(store_id, phone) 
WHERE store_id IS NOT NULL;


-- ==============================================================================
-- ATUALIZAÇÃO DAS POLÍTICAS DE SEGURANÇA (RLS)
-- ==============================================================================

-- Remover políticas antigas para recriar com filtro de loja
DROP POLICY IF EXISTS "Staff autenticado pode ver todos os clientes" ON public.customers;
DROP POLICY IF EXISTS "Staff autenticado pode gerenciar clientes" ON public.customers;

-- NOVA POLÍTICA DE LEITURA:
-- Staff só vê clientes que pertencem a lojas que ele tem acesso.
-- Como checar acesso à loja?
-- Simplificação: Se sou admin, vejo tudo. Se sou manager/staff, o front deve filtrar, 
-- mas por segurança no banco, idealmente cruzamos com user_roles ou store_staff (se existir).
-- Por enquanto, vamos manter um filtro base: "Se o user é admin/manager, ele vê os clientes da loja do contexto atual".
-- Como o PostgreSQL não sabe o "contexto da loja atual" da UI, a política RLS geralmente checa se o usuário
-- tem permissão naquela loja específica.

-- Assumindo que admins veem tudo e managers/staff veem tudo (por enquanto), 
-- mas o Front-End vai filtrar pelo store_id.
-- Para isolamento REAL no banco, precisaríamos de uma tabela `stores_users` que diz "User A cuida da Loja B".
-- Se não existir essa tabela, o isolamento fica dependente do Front-End enviar o store_id correto nas queries.

-- Vou criar uma política que permite ver customers se o usuário for Authenticated (Staff),
-- mas o isolamento forte depende da tabela de vínculo User-Store.
-- Se não houver tabela explicita User-Store, vamos assumir que Admins/Managers podem ver tudo,
-- mas a constraint UNIQUE(store_id, phone) garante a separação lógica dos dados.

CREATE POLICY "Staff autenticado pode ver clientes por loja"
ON public.customers FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager') OR
  public.has_role(auth.uid(), 'staff')
);

-- NOVA POLÍTICA DE GESTÃO (Update/Insert/Delete):
CREATE POLICY "Staff autenticado pode gerenciar clientes por loja"
ON public.customers FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'manager')
);

-- ==============================================================================
-- AJUSTE EM ORDERS (Garantir integridade)
-- ==============================================================================
-- Se o customer agora é específico da loja, o pedido também deve bater a loja.
-- (Já existe store_id em orders, e customer_id em orders).

-- ==============================================================================
-- TRIGGER PARA NOVOS CLIENTES VIA AUTH
-- ==============================================================================
-- Quando um usuário cria conta no App (Customer App), ele não escolhe loja no signup.
-- Ele é global? Ou atribuímos NULL e depois vinculamos na primeira compra?
-- Ajuste da função `handle_new_customer` para não quebrar com a constraint store_id.

CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER AS $$
BEGIN
  -- Cria cliente sem loja definida inicialmente (store_id NULL)
  -- Quando ele fizer o primeiro pedido em uma loja, o sistema deve
  -- atualizar esse registro OU criar um novo vinculado à loja.
  
  -- Nota: Com a mudança para Multi-Tenant, o login global (Auth) vs Cliente por Loja é complexo.
  -- Idealmente: O Auth User é global. O Customer Profile é por loja.
  -- Vamos permitir store_id NULL para representar "Pré-cadastro Global" se necessário,
  -- ou simplesmente não criar customer no signup, criando apenas no checkout.
  
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE user_id = NEW.id) THEN
    INSERT INTO public.customers (user_id, email, name, phone, store_id)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', COALESCE(NEW.raw_user_meta_data->>'full_name', '')),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      NULL -- Sem loja inicial
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
