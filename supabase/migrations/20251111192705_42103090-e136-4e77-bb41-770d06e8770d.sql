-- Tabela para armazenar subscriptions de push notification
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_push_subscriptions_store_id ON public.push_subscriptions(store_id);
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para notificar novo pedido via HTTP
CREATE OR REPLACE FUNCTION public.notify_new_order_push()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Pegar URL e key do ambiente
  supabase_url := current_setting('app.settings', true)::json->>'supabase_url';
  service_role_key := current_setting('app.settings', true)::json->>'service_role_key';
  
  -- Se não estiver configurado, usar valores padrão (Edge Function vai pegar do env)
  IF supabase_url IS NULL THEN
    supabase_url := 'https://xjibukpltjwijyecklio.supabase.co';
  END IF;
  
  -- Chamar edge function via pg_net
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_role_key, '')
    ),
    body := jsonb_build_object(
      'order_id', NEW.id,
      'store_id', NEW.store_id
    )
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error mas não bloqueia insert do pedido
    RAISE WARNING 'Erro ao enviar push notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para chamar função quando novo pedido é inserido
CREATE TRIGGER on_new_order_push
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_order_push();