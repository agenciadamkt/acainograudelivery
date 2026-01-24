-- Inserir templates de mensagens para o WhatsApp caso não existam
INSERT INTO public.system_settings (key, value, description, category) 
VALUES (
  'whatsapp_messages', 
  '{
    "pending": "Olá {name}! Recebemos seu pedido #{order_number} na *Açaí no Grau*. Estamos aguardando a confirmação do pagamento. 🕒",
    "confirmed": "Olá {name}! Seu pedido #{order_number} foi *CONFIRMADO* e já entrou em nossa fila de produção. ✅",
    "preparing": "Seu pedido #{order_number} já está sendo *PREPARADO* com todo o capricho. 🍦",
    "ready": "Seu pedido #{order_number} está *PRONTO* e já saiu com o motoboy para entrega! 🛵💨",
    "delivered": "Pedido #{order_number} entregue! ✅ Esperamos que aproveite seu açaí. Bom apetite! 💜",
    "cancelled": "Olá {name}, infelizmente seu pedido #{order_number} foi cancelado. ❌"
  }', 
  'Templates das mensagens de WhatsApp (use {name} e {order_number} como variáveis)', 
  'notificacoes'
)
ON CONFLICT (key) DO NOTHING;
