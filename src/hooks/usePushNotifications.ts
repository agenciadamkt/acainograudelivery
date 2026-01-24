import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// VAPID Public Key - precisa ser a mesma configurada no backend
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Hook para gerenciar Web Push Notifications
 * Solicita permissão do usuário e registra subscription no backend
 */
export function usePushNotifications(storeId?: string) {
  const { toast } = useToast();

  useEffect(() => {
    // Só inicializar se tiver storeId
    if (!storeId) return;

    // Verificar se VAPID key está configurada
    if (!VAPID_PUBLIC_KEY) {
      console.log('[Push] ℹ️ VAPID key não configurada - push notifications desabilitadas');
      return;
    }

    const initializePushNotifications = async () => {
      try {
        console.log('[Push] 🚀 Inicializando Web Push Notifications');

        // 1. Verificar suporte do navegador
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
          console.log('[Push] ℹ️ Browser não suporta Web Push API');
          return;
        }

        // 2. Verificar permissão de notificações
        let permission = Notification.permission;

        if (permission === 'default') {
          console.log('[Push] 🔔 Solicitando permissão de notificações');
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
          console.log('[Push] ℹ️ Permissão de notificações não concedida');
          // Não mostrar toast de erro - usuário pode não querer notificações
          return;
        }

        console.log('[Push] ✅ Permissão concedida');

        // 3. Registrar Service Worker e obter subscription
        const registration = await navigator.serviceWorker.ready;
        console.log('[Push] 📱 Service Worker pronto');

        // Verificar se já existe subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          console.log('[Push] 📝 Criando nova subscription');

          // Criar nova subscription
          const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: appServerKey.buffer as ArrayBuffer
          });

          console.log('[Push] ✅ Subscription criada');
        } else {
          console.log('[Push] ♻️ Subscription já existe');
        }

        // 4. Obter usuário autenticado
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          console.warn('[Push] ⚠️ Usuário não autenticado');
          return;
        }

        // 5. Salvar/atualizar subscription no backend
        const subscriptionData = {
          user_id: user.id,
          store_id: storeId,
          endpoint: subscription.endpoint,
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth'))
        };

        console.log('[Push] 💾 Salvando subscription no backend');

        const { error } = await supabase
          .from('push_subscriptions')
          .upsert(subscriptionData, {
            onConflict: 'endpoint',
            ignoreDuplicates: false
          });

        if (error) {
          console.error('[Push] ❌ Erro ao salvar subscription:', error);
          throw error;
        }

        console.log('[Push] ✅ Web Push Notifications ativadas com sucesso!');

        toast({
          title: '🔔 Notificações ativadas!',
          description: 'Você receberá alertas de novos pedidos mesmo com o app fechado.',
        });

      } catch (error) {
        // Log silencioso - não mostrar erro para usuário
        // Push notifications são uma funcionalidade opcional
        console.log('[Push] ℹ️ Push notifications não disponíveis:', error);
      }
    };

    initializePushNotifications();
  }, [storeId, toast]);
}

/**
 * Converte VAPID public key de Base64 URL-safe para Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Converte ArrayBuffer para Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';

  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return window.btoa(binary);
}
