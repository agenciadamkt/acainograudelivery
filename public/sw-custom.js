// Service Worker para notificações em background (Web Push API)
// Updated: 2026-02-04T11:27:00Z
// Version: 4.0 - Fix PWA infinite loop

const NOTIFICATION_CHANNEL = 'new-order-notifications';

// Manter BroadcastChannel para compatibilidade com sistema existente
const broadcast = new BroadcastChannel(NOTIFICATION_CHANNEL);
console.log('[SW] 📡 BroadcastChannel inicializado:', NOTIFICATION_CHANNEL);

broadcast.onmessage = (event) => {
  console.log('[SW] 📨 Mensagem recebida via broadcast:', event.data);

  const { type, order } = event.data;

  if (type === 'NEW_ORDER') {
    console.log('[SW] 🔔 Processando novo pedido:', order.order_number);

    self.registration.showNotification('🔔 NOVO PEDIDO CHEGOU!', {
      body: `Pedido #${order.order_number}\nCliente: ${order.customer?.name || 'Cliente'}\nValor: R$ ${order.total_amount?.toFixed(2) || '0.00'}`,
      icon: '/logo-192x192.png',
      badge: '/logo-192x192.png',
      tag: 'new-order-' + order.id,
      requireInteraction: true,
      silent: false,
      vibrate: [200, 100, 200],
      data: {
        orderId: order.id,
        url: '/admin/orders'
      }
    }).then(() => {
      console.log('[SW] ✅ Notificação exibida com sucesso');
    }).catch((error) => {
      console.error('[SW] ❌ Erro ao exibir notificação:', error);
    });
  } else {
    console.warn('[SW] ⚠️ Tipo de mensagem desconhecido:', type);
  }
};

broadcast.onerror = (error) => {
  console.error('[SW] ❌ Erro no BroadcastChannel:', error);
};

// ✨ NOVO: Listener para Web Push API (funciona mesmo com app fechado)
self.addEventListener('push', (event) => {
  console.log('[SW] 📨 Push notification recebida via Web Push API');

  let data = {};

  try {
    data = event.data ? event.data.json() : {};
    console.log('[SW] 📦 Dados do push:', data);
  } catch (error) {
    console.error('[SW] ❌ Erro ao parsear dados do push:', error);
  }

  event.waitUntil(
    self.registration.showNotification(data.title || '🔔 Novo Pedido', {
      body: data.body || 'Você tem um novo pedido',
      icon: data.icon || '/logo-192x192.png',
      badge: data.badge || '/logo-192x192.png',
      tag: data.tag || 'order-notification',
      requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : true,
      vibrate: data.vibrate || [200, 100, 200],
      data: data.data || {}
    }).then(() => {
      console.log('[SW] ✅ Push notification exibida com sucesso');
    }).catch((error) => {
      console.error('[SW] ❌ Erro ao exibir push notification:', error);
    })
  );
});

// Listener de clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 🔔 Notificação clicada');

  event.notification.close();

  // Abrir/focar na janela do admin
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Tentar focar em uma janela existente
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus();
        }
      }

      // Se não houver janela aberta, abrir nova
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// Listener de instalação
self.addEventListener('install', (event) => {
  console.log('[SW] ✅ Service Worker instalado');
  self.skipWaiting(); // Force immediate activation
});

// Lista de caches válidos (v4)
const VALID_CACHES = [
  'html-cache-v4',
  'assets-cache-v4',
  'workbox-precache-v2-'
];

// Listener de ativação - limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] ✅ Service Worker ativado - limpando caches antigos...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Se não é um cache válido atual, deletar
          const isValid = VALID_CACHES.some(valid => cacheName.includes(valid) || cacheName.startsWith(valid));
          if (!isValid) {
            console.log('[SW] 🗑️ Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
          return null;
        })
      );
    }).then(() => {
      console.log('[SW] ✅ Limpeza de caches concluída');
      return clients.claim();
    })
  );
});
