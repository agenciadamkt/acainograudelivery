import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.acainograu.motorista',
  appName: 'Açaí no Grau Motorista',
  webDir: 'dist-frota',
  plugins: {
    // A splash nativa (ícone gerado por @capacitor/assets) só existe pra
    // cobrir o instante de boot do WebView — o vídeo (FrotaSplashGate) é a
    // splash "de verdade" do app. Sem isso, o ícone nativo ficava visível
    // por um tempo fixo antes do vídeo começar, gerando duas splashes em
    // sequência. launchShowDuration: 0 faz ela sumir assim que o WebView
    // estiver pronto para renderizar (launchAutoHide continua true).
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      launchFadeOutDuration: 0,
      backgroundColor: '#532089',
    },
  },
};

export default config;
