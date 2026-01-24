-- Criar tabela infinitepay_checkouts para registrar tentativas e estado do pagamento
CREATE TABLE public.infinitepay_checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_nsu text NOT NULL,
  invoice_slug text,
  transaction_nsu text,
  receipt_url text,
  amount integer NOT NULL, -- em centavos
  paid_amount integer,
  installments integer,
  capture_method text, -- 'pix' | 'credit_card'
  status text NOT NULL DEFAULT 'CREATED', -- CREATED, LINK_GENERATED, REDIRECTED, PAID, FAILED, CANCELED
  items jsonb NOT NULL,
  customer jsonb,
  address jsonb,
  checkout_url text,
  raw_webhook jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_order_checkout UNIQUE(user_id, order_id),
  CONSTRAINT unique_order_nsu UNIQUE(order_nsu)
);

-- Índices para performance
CREATE INDEX idx_infinitepay_checkouts_status ON public.infinitepay_checkouts(status);
CREATE INDEX idx_infinitepay_checkouts_user_id ON public.infinitepay_checkouts(user_id);
CREATE INDEX idx_infinitepay_checkouts_order_id ON public.infinitepay_checkouts(order_id);

-- Trigger para updated_at
CREATE TRIGGER update_infinitepay_checkouts_updated_at
  BEFORE UPDATE ON public.infinitepay_checkouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.infinitepay_checkouts ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios checkouts
CREATE POLICY "Users can view own checkouts"
  ON public.infinitepay_checkouts FOR SELECT
  USING (auth.uid() = user_id);

-- Staff pode ver todos os checkouts
CREATE POLICY "Staff can view all checkouts"
  ON public.infinitepay_checkouts FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'staff'::app_role) OR
    has_role(auth.uid(), 'franchisee_master'::app_role)
  );

-- Usuários podem inserir seus próprios checkouts
CREATE POLICY "Users can insert own checkouts"
  ON public.infinitepay_checkouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários e staff podem atualizar checkouts
CREATE POLICY "Users and staff can update checkouts"
  ON public.infinitepay_checkouts FOR UPDATE
  USING (
    auth.uid() = user_id OR 
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'staff'::app_role) OR
    has_role(auth.uid(), 'franchisee_master'::app_role)
  );