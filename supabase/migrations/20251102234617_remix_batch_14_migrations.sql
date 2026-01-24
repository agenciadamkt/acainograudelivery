
-- Migration: 20251102123429
-- ============================================
-- SPRINT 1: FUNDAÇÃO - ESTRUTURA DE BANCO DE DADOS
-- ============================================

-- 1. CRIAR ENUM DE ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'staff');

-- 2. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABELA DE ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 4. TABELA DE LOJAS
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  logo_url TEXT,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  delivery_radius_km DECIMAL(5,2) DEFAULT 5,
  min_order_value DECIMAL(10,2) DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABELA DE CATEGORIAS
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TABELA DE PRODUTOS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_image_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. TABELA DE TAMANHOS DE PRODUTOS
CREATE TABLE public.product_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ml_size INTEGER,
  price DECIMAL(10,2) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. TABELA DE CATEGORIAS DE TOPPINGS
CREATE TABLE public.topping_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  max_selections INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. TABELA DE TOPPINGS
CREATE TABLE public.toppings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.topping_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  price DECIMAL(10,2) DEFAULT 0,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. TABELA DE CLIENTES
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  birth_date DATE,
  gender TEXT,
  first_order_at TIMESTAMPTZ,
  last_order_at TIMESTAMPTZ,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent DECIMAL(10,2) NOT NULL DEFAULT 0,
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  loyalty_tier TEXT DEFAULT 'bronze',
  opt_in_marketing BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(phone)
);

-- 11. TABELA DE ENDEREÇOS DOS CLIENTES
CREATE TABLE public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zipcode TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. TABELA DE PEDIDOS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  delivery_address_id UUID REFERENCES public.customer_addresses(id),
  order_type TEXT NOT NULL CHECK (order_type IN ('delivery', 'pickup', 'table', 'counter')),
  table_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed', 'cancelled')),
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  subtotal DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  customer_notes TEXT,
  scheduled_for TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  prepared_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. TABELA DE ITENS DO PEDIDO
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_size_id UUID REFERENCES public.product_sizes(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. TABELA DE TOPPINGS DO PEDIDO
CREATE TABLE public.order_item_toppings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  topping_id UUID NOT NULL REFERENCES public.toppings(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- FUNÇÃO DE SEGURANÇA: has_role()
-- ============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- ============================================
-- TRIGGER PARA CRIAR PERFIL AUTOMATICAMENTE
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TRIGGER PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_toppings_updated_at
  BEFORE UPDATE ON public.toppings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins podem ver todos os perfis"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- STORES
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver lojas ativas"
  ON public.stores FOR SELECT
  USING (active = true);

CREATE POLICY "Admins e managers podem gerenciar lojas"
  ON public.stores FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver categorias ativas"
  ON public.categories FOR SELECT
  USING (active = true);

CREATE POLICY "Staff autenticado pode gerenciar categorias"
  ON public.categories FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- PRODUCTS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver produtos ativos"
  ON public.products FOR SELECT
  USING (active = true);

CREATE POLICY "Staff autenticado pode gerenciar produtos"
  ON public.products FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- PRODUCT_SIZES
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver tamanhos ativos"
  ON public.product_sizes FOR SELECT
  USING (active = true);

CREATE POLICY "Staff autenticado pode gerenciar tamanhos"
  ON public.product_sizes FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- TOPPING_CATEGORIES
ALTER TABLE public.topping_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver categorias de toppings"
  ON public.topping_categories FOR SELECT
  USING (true);

CREATE POLICY "Staff autenticado pode gerenciar categorias de toppings"
  ON public.topping_categories FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- TOPPINGS
ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver toppings ativos"
  ON public.toppings FOR SELECT
  USING (active = true);

CREATE POLICY "Staff autenticado pode gerenciar toppings"
  ON public.toppings FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- CUSTOMERS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes podem ver seus próprios dados"
  ON public.customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff autenticado pode ver todos os clientes"
  ON public.customers FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Staff autenticado pode gerenciar clientes"
  ON public.customers FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager')
  );

-- CUSTOMER_ADDRESSES
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes podem gerenciar seus próprios endereços"
  ON public.customer_addresses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = customer_addresses.customer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Staff autenticado pode ver endereços"
  ON public.customer_addresses FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'staff')
  );

-- ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes podem ver seus próprios pedidos"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = orders.customer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Staff autenticado pode ver todos os pedidos"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Clientes podem criar pedidos"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = orders.customer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Staff autenticado pode gerenciar pedidos"
  ON public.orders FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'manager') OR
    public.has_role(auth.uid(), 'staff')
  );

-- ORDER_ITEMS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver itens de seus pedidos"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.customers c ON o.customer_id = c.id
      WHERE o.id = order_items.order_id
      AND (c.user_id = auth.uid() OR 
           public.has_role(auth.uid(), 'admin') OR
           public.has_role(auth.uid(), 'manager') OR
           public.has_role(auth.uid(), 'staff'))
    )
  );

CREATE POLICY "Clientes podem inserir itens em seus pedidos"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.customers c ON o.customer_id = c.id
      WHERE o.id = order_items.order_id
      AND c.user_id = auth.uid()
    )
  );

-- ORDER_ITEM_TOPPINGS
ALTER TABLE public.order_item_toppings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver toppings de seus pedidos"
  ON public.order_item_toppings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON oi.order_id = o.id
      JOIN public.customers c ON o.customer_id = c.id
      WHERE oi.id = order_item_toppings.order_item_id
      AND (c.user_id = auth.uid() OR 
           public.has_role(auth.uid(), 'admin') OR
           public.has_role(auth.uid(), 'manager') OR
           public.has_role(auth.uid(), 'staff'))
    )
  );

CREATE POLICY "Clientes podem inserir toppings em seus pedidos"
  ON public.order_item_toppings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON oi.order_id = o.id
      JOIN public.customers c ON o.customer_id = c.id
      WHERE oi.id = order_item_toppings.order_item_id
      AND c.user_id = auth.uid()
    )
  );

-- ============================================
-- DADOS INICIAIS (SEED)
-- ============================================

-- Inserir uma loja padrão
INSERT INTO public.stores (name, city, state, active)
VALUES ('PedeGrau - Loja Principal', 'São Paulo', 'SP', true);

-- Inserir categorias iniciais
INSERT INTO public.categories (name, icon, display_order, active)
VALUES
  ('Açaí', '🍇', 1, true),
  ('Bebidas', '🥤', 2, true),
  ('Complementos', '🍓', 3, true);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_product_sizes_product_id ON public.product_sizes(product_id);
CREATE INDEX idx_toppings_category_id ON public.toppings(category_id);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_customer_addresses_customer_id ON public.customer_addresses(customer_id);

-- Migration: 20251102123646
-- Corrigir search_path na função update_updated_at_column para evitar ataques de path hijacking
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Migration: 20251102124853
-- Criar buckets para armazenamento de imagens
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('products', 'products', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  ('toppings', 'toppings', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

-- Políticas para produtos: staff pode fazer upload
CREATE POLICY "Staff autenticado pode fazer upload de imagens de produtos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Staff autenticado pode atualizar imagens de produtos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Staff autenticado pode deletar imagens de produtos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Todos podem ver imagens de produtos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'products');

-- Políticas para toppings: staff pode fazer upload
CREATE POLICY "Staff autenticado pode fazer upload de imagens de toppings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'toppings' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Staff autenticado pode atualizar imagens de toppings"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'toppings' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Staff autenticado pode deletar imagens de toppings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'toppings' AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Todos podem ver imagens de toppings"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'toppings');

-- Migration: 20251102133106
-- Sprint 3 & 4: Preparação do banco de dados

-- Habilitar Realtime para tabelas de pedidos
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- Função para gerar número de pedido automaticamente
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  order_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1
  INTO order_count
  FROM public.orders
  WHERE DATE(created_at) = CURRENT_DATE;
  
  new_number := TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(order_count::TEXT, 6, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para auto-gerar order_number
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();

-- Trigger para auto-criar customer quando user se registra
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.customers WHERE user_id = NEW.id) THEN
    INSERT INTO public.customers (user_id, email, name, phone)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', COALESCE(NEW.raw_user_meta_data->>'full_name', '')),
      COALESCE(NEW.raw_user_meta_data->>'phone', '')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_customer();

-- Tabela de favoritos dos clientes
CREATE TABLE IF NOT EXISTS public.customer_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(customer_id, product_id)
);

-- Habilitar RLS na tabela de favoritos
ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

-- Policies para favoritos
CREATE POLICY "Clientes podem gerenciar seus próprios favoritos"
  ON public.customer_favorites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE customers.id = customer_favorites.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- Índice para favoritos
CREATE INDEX IF NOT EXISTS idx_customer_favorites_customer_id ON public.customer_favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_product_id ON public.customer_favorites(product_id);

-- Migration: 20251102140147
-- =====================================================
-- MÓDULO 1: CONTROLE DE ESTOQUE (INVENTORY)
-- =====================================================

-- Tabela de insumos/ingredientes
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL, -- 'kg', 'g', 'L', 'ml', 'unidade'
  current_stock NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  max_stock NUMERIC,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  supplier TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de movimentações de estoque
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- 'entrada', 'saida', 'ajuste', 'perda'
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC,
  total_cost NUMERIC,
  reason TEXT,
  reference_id UUID,
  reference_type TEXT, -- 'order', 'purchase', 'adjustment'
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Tabela de produtos x insumos (receita)
CREATE TABLE public.product_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies - Inventory
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff autenticado pode gerenciar itens de estoque"
  ON public.inventory_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Staff autenticado pode ver movimentações"
  ON public.inventory_movements FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff autenticado pode criar movimentações"
  ON public.inventory_movements FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff autenticado pode gerenciar ingredientes"
  ON public.product_ingredients FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Triggers - Inventory
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para atualizar estoque automaticamente
CREATE OR REPLACE FUNCTION update_inventory_on_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.movement_type IN ('entrada', 'ajuste') THEN
    UPDATE public.inventory_items
    SET current_stock = current_stock + NEW.quantity
    WHERE id = NEW.item_id;
  ELSIF NEW.movement_type IN ('saida', 'perda') THEN
    UPDATE public.inventory_items
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_inventory_on_movement
  AFTER INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION update_inventory_on_movement();

-- =====================================================
-- MÓDULO 2: FINANCEIRO (FINANCIAL)
-- =====================================================

-- Tabela de categorias financeiras
CREATE TABLE public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'receita', 'despesa'
  color TEXT,
  icon TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de transações financeiras
CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- 'receita', 'despesa'
  category_id UUID REFERENCES public.financial_categories(id),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT, -- 'order', 'expense', 'other'
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'confirmado', 'cancelado'
  due_date DATE,
  paid_date DATE,
  store_id UUID REFERENCES public.stores(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Tabela de metas financeiras
CREATE TABLE public.financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  target_amount NUMERIC NOT NULL,
  period TEXT NOT NULL, -- 'diario', 'semanal', 'mensal', 'anual'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies - Financial
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers podem gerenciar categorias financeiras"
  ON public.financial_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers podem gerenciar transações"
  ON public.financial_transactions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Staff pode ver transações"
  ON public.financial_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Managers podem gerenciar metas"
  ON public.financial_goals FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Triggers - Financial
CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para criar transação automaticamente quando pedido for pago
CREATE OR REPLACE FUNCTION create_transaction_on_order_payment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    INSERT INTO public.financial_transactions (
      type,
      amount,
      description,
      reference_id,
      reference_type,
      payment_method,
      status,
      paid_date,
      store_id,
      created_at
    ) VALUES (
      'receita',
      NEW.total_amount,
      'Pedido #' || NEW.order_number,
      NEW.id,
      'order',
      NEW.payment_method,
      'confirmado',
      now(),
      NEW.store_id,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_create_transaction_on_order_payment
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION create_transaction_on_order_payment();

-- Inserir categorias financeiras padrão
INSERT INTO public.financial_categories (name, type, color, icon) VALUES
  ('Vendas', 'receita', '#10b981', 'DollarSign'),
  ('Delivery', 'receita', '#06b6d4', 'Truck'),
  ('Compra de Insumos', 'despesa', '#ef4444', 'ShoppingCart'),
  ('Salários', 'despesa', '#f59e0b', 'Users'),
  ('Aluguel', 'despesa', '#8b5cf6', 'Home'),
  ('Contas', 'despesa', '#ec4899', 'FileText'),
  ('Marketing', 'despesa', '#14b8a6', 'Megaphone'),
  ('Outras Receitas', 'receita', '#22c55e', 'Plus'),
  ('Outras Despesas', 'despesa', '#dc2626', 'Minus');

-- =====================================================
-- MÓDULO 3: CRM CLIENTES
-- =====================================================

-- Tabela de segmentos de clientes
CREATE TABLE public.customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB,
  color TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de tags de clientes
CREATE TABLE public.customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, tag)
);

-- Tabela de notas sobre clientes
CREATE TABLE public.customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de cupons/promoções
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL, -- 'percentage', 'fixed'
  discount_value NUMERIC NOT NULL,
  min_order_value NUMERIC,
  max_discount NUMERIC,
  usage_limit INTEGER,
  usage_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de uso de cupons
CREATE TABLE public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies - CRM
ALTER TABLE public.customer_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff pode gerenciar segmentos"
  ON public.customer_segments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Staff pode gerenciar tags"
  ON public.customer_tags FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff pode gerenciar notas"
  ON public.customer_notes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff pode gerenciar cupons"
  ON public.coupons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Todos podem ver cupons ativos"
  ON public.coupons FOR SELECT
  USING (active = true);

CREATE POLICY "Staff pode ver uso de cupons"
  ON public.coupon_usage FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Clientes podem ver seus cupons usados"
  ON public.coupon_usage FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.customers
    WHERE customers.id = coupon_usage.customer_id
    AND customers.user_id = auth.uid()
  ));

-- Inserir segmentos padrão
INSERT INTO public.customer_segments (name, description, color) VALUES
  ('VIP', 'Clientes com mais de 20 pedidos', '#8b5cf6'),
  ('Novos', 'Clientes com menos de 3 pedidos', '#06b6d4'),
  ('Inativos', 'Sem pedidos há mais de 30 dias', '#ef4444'),
  ('Recorrentes', 'Pedidos semanais', '#10b981');

-- =====================================================
-- MÓDULO 4: GESTÃO DE ENTREGAS (DELIVERY)
-- =====================================================

-- Tabela de entregadores
CREATE TABLE public.delivery_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle_type TEXT, -- 'moto', 'carro', 'bicicleta'
  vehicle_plate TEXT,
  status TEXT NOT NULL DEFAULT 'disponivel', -- 'disponivel', 'em_entrega', 'offline'
  current_location JSONB,
  rating NUMERIC DEFAULT 5.0,
  total_deliveries INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de rotas de entrega
CREATE TABLE public.delivery_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES public.delivery_drivers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  order_ids JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'em_progresso', 'concluida', 'cancelada'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de histórico de rastreamento
CREATE TABLE public.delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES public.delivery_drivers(id),
  status TEXT NOT NULL, -- 'saiu_para_entrega', 'em_transito', 'proximo', 'entregue'
  location JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar coluna driver_id na tabela orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.delivery_drivers(id);

-- RLS Policies - Delivery
ALTER TABLE public.delivery_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff pode gerenciar entregadores"
  ON public.delivery_drivers FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff pode gerenciar rotas"
  ON public.delivery_routes FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff pode ver tracking"
  ON public.delivery_tracking FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff pode criar tracking"
  ON public.delivery_tracking FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Clientes podem ver tracking dos seus pedidos"
  ON public.delivery_tracking FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.customers c ON o.customer_id = c.id
    WHERE o.id = delivery_tracking.order_id
    AND c.user_id = auth.uid()
  ));

-- Triggers - Delivery
CREATE TRIGGER update_delivery_drivers_updated_at
  BEFORE UPDATE ON public.delivery_drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MÓDULO 5: CONFIGURAÇÕES (SETTINGS)
-- =====================================================

-- Tabela de configurações do sistema
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'geral', 'pagamento', 'notificacoes', 'aparencia'
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de integrações
CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'whatsapp', 'email', 'sms', 'pix'
  provider TEXT,
  config JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de logs de atividades
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  entity_type TEXT NOT NULL, -- 'product', 'order', 'customer', etc
  entity_id UUID,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies - Settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins podem gerenciar configurações"
  ON public.system_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Apenas admins podem gerenciar integrações"
  ON public.integrations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff pode ver logs de atividades"
  ON public.activity_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Sistema pode inserir logs"
  ON public.activity_logs FOR INSERT
  WITH CHECK (true);

-- Triggers - Settings
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir configurações padrão
INSERT INTO public.system_settings (key, value, description, category) VALUES
  ('app_name', '"PedeGrau"', 'Nome do aplicativo', 'geral'),
  ('min_order_value', '15', 'Valor mínimo do pedido', 'geral'),
  ('delivery_time', '45', 'Tempo médio de entrega (minutos)', 'geral'),
  ('tax_rate', '0', 'Taxa de serviço (%)', 'geral'),
  ('enable_pix', 'true', 'Ativar pagamento PIX', 'pagamento'),
  ('enable_credit_card', 'true', 'Ativar cartão de crédito', 'pagamento'),
  ('enable_cash', 'true', 'Ativar dinheiro', 'pagamento'),
  ('whatsapp_notifications', 'true', 'Notificações via WhatsApp', 'notificacoes'),
  ('email_notifications', 'true', 'Notificações via Email', 'notificacoes'),
  ('primary_color', '"#8B5CF6"', 'Cor primária do tema', 'aparencia');

-- Migration: 20251102143244
-- Step 1: Add franchisee_master role to app_role enum
-- This must be done in a separate transaction
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'franchisee_master';

-- Migration: 20251102143322
-- Step 2: Modify stores table to support multi-franchise architecture
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS franchisee_user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Add unique constraint on slug
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_slug_key;
ALTER TABLE public.stores ADD CONSTRAINT stores_slug_key UNIQUE (slug);

-- Add check constraint for status
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_status_check;
ALTER TABLE public.stores ADD CONSTRAINT stores_status_check CHECK (status IN ('pending', 'active', 'inactive', 'suspended'));

-- Create indexes on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_status ON public.stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_franchisee_user_id ON public.stores(franchisee_user_id);

-- Step 3: Create franchisee_requests table
CREATE TABLE IF NOT EXISTS public.franchisee_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  store_name text NOT NULL,
  preferred_slug text NOT NULL,
  message text,
  status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT franchisee_requests_preferred_slug_key UNIQUE (preferred_slug),
  CONSTRAINT franchisee_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

ALTER TABLE public.franchisee_requests ENABLE ROW LEVEL SECURITY;

-- RLS for franchisee_requests
CREATE POLICY "Franchisee masters podem gerenciar solicitações"
ON public.franchisee_requests
FOR ALL
USING (has_role(auth.uid(), 'franchisee_master'));

CREATE POLICY "Qualquer um pode criar solicitação"
ON public.franchisee_requests
FOR INSERT
WITH CHECK (true);

-- Trigger for franchisee_requests updated_at
CREATE TRIGGER update_franchisee_requests_updated_at
BEFORE UPDATE ON public.franchisee_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Step 4: Add store_id to relevant tables for multi-tenancy
-- Categories
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_store_id ON public.categories(store_id);

-- Toppings
ALTER TABLE public.toppings
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_toppings_store_id ON public.toppings(store_id);

-- Topping Categories
ALTER TABLE public.topping_categories
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_topping_categories_store_id ON public.topping_categories(store_id);

-- Inventory items need store_id
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_inventory_items_store_id ON public.inventory_items(store_id);

-- Delivery drivers need store_id
ALTER TABLE public.delivery_drivers
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_delivery_drivers_store_id ON public.delivery_drivers(store_id);

-- Coupons need store_id
ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_coupons_store_id ON public.coupons(store_id);

-- Migration: 20251102143420
-- Step 5: Update RLS Policies for multi-tenancy

-- Categories RLS
DROP POLICY IF EXISTS "Todos podem ver categorias ativas" ON public.categories;
DROP POLICY IF EXISTS "Staff autenticado pode gerenciar categorias" ON public.categories;

CREATE POLICY "Todos podem ver categorias ativas da loja"
ON public.categories
FOR SELECT
USING (active = true AND EXISTS (
  SELECT 1 FROM public.stores 
  WHERE stores.id = categories.store_id 
  AND stores.status = 'active'
));

CREATE POLICY "Staff pode gerenciar categorias da sua loja"
ON public.categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = categories.store_id
    AND s.franchisee_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  )
  OR has_role(auth.uid(), 'franchisee_master')
);

-- Products RLS (through category -> store)
DROP POLICY IF EXISTS "Todos podem ver produtos ativos" ON public.products;
DROP POLICY IF EXISTS "Staff autenticado pode gerenciar produtos" ON public.products;

CREATE POLICY "Todos podem ver produtos ativos da loja"
ON public.products
FOR SELECT
USING (active = true AND EXISTS (
  SELECT 1 FROM public.categories c
  JOIN public.stores s ON s.id = c.store_id
  WHERE c.id = products.category_id
  AND c.active = true
  AND s.status = 'active'
));

CREATE POLICY "Staff pode gerenciar produtos da sua loja"
ON public.products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.categories c
    JOIN public.stores s ON s.id = c.store_id
    WHERE c.id = products.category_id
    AND s.franchisee_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  )
  OR has_role(auth.uid(), 'franchisee_master')
);

-- Product Sizes RLS
DROP POLICY IF EXISTS "Todos podem ver tamanhos ativos" ON public.product_sizes;
DROP POLICY IF EXISTS "Staff autenticado pode gerenciar tamanhos" ON public.product_sizes;

CREATE POLICY "Todos podem ver tamanhos ativos da loja"
ON public.product_sizes
FOR SELECT
USING (active = true AND EXISTS (
  SELECT 1 FROM public.products p
  JOIN public.categories c ON c.id = p.category_id
  JOIN public.stores s ON s.id = c.store_id
  WHERE p.id = product_sizes.product_id
  AND p.active = true
  AND s.status = 'active'
));

CREATE POLICY "Staff pode gerenciar tamanhos da sua loja"
ON public.product_sizes
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.categories c ON c.id = p.category_id
    JOIN public.stores s ON s.id = c.store_id
    WHERE p.id = product_sizes.product_id
    AND s.franchisee_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  )
  OR has_role(auth.uid(), 'franchisee_master')
);

-- Toppings RLS
DROP POLICY IF EXISTS "Todos podem ver toppings ativos" ON public.toppings;
DROP POLICY IF EXISTS "Staff autenticado pode gerenciar toppings" ON public.toppings;

CREATE POLICY "Todos podem ver toppings ativos da loja"
ON public.toppings
FOR SELECT
USING (active = true AND EXISTS (
  SELECT 1 FROM public.stores 
  WHERE stores.id = toppings.store_id 
  AND stores.status = 'active'
));

CREATE POLICY "Staff pode gerenciar toppings da sua loja"
ON public.toppings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = toppings.store_id
    AND s.franchisee_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  )
  OR has_role(auth.uid(), 'franchisee_master')
);

-- Topping Categories RLS
DROP POLICY IF EXISTS "Todos podem ver categorias de toppings" ON public.topping_categories;
DROP POLICY IF EXISTS "Staff autenticado pode gerenciar categorias de toppings" ON public.topping_categories;

CREATE POLICY "Todos podem ver categorias de toppings da loja"
ON public.topping_categories
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.stores 
  WHERE stores.id = topping_categories.store_id 
  AND stores.status = 'active'
));

CREATE POLICY "Staff pode gerenciar categorias de toppings da sua loja"
ON public.topping_categories
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = topping_categories.store_id
    AND s.franchisee_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  )
  OR has_role(auth.uid(), 'franchisee_master')
);

-- Inventory Items RLS
DROP POLICY IF EXISTS "Staff autenticado pode gerenciar itens de estoque" ON public.inventory_items;

CREATE POLICY "Staff pode gerenciar estoque da sua loja"
ON public.inventory_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = inventory_items.store_id
    AND s.franchisee_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  )
  OR has_role(auth.uid(), 'franchisee_master')
);

-- Delivery Drivers RLS
DROP POLICY IF EXISTS "Staff pode gerenciar entregadores" ON public.delivery_drivers;

CREATE POLICY "Staff pode gerenciar entregadores da sua loja"
ON public.delivery_drivers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = delivery_drivers.store_id
    AND s.franchisee_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'staff'))
  )
  OR has_role(auth.uid(), 'franchisee_master')
);

-- Coupons RLS
DROP POLICY IF EXISTS "Todos podem ver cupons ativos" ON public.coupons;
DROP POLICY IF EXISTS "Staff pode gerenciar cupons" ON public.coupons;

CREATE POLICY "Todos podem ver cupons ativos da loja"
ON public.coupons
FOR SELECT
USING (active = true AND EXISTS (
  SELECT 1 FROM public.stores 
  WHERE stores.id = coupons.store_id 
  AND stores.status = 'active'
));

CREATE POLICY "Staff pode gerenciar cupons da sua loja"
ON public.coupons
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = coupons.store_id
    AND s.franchisee_user_id = auth.uid()
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
  )
  OR has_role(auth.uid(), 'franchisee_master')
);

-- Update Stores RLS
DROP POLICY IF EXISTS "Todos podem ver lojas ativas" ON public.stores;
DROP POLICY IF EXISTS "Admins e managers podem gerenciar lojas" ON public.stores;

CREATE POLICY "Todos podem ver lojas ativas"
ON public.stores
FOR SELECT
USING (status = 'active');

CREATE POLICY "Franchisee master pode gerenciar todas as lojas"
ON public.stores
FOR ALL
USING (has_role(auth.uid(), 'franchisee_master'));

CREATE POLICY "Franqueado pode gerenciar sua própria loja"
ON public.stores
FOR ALL
USING (franchisee_user_id = auth.uid());

CREATE POLICY "Franqueado pode ver sua própria loja"
ON public.stores
FOR SELECT
USING (franchisee_user_id = auth.uid());

-- Migration: 20251102144845
-- Criar primeiro usuário franchisee_master
-- Este script deve ser executado manualmente para criar o primeiro admin

-- Passo 1: Criar usuário no Supabase Auth
-- Execute este comando via interface administrativa ou CLI:
-- supabase auth admin create-user admin@acai.com --password SuaSenhaSegura123!

-- Passo 2: Após criar o usuário, copie o UUID gerado e execute:
-- SUBSTITUA 'COLE_UUID_AQUI' pelo UUID real do usuário criado

-- Exemplo de como adicionar o role de franchisee_master a um usuário existente:
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('COLE_UUID_AQUI', 'franchisee_master')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Para facilitar, vamos criar uma função helper que pode ser usada:
CREATE OR REPLACE FUNCTION public.add_franchisee_master_role(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Buscar o UUID do usuário pelo email
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email;
  
  IF user_uuid IS NULL THEN
    RETURN 'Usuário não encontrado com email: ' || user_email;
  END IF;
  
  -- Adicionar role franchisee_master
  INSERT INTO public.user_roles (user_id, role)
  VALUES (user_uuid, 'franchisee_master')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN 'Role franchisee_master adicionado ao usuário: ' || user_email || ' (UUID: ' || user_uuid || ')';
END;
$$;

COMMENT ON FUNCTION public.add_franchisee_master_role IS 
'Adiciona o role franchisee_master a um usuário existente pelo email. 
Exemplo de uso: SELECT add_franchisee_master_role(''admin@acai.com'');';

-- Migration: 20251102150653
-- Adicionar campos necessários para configuração completa da loja
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS address_complement TEXT,
ADD COLUMN IF NOT EXISTS neighborhood TEXT,
ADD COLUMN IF NOT EXISTS zipcode TEXT,
ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{"monday":{"open":"08:00","close":"22:00","closed":false},"tuesday":{"open":"08:00","close":"22:00","closed":false},"wednesday":{"open":"08:00","close":"22:00","closed":false},"thursday":{"open":"08:00","close":"22:00","closed":false},"friday":{"open":"08:00","close":"22:00","closed":false},"saturday":{"open":"08:00","close":"22:00","closed":false},"sunday":{"open":"08:00","close":"22:00","closed":false}}'::jsonb,
ADD COLUMN IF NOT EXISTS preparation_time INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS delivery_time INTEGER DEFAULT 40,
ADD COLUMN IF NOT EXISTS accepts_cash BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS accepts_card BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS accepts_pix BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS requires_change BOOLEAN DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN stores.business_hours IS 'Horários de funcionamento por dia da semana em formato JSON';
COMMENT ON COLUMN stores.preparation_time IS 'Tempo médio de preparo em minutos';
COMMENT ON COLUMN stores.delivery_time IS 'Tempo médio de entrega em minutos';
COMMENT ON COLUMN stores.accepts_cash IS 'Aceita pagamento em dinheiro';
COMMENT ON COLUMN stores.accepts_card IS 'Aceita pagamento em cartão';
COMMENT ON COLUMN stores.accepts_pix IS 'Aceita pagamento via PIX';
COMMENT ON COLUMN stores.requires_change IS 'Cliente precisa de troco para delivery';

-- Migration: 20251102151816
-- Corrigir policy de user_roles para permitir franchisee_master criar roles
DROP POLICY IF EXISTS "Admins podem gerenciar roles" ON public.user_roles;

CREATE POLICY "Franchisee master e admins podem gerenciar roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'franchisee_master'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'franchisee_master'));

-- Migration: 20251102154047
-- Atualizar função handle_new_customer para não criar customer sem telefone
-- Isso previne que franqueados sejam inseridos na tabela customers
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só cria customer se tiver phone no metadata (clientes reais)
  -- Franqueados não têm phone no metadata, então não serão criados como customers
  IF (NEW.raw_user_meta_data->>'phone') IS NOT NULL 
     AND (NEW.raw_user_meta_data->>'phone') != '' THEN
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE user_id = NEW.id) THEN
      INSERT INTO public.customers (user_id, email, name, phone)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', COALESCE(NEW.raw_user_meta_data->>'full_name', '')),
        NEW.raw_user_meta_data->>'phone'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Migration: 20251102154121
-- Atualizar função handle_new_customer para não criar customer sem telefone
-- Isso previne que franqueados sejam inseridos na tabela customers
CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só cria customer se tiver phone no metadata (clientes reais)
  -- Franqueados não têm phone no metadata, então não serão criados como customers
  IF (NEW.raw_user_meta_data->>'phone') IS NOT NULL 
     AND (NEW.raw_user_meta_data->>'phone') != '' THEN
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE user_id = NEW.id) THEN
      INSERT INTO public.customers (user_id, email, name, phone)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', COALESCE(NEW.raw_user_meta_data->>'full_name', '')),
        NEW.raw_user_meta_data->>'phone'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Migration: 20251102203637
-- Atualizar trigger para criar customer automaticamente após signup
-- incluindo dados de nome e telefone do metadata

CREATE OR REPLACE FUNCTION public.handle_new_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar customer se tiver phone no metadata (clientes reais)
  -- OU se tiver name no metadata (novos cadastros via formulário)
  IF ((NEW.raw_user_meta_data->>'phone') IS NOT NULL AND (NEW.raw_user_meta_data->>'phone') != '')
     OR ((NEW.raw_user_meta_data->>'name') IS NOT NULL AND (NEW.raw_user_meta_data->>'name') != '') THEN
    IF NOT EXISTS (SELECT 1 FROM public.customers WHERE user_id = NEW.id) THEN
      INSERT INTO public.customers (user_id, email, name, phone)
      VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
          NEW.raw_user_meta_data->>'name', 
          COALESCE(NEW.raw_user_meta_data->>'full_name', '')
        ),
        COALESCE(NEW.raw_user_meta_data->>'phone', '')
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Adicionar coluna para armazenar ID da transação do Mercado Pago
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS mercadopago_payment_id text,
ADD COLUMN IF NOT EXISTS mercadopago_status text;
