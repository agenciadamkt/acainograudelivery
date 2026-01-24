-- Trigger para enviar notificação de WhatsApp quando o status do pedido mudar
-- Nota: Esta migração assume que a Edge Function 'whatsapp-notification' já foi implantada

-- 1. Habilitar a extensão net se ainda não estiver habilitada (para chamadas HTTP)
-- Nota: Em muitos ambientes Supabase, isso é feito via interface ou webhooks nativos.
-- Aqui usaremos um Database Webhook (mais moderno no Supabase).

-- No Supabase, Webhooks são configurados de forma mais simples via Dashboard, 
-- mas aqui vamos documentar como seria a chamada via função se necessário:

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chamada para a Edge Function via HTTP
  -- Nota: O Supabase recomenda usar "Database Webhooks" nativos pela UI, 
  -- mas esta função permite automatizar via SQL.
  
  PERFORM
    net.http_post(
      url := 'https://sixzfcpdjtnftacuwvph.functions.supabase.co/whatsapp-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || auth.jwt() -- Ou service role se necessário
      ),
      body := jsonb_build_object(
        'type', 'UPDATE',
        'table', 'orders',
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )
    );
    
  RETURN NEW;
END;
$$;

-- No entanto, a forma recomendada atual é criar o Webhook via Painel -> Database -> Webhooks.
-- Como estamos em um contexto de código, vou deixar a lógica da função preparada.
