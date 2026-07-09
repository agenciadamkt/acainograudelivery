-- Dispara a Edge Function whatsapp-notification quando o status de um pedido
-- muda, enviando a notificação automática de WhatsApp ao cliente.
--
-- Contexto do bug corrigido aqui:
--   * A migration 20260122104500 definiu notify_order_status_change() mas
--     NUNCA criou o CREATE TRIGGER que a liga à tabela orders — então o envio
--     automático nunca acontecia. Dependia de um "Database Webhook" configurado
--     manualmente no painel, que não existe.
--   * Aquela função usava Authorization: Bearer auth.jwt(), que é nulo em
--     contexto de trigger. A whatsapp-notification roda com verify_jwt = false
--     e usa o próprio SUPABASE_SERVICE_ROLE_KEY, então nenhum header de auth é
--     necessário (mesmo padrão já usado em notify_customer_order_push).
--
-- A função só monta o payload no formato { record, old_record } que a Edge
-- Function espera; toda a lógica de decisão (config do franqueado,
-- auto_send_enabled, notify_statuses, template) vive na Edge Function.

CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM net.http_post(
      url := 'https://sixzfcpdjtnftacuwvph.supabase.co/functions/v1/whatsapp-notification',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'type', 'UPDATE',
        'table', 'orders',
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Falha ao notificar nunca pode impedir a atualização do pedido.
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_status_whatsapp ON public.orders;
CREATE TRIGGER on_order_status_whatsapp
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_status_change();
