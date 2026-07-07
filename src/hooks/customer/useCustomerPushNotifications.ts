import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Registro de push notification nativa do app "Açaí no Grau" (cliente) —
// só roda dentro do app empacotado (Capacitor), sem efeito nenhum na versão
// web (delivery.acainograu.com.br), que continua só com WhatsApp. Token vai
// pra customer_push_tokens (diferente de push_subscriptions, que é Web Push
// do admin/franqueado) — enviado pela edge function send-customer-push
// quando o status do pedido muda (trigger on_customer_order_status_push).
export function useCustomerPushNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return;

    let registrationListener: { remove: () => void } | undefined;
    let errorListener: { remove: () => void } | undefined;
    let actionListener: { remove: () => void } | undefined;
    let cancelled = false;

    (async () => {
      try {
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions();
        }
        if (permStatus.receive !== 'granted' || cancelled) return;

        const { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!customer || cancelled) return;

        registrationListener = await PushNotifications.addListener('registration', async (token) => {
          const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
          const { error } = await supabase.from('customer_push_tokens').upsert(
            {
              customer_id: customer.id,
              platform,
              token: token.value,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'token' },
          );
          if (error) console.error('[CustomerPush] Erro ao salvar token:', error);
        });

        errorListener = await PushNotifications.addListener('registrationError', (err) => {
          console.error('[CustomerPush] Erro ao registrar push:', err);
        });

        actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const orderId = action.notification.data?.orderId;
          if (orderId) navigate(`/tracking/${orderId}`);
        });

        await PushNotifications.register();
      } catch (error) {
        console.error('[CustomerPush] Falha ao inicializar push:', error);
      }
    })();

    return () => {
      cancelled = true;
      registrationListener?.remove();
      errorListener?.remove();
      actionListener?.remove();
    };
  }, [user, navigate]);
}
