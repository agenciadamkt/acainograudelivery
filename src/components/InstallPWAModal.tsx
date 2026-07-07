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
import { Share, PlusSquare, Smartphone } from "lucide-react";

type Platform = 'android' | 'ios' | 'desktop' | null;

const InstallPWAModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<Platform>(null);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone ||
      document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Check cooldown
    const lastPromptStr = localStorage.getItem('pwa_install_prompt_date');
    if (lastPromptStr) {
      const lastPrompt = new Date(lastPromptStr);
      const now = new Date();
      const diffDays = Math.ceil((now.getTime() - lastPrompt.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) return; // 7 days cooldown
    }

    // iOS Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    if (isIOS) {
      setPlatform('ios');
      // Show after 3 seconds for iOS too
      setTimeout(() => setIsOpen(true), 3000);
    }

    // Android/Desktop Detection via event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform('android');

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
      setIsOpen(false);
      localStorage.setItem('pwa_install_prompt_date', new Date().toISOString());
    }
  };

  const handleDismiss = () => {
    setIsOpen(false);
    // Set validation date to current time
    localStorage.setItem('pwa_install_prompt_date', new Date().toISOString());
  };

  const handleNotNow = () => {
    setIsOpen(false);
    // Short cooldown if "Not Now" (e.g. 1 day or reset logic) - For now same as dismiss
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-sm rounded-[24px] border-none shadow-2xl bg-white p-6">
        <div className="flex flex-col items-center text-center">

          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-sm animate-pulse-soft">
            <img
              src={logoCircular}
              alt="Açaí no Grau"
              className="w-16 h-16 object-contain"
            />
          </div>

          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
              Instale o App GrauOS
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-sm leading-relaxed">
              {platform === 'ios'
                ? "Para a melhor experiência, adicione nosso app à sua tela de início."
                : "Instale nosso app para fazer pedidos mais rápido e receber ofertas exclusivas!"}
            </DialogDescription>
          </DialogHeader>

          {platform === 'ios' ? (
            <div className="w-full bg-gray-50 p-4 rounded-xl space-y-3 mb-6 border border-gray-100">
              <div className="flex items-center gap-3 text-left">
                <div className="bg-white p-2 text-blue-500 rounded-lg shadow-sm">
                  <Share className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-600">1. Toque no botão <span className="font-semibold text-gray-900">Compartilhar</span></span>
              </div>
              <div className="w-full h-px bg-gray-200/50" />
              <div className="flex items-center gap-3 text-left">
                <div className="bg-white p-2 text-gray-700 rounded-lg shadow-sm">
                  <PlusSquare className="w-5 h-5" />
                </div>
                <span className="text-sm text-gray-600">2. Selecione <span className="font-semibold text-gray-900">Adicionar à Tela de Início</span></span>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleInstall}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-12 rounded-xl mb-3 shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Instalar App
            </Button>
          )}

          <Button
            onClick={handleDismiss}
            variant="ghost"
            className="w-full text-gray-400 hover:text-gray-600 hover:bg-transparent font-normal h-auto py-2"
          >
            Agora não, obrigado
          </Button>

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstallPWAModal;
