-- Migration: Create Franchisee Ordering System
-- Adds franchisee_product_categories, franchisee_products, franchisee_orders, franchisee_order_items

-- 1. Categories
CREATE TABLE IF NOT EXISTS public.franchisee_product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    icon_url TEXT,
    display_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Products
CREATE TABLE IF NOT EXISTS public.franchisee_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES public.franchisee_product_categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'unidade', -- kg, unidade, caixa
    image_url TEXT,
    stock_quantity DECIMAL(12,2) DEFAULT 0,
    taxa DECIMAL(12,2) DEFAULT 0, -- Taxa de Boleto (fixo R$)
    has_advertising_fee BOOLEAN DEFAULT false, -- Participa da taxa de publicidade
    advertising_fee_percentage DECIMAL(5,2) DEFAULT 0, -- Percentual (%) da Taxa de Publicidade
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Orders
CREATE TABLE IF NOT EXISTS public.franchisee_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchisee_user_id UUID NOT NULL REFERENCES auth.users(id),
    distribution_center_id UUID REFERENCES public.distribution_centers(id),
    status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, shipping, delivered
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0, -- Soma dos itens (com taxa de boleto se aplicável)
    fees_total DECIMAL(12,2) NOT NULL DEFAULT 0, -- Total das taxas de boleto (para exibição)
    advertising_fee DECIMAL(12,2) NOT NULL DEFAULT 0, -- Total da taxa de publicidade
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0, -- Valor final (subtotal + advertising_fee)
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Order Items
CREATE TABLE IF NOT EXISTS public.franchisee_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.franchisee_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.franchisee_products(id),
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0, -- Preço base
    taxa_boleto_unit_applied DECIMAL(12,2) DEFAULT 0, -- Taxa de boleto aplicada por unidade
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS (quantity * (unit_price + taxa_boleto_unit_applied)) STORED,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.franchisee_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchisee_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchisee_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.franchisee_order_items ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Categories: Everyone authenticated can view
CREATE POLICY "Anyone authenticated can view categories"
    ON public.franchisee_product_categories FOR SELECT
    USING (auth.role() = 'authenticated');

-- Products: Everyone authenticated can view
CREATE POLICY "Anyone authenticated can view products"
    ON public.franchisee_products FOR SELECT
    USING (auth.role() = 'authenticated');

-- Orders: Franchisees view own, Admin views all
CREATE POLICY "Franchisees view own orders"
    ON public.franchisee_orders FOR SELECT
    USING (auth.uid() = franchisee_user_id OR public.is_admin_master());

CREATE POLICY "Franchisees insert own orders"
    ON public.franchisee_orders FOR INSERT
    WITH CHECK (auth.uid() = franchisee_user_id);

CREATE POLICY "Admin manages all orders"
    ON public.franchisee_orders FOR ALL
    USING (public.is_admin_master());

-- Order Items: Link to orders RLS
CREATE POLICY "Franchisees view own order items"
    ON public.franchisee_order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.franchisee_orders
            WHERE id = order_id AND (franchisee_user_id = auth.uid() OR public.is_admin_master())
        )
    );

CREATE POLICY "Franchisees insert own order items"
    ON public.franchisee_order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.franchisee_orders
            WHERE id = order_id AND franchisee_user_id = auth.uid()
        )
    );

-- 7. Seed Categories
INSERT INTO public.franchisee_product_categories (name, display_order) VALUES
('Açaís & Cremes', 1),
('Potes', 2),
('Sorvetes', 3),
('Paletas', 4),
('Toppings', 5),
('Descartáveis e Limpeza', 6),
('Utensílios', 7),
('Bombons', 8),
('Recheios', 9),
('Cereais & Castanhas', 10),
('Coberturas', 11),
('Brindes', 12)
ON CONFLICT DO NOTHING;

-- 8. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_franchisee_orders_updated_at
    BEFORE UPDATE ON public.franchisee_orders
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
