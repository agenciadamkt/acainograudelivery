import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import logoCircular from "@/assets/logo-circular.png";

const InstallPWAModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado como PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    // Verificar se usuário já dispensou
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) return;

    // Escutar o evento beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      
      // Aguardar 3 segundos antes de abrir
      setTimeout(() => setIsOpen(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setIsOpen(false);
      localStorage.setItem('pwa_install_dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  const handleNotNow = () => {
    setIsOpen(false);
  };

  if (!isInstallable) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md p-8 text-center">
        <img 
          src={logoCircular} 
          alt="Açaí no Grau" 
          className="w-24 h-24 mx-auto mb-4"
        />
        
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Instale nosso app!
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            📱 Tenha acesso mais rápido direto da tela inicial do seu dispositivo!
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mt-6">
          <Button 
            onClick={handleInstall}
            className="flex-1"
            size="lg"
          >
            Instalar
          </Button>
          <Button 
            onClick={handleDismiss}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            Agora não
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstallPWAModal;
