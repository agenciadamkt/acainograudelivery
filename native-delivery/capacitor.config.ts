import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.acainograu.delivery',
  appName: 'Açaí no Grau',
  webDir: '../dist-delivery',
  android: { path: 'android' },
  ios: { path: 'ios' },
  plugins: {
    // Sem isso, o iOS não mostra banner nenhum quando a notificação chega
    // com o app aberto em primeiro plano (comportamento padrão do plugin é
    // silencioso nesse caso) — o cliente ficaria sem ver o push justamente
    // quando está de olho no app acompanhando o pedido.
    PushNotifications: {
      presentationOptions: ['alert', 'sound', 'badge'],
    },
  },
};

export default config;
