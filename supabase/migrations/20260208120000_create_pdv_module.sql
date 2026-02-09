
-- Migration for PDV (Point of Sale) Module
-- Based on the user's detailed technical requirements

-- 1. PDV Cash Registers (Caixa)
CREATE TABLE IF NOT EXISTS public.pdv_cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id), -- Owner/Operator
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  closing_amount DECIMAL(10,2),
  expected_amount DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PDV Cash Movements (Sangria/Suprimento)
CREATE TABLE IF NOT EXISTS public.pdv_cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID REFERENCES public.pdv_cash_registers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('sangria', 'suprimento')),
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PDV Tables (Mesas)
CREATE TABLE IF NOT EXISTS public.pdv_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  number INTEGER NOT NULL,
  capacity INTEGER DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved')),
  current_order_id UUID, -- Will be linked after orders table creation
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, number)
);

-- 4. PDV Products (Produtos específicos do PDV ou espelho)
-- Note: 'user_id' used for isolation, or could be linked to 'stores' if multi-tenant logic evolves
CREATE TABLE IF NOT EXISTS public.pdv_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  linked_product_id UUID REFERENCES public.products(id), -- Link to main catalog
  code TEXT,
  name TEXT NOT NULL,
  category TEXT,
  sale_type TEXT DEFAULT 'unit' CHECK (sale_type IN ('unit', 'weight')),
  unit TEXT DEFAULT 'un',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  delivery_price DECIMAL(10,2),
  current_stock DECIMAL(10,3) DEFAULT 0,
  minimum_stock DECIMAL(10,3) DEFAULT 0,
  ean TEXT,
  cfop TEXT,
  csosn TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. PDV Orders (Pedidos)
CREATE TABLE IF NOT EXISTS public.pdv_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  table_id UUID REFERENCES public.pdv_tables(id),
  cash_register_id UUID REFERENCES public.pdv_cash_registers(id),
  customer_name TEXT,
  customer_cpf TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'cancelled')),
  subtotal DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT, -- 'money', 'credit', 'debit', 'pix'
  amount_paid DECIMAL(10,2),
  change_amount DECIMAL(10,2),
  sales_channel TEXT DEFAULT 'store' CHECK (sales_channel IN ('store', 'delivery')),
  delivery_platform TEXT, -- 'ifood', 'delivery_vip', etc.
  cancel_reason TEXT,
  cancel_note TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add Foreign Key for circular dependency
ALTER TABLE public.pdv_tables 
ADD CONSTRAINT fk_current_order 
FOREIGN KEY (current_order_id) REFERENCES public.pdv_orders(id);

-- 6. PDV Order Items
CREATE TABLE IF NOT EXISTS public.pdv_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.pdv_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.pdv_products(id),
  product_name TEXT NOT NULL, -- Snapshot of name
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL, -- Snapshot of price
  weight DECIMAL(10,3), -- For scale items
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. PDV Settings
CREATE TABLE IF NOT EXISTS public.pdv_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  printer_ip TEXT,
  printer_port INTEGER DEFAULT 9100,
  printer_model TEXT DEFAULT 'generic',
  auto_print BOOLEAN DEFAULT false,
  min_discount_value DECIMAL(10,2),
  allow_negative_stock BOOLEAN DEFAULT false,
  require_cpf BOOLEAN DEFAULT false,
  integrate_with_receivables BOOLEAN DEFAULT true,
  auto_receive_cash BOOLEAN DEFAULT true,
  use_qz_tray BOOLEAN DEFAULT false,
  qz_printer_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 8. Enable RLS
ALTER TABLE public.pdv_cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdv_settings ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies (Simple User Isolation)
-- Users can only see/edit their own data (or data belonging to their store/context if modified for teams later)
-- For now, relying on user_id as per description.

CREATE POLICY "Users manage their own cash registers" ON public.pdv_cash_registers
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own cash movements" ON public.pdv_cash_movements
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own tables" ON public.pdv_tables
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own products" ON public.pdv_products
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own orders" ON public.pdv_orders
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own order items" ON public.pdv_order_items
  USING (EXISTS (SELECT 1 FROM public.pdv_orders WHERE id = pdv_order_items.order_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.pdv_orders WHERE id = pdv_order_items.order_id AND user_id = auth.uid()));

CREATE POLICY "Users manage their own settings" ON public.pdv_settings
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. Indexes
CREATE INDEX idx_pdv_orders_user_id ON public.pdv_orders(user_id);
CREATE INDEX idx_pdv_orders_status ON public.pdv_orders(status);
CREATE INDEX idx_pdv_products_code ON public.pdv_products(code);
CREATE INDEX idx_pdv_order_items_order_id ON public.pdv_order_items(order_id);
