-- Push notifications nativas pro app "Açaí no Grau" (Delivery/cliente).
-- Independente da tabela push_subscriptions (Web Push do admin/franqueado,
-- formato de subscription diferente) — aqui é token de FCM/APNs de app
-- nativo (Capacitor), um token por instalação de app.

CREATE TABLE public.customer_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (token)
);

CREATE INDEX idx_customer_push_tokens_customer_id ON public.customer_push_tokens(customer_id);

ALTER TABLE public.customer_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clientes podem gerenciar seus próprios tokens de push"
  ON public.customer_push_tokens FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = customer_push_tokens.customer_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers
      WHERE id = customer_push_tokens.customer_id
      AND user_id = auth.uid()
    )
  );

-- Função + trigger que dispara a edge function de envio de push quando o
-- status do pedido muda — mesmo padrão de net.http_post já usado em
-- notify_new_order_push() (AFTER INSERT, alerta de novo pedido pro
-- franqueado) e notify_order_status_change() (webhook de WhatsApp), só que
-- dedicado ao push nativo do cliente, com trigger próprio em vez de
-- depender do Database Webhook configurado via painel.
CREATE OR REPLACE FUNCTION public.notify_customer_order_push()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- send-customer-push roda com verify_jwt = false (mesma config de
    -- whatsapp-notification) — a função usa SUPABASE_SERVICE_ROLE_KEY do
    -- próprio ambiente da edge function pra montar seu client Supabase, não
    -- depende do header Authorization daqui pra autenticação.
    PERFORM net.http_post(
      url := 'https://sixzfcpdjtnftacuwvph.supabase.co/functions/v1/send-customer-push',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'order_id', NEW.id,
        'status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Falha ao notificar nunca pode impedir a atualização do pedido.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_customer_order_status_push ON public.orders;
CREATE TRIGGER on_customer_order_status_push
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_customer_order_push();
