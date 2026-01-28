import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import InstallPWAModal from './InstallPWAModal';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';

const AppManager = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered:', r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const [updateToastId, setUpdateToastId] = useState<string | number | null>(null);

    // Effect to show update toast
    useEffect(() => {
        // Prevent infinite loop: don't show toast if we just updated (< 10s ago)
        let recentlyUpdated = false;
        try {
            const lastUpdate = localStorage.getItem('last_pwa_update');
            if (lastUpdate && Date.now() - parseInt(lastUpdate) < 10000) {
                recentlyUpdated = true;
            }
        } catch (e) {
            // Ignore storage errors
        }

        if (recentlyUpdated) return;

        if (needRefresh && !updateToastId) {
            const id = toast.custom((t) => (
                <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-lg p-4 w-full max-w-sm flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-full shrink-0">
                            <RefreshCw className="w-5 h-5 text-primary animate-spin" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Nova versão disponível!</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Uma nova versão do app está pronta. Atualize para ver as novidades.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        className="w-full bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
                        onClick={async () => {
                            toast.dismiss(t);
                            try {
                                // 1. Tentar atualizar o SW
                                await updateServiceWorker(true);

                                // 2. Forçar limpeza de caches antigos para evitar loops
                                if ('caches' in window) {
                                    const keys = await caches.keys();
                                    await Promise.all(keys.map(key => caches.delete(key)));
                                }
                            } catch (e) {
                                console.error("Update error:", e);
                            }

                            // 3. Mark update time to prevent loop
                            try {
                                localStorage.setItem('last_pwa_update', Date.now().toString());
                            } catch (e) {
                                // Ignore storage errors
                            }

                            // 4. Forçar reload agressivo
                            window.location.reload();
                        }}
                    >
                        Atualizar Agora
                    </Button>
                </div>
            ), {
                duration: Infinity,
                position: 'top-center',
                id: 'pwa-update-toast', // ID fixo para evitar duplicatas
                onDismiss: () => setUpdateToastId(null),
            });
            setUpdateToastId(id);
        }
    }, [needRefresh, updateServiceWorker, updateToastId]);

    // Effect for offline ready
    useEffect(() => {
        if (offlineReady) {
            toast.success("App pronto para uso offline!");
            setOfflineReady(false);
        }
    }, [offlineReady, setOfflineReady]);

    // Periodic version check (optional, basic check)
    useEffect(() => {
        const checkVersion = async () => {
            try {
                const response = await fetch('/version.json', { cache: 'no-store' });
                if (response.ok) {
                    const data = await response.json();
                    console.log('Remote version:', data.version);
                    // The actual update triggering is handled by SW lifecycle (updatefound).
                    // We just ensure we ping the server so SW can see the new byte-identical content if any.
                    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                        const registration = await navigator.serviceWorker.ready;
                        registration.update();
                    }
                }
            } catch (e) {
                console.error("Error checking version", e);
            }
        };

        // Check version every hour
        const interval = setInterval(checkVersion, 60 * 60 * 1000);
        // Also check on mount
        checkVersion();

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <InstallPWAModal />
            {/* iOS Instructions can be handled here or in InstallPWAModal */}
        </>
    );
};

export default AppManager;
