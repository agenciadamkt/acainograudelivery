import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoCircular from "@/assets/logo-circular.png";

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary to-primary/90 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 space-y-6 text-center">
        <img 
          src={logoCircular} 
          alt="Açaí no Grau" 
          className="w-24 h-24 mx-auto"
        />
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Instale nosso app!
          </h1>
          <p className="text-muted-foreground">
            📱 Tenha acesso mais rápido direto da tela inicial do seu dispositivo!
          </p>
        </div>

        {isInstallable ? (
          <div className="flex gap-3">
            <Button 
              onClick={handleInstallClick}
              className="flex-1"
              size="lg"
            >
              Instalar
            </Button>
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="flex-1"
              size="lg"
            >
              Agora não
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-3 text-left bg-muted/50 p-4 rounded-lg">
              <div>
                <p className="font-semibold">📱 iPhone/iPad:</p>
                <p className="text-xs mt-1">Toque no ícone de compartilhar ⎙ e selecione "Adicionar à Tela de Início"</p>
              </div>
              
              <div>
                <p className="font-semibold">🤖 Android:</p>
                <p className="text-xs mt-1">Toque no menu ⋮ e selecione "Instalar app" ou "Adicionar à tela inicial"</p>
              </div>
            </div>
            
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Agora não
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Install;
