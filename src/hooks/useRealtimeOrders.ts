import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const NOTIFICATION_CHANNEL = 'new-order-notifications';

export function useRealtimeOrders() {
  const queryClient = useQueryClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const [newOrderForDialog, setNewOrderForDialog] = useState<any>(null);
  const toastIdRef = useRef<string | number | null>(null);
  const notificationBroadcastRef = useRef<BroadcastChannel | null>(null);

  // Inicializar Broadcast Channel
  useEffect(() => {
    console.log('[Hook] 🔍 Verificando suporte a BroadcastChannel...');

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        notificationBroadcastRef.current = new BroadcastChannel(NOTIFICATION_CHANNEL);
        console.log('[Hook] ✅ Broadcast Channel criado:', NOTIFICATION_CHANNEL);

        // Testar envio de mensagem após 5 segundos
        setTimeout(() => {
          console.log('[Hook] 🧪 Enviando mensagem de teste...');
          notificationBroadcastRef.current?.postMessage({
            type: 'TEST',
            message: 'Teste de conexão com Service Worker'
          });
        }, 5000);

      } catch (error) {
        console.error('[Hook] ❌ Erro ao criar BroadcastChannel:', error);
      }
    } else {
      console.error('[Hook] ❌ BroadcastChannel não é suportado neste navegador');
    }

    return () => {
      console.log('[Hook] 🧹 Fechando Broadcast Channel');
      notificationBroadcastRef.current?.close();
    };
  }, []);

  // Solicitar permissão para notificações
  useEffect(() => {
    console.log('🔔 Verificando suporte a notificações...');

    if (!('Notification' in window)) {
      console.error('❌ Este navegador não suporta notificações!');
      return;
    }

    console.log('📋 Status atual da permissão:', Notification.permission);

    if (Notification.permission === 'default') {
      console.log('🔔 Solicitando permissão para notificações...');
      Notification.requestPermission().then(permission => {
        console.log('📋 Permissão concedida:', permission);
        if (permission === 'granted') {
          console.log('✅ Permissão de notificação concedida');
          // Testar notificação após 3 segundos
          setTimeout(() => {
            const testNotification = new Notification('🧪 Teste de Notificação', {
              body: 'Se você vê isso, as notificações estão funcionando!',
              icon: '/logo-192x192.png',
            });
            console.log('🧪 Notificação de teste enviada');
          }, 3000);
        } else {
          console.warn('⚠️ Permissão de notificação negada');
        }
      });
    } else if (Notification.permission === 'granted') {
      console.log('✅ Permissão de notificação já concedida anteriormente');
      // Testar notificação após 3 segundos
      setTimeout(() => {
        const testNotification = new Notification('🧪 Teste de Notificação', {
          body: 'Se você vê isso, as notificações estão funcionando!',
          icon: '/logo-192x192.png',
        });
        console.log('🧪 Notificação de teste enviada');
      }, 3000);
    } else if (Notification.permission === 'denied') {
      console.warn('⚠️ Notificações bloqueadas pelo usuário. O som de alerta não tocará.');
    }
  }, []);

  // Inicializar áudio ou criar beep via Web Audio API
  useEffect(() => {
    // Tentar carregar arquivo de som
    const audio = new Audio('/sounds/chegou.mp3');
    audio.loop = true;

    // Fallback: criar beep se arquivo não existir
    audio.onerror = () => {
      // Usar Web Audio API como fallback
    };

    audioRef.current = audio;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const beepIntervalRef = useRef<number | null>(null);

  const playBeepLoop = () => {
    if (beepIntervalRef.current) return;

    const playBeep = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => oscillator.stop(), 300);
    };

    playBeep();
    beepIntervalRef.current = window.setInterval(playBeep, 1000);
    setIsPlayingSound(true);
    console.log('🔊 Beep contínuo iniciado');
  };

  const showNotification = (orderData: any) => {
    console.log('[Hook] 🔔 showNotification chamada');
    console.log('[Hook] 📋 Order data:', orderData);
    console.log('[Hook] 📡 Broadcast Channel ref:', notificationBroadcastRef.current);

    // Enviar via Broadcast Channel para o Service Worker
    if (notificationBroadcastRef.current) {
      try {
        notificationBroadcastRef.current.postMessage({
          type: 'NEW_ORDER',
          order: orderData
        });
        console.log('[Hook] ✅ Mensagem enviada via Broadcast Channel');
      } catch (error) {
        console.error('[Hook] ❌ Erro ao enviar via Broadcast Channel:', error);
      }
    } else {
      console.warn('[Hook] ⚠️ Broadcast Channel não está disponível');
    }

    // Fallback: Notification API normal (se SW não disponível)
    if ('Notification' in window && Notification.permission === 'granted') {
      console.log('[Hook] 🔔 Criando notificação fallback...');

      try {
        const notification = new Notification('🔔 NOVO PEDIDO CHEGOU!', {
          body: `Pedido #${orderData.order_number}\nCliente: ${orderData.customer?.name || 'Cliente'}\nValor: R$ ${orderData.total_amount?.toFixed(2) || '0.00'}`,
          icon: '/logo-192x192.png',
          badge: '/logo-192x192.png',
          tag: 'new-order-' + orderData.id,
          requireInteraction: true,
          silent: false,
        } as NotificationOptions);

        notification.onclick = () => {
          console.log('[Hook] 🔔 Notificação fallback clicada');
          window.focus();
          notification.close();
        };

        console.log('[Hook] ✅ Notificação fallback criada');
      } catch (error) {
        console.error('[Hook] ❌ Erro ao criar notificação fallback:', error);
      }
    } else {
      console.warn('[Hook] ⚠️ Notification API não disponível ou sem permissão');
    }
  };

  const playSound = () => {
    if (isPlayingSound) return;

    console.log('🔊 Tentando tocar som...');

    if (audioRef.current) {
      const playPromise = audioRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Som tocando com sucesso');
            setIsPlayingSound(true);
          })
          .catch((error) => {
            console.warn('⚠️ Navegador bloqueou áudio:', error);
            playBeepLoop();
          });
      }
    } else {
      console.warn('⚠️ AudioRef não disponível, usando beep');
      playBeepLoop();
    }
  };

  const stopSound = () => {
    // Parar MP3
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Parar beep loop
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }

    setIsPlayingSound(false);
    console.log('🔇 Som parado');

    // Fechar toast se existir
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }
  };

  const clearNewOrder = () => {
    setNewOrderForDialog(null);
    stopSound();
  };

  useEffect(() => {
    const channel = supabase
      .channel('orders-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order-stats'] });

          // Buscar dados completos do pedido
          const { data: orderData } = await supabase
            .from('orders')
            .select(`
              *,
              customer:customers(name, phone),
              delivery_address:customer_addresses(*),
              items:order_items(
                *,
                product:products(name),
                product_size:product_sizes(name),
                toppings:order_item_toppings(
                  *,
                  topping:toppings(name)
                )
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (orderData) {
            console.log('🔍 DEBUG - orderData from realtime:', orderData);
            console.log('🔍 DEBUG - orderData.items:', orderData.items);
            setNewOrderForDialog(orderData);

            // Tocar som em loop
            playSound();

            // Mostrar notificação do navegador
            showNotification(orderData);

            console.log('🔔 NOVO PEDIDO!', orderData);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order-stats'] });

          if (payload.new.status !== payload.old.status) {
            queryClient.invalidateQueries({ queryKey: ['orders', payload.new.id] });

            // Parar som se o status mudou de pending
            if (payload.old.status === 'pending' && payload.new.status !== 'pending') {
              stopSound();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopSound();
    };
  }, [queryClient]);

  return {
    isPlayingSound,
    stopSound,
    newOrderForDialog,
    clearNewOrder,
  };
}
