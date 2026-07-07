import { useEffect, useRef } from 'react';
import splashVideoSrc from '@/assets/frota/splash-video.mp4';

interface SplashVideoProps {
  onFinish: () => void;
}

// Duração real do arquivo é ~3.8s — timeout de segurança bem mais folgado
// (o dobro + margem) pra nunca prender o usuário na splash se onEnded/onError
// não disparar por algum motivo fora do previsto (arquivo corrompido, engine
// de vídeo travando, etc.) — requisito de "timeout de segurança".
const SAFETY_TIMEOUT_MS = 8000;

// Splash animada com vídeo+áudio do app do motorista — reproduz o
// src/assets/frota/splash-video.mp4 (cópia de erros/splash.mp4, sem
// reencode/edição) uma única vez, em tela cheia, sem controles, e avisa o
// pai (FrotaSplashGate) quando puder navegar pra frente. Autoplay com áudio
// funciona sem configuração nativa extra: o Capacitor já libera isso por
// padrão nas duas plataformas (Bridge.java:
// setMediaPlaybackRequiresUserGesture(false); CAPBridgeViewController.swift:
// mediaTypesRequiringUserActionForPlayback = []) — só não funciona com som
// testando num navegador desktop comum (política de autoplay do navegador),
// só no app empacotado de verdade.
export function SplashVideo({ onFinish }: SplashVideoProps) {
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('[SplashVideo] Timeout de segurança acionado — seguindo sem esperar o vídeo terminar.');
      finish();
    }, SAFETY_TIMEOUT_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-[#532089] flex items-center justify-center overflow-hidden">
      <video
        className="w-full h-full object-cover"
        src={splashVideoSrc}
        autoPlay
        playsInline
        controls={false}
        disablePictureInPicture
        onEnded={finish}
        onError={(e) => {
          console.error('[SplashVideo] Erro ao reproduzir o vídeo de splash:', e);
          finish();
        }}
      />
    </div>
  );
}
