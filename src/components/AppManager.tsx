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
        if (needRefresh && !updateToastId) {
            const id = toast("Nova versão disponível!", {
                description: "Atualize para ter as últimas novidades.",
                action: {
                    label: 'Atualizar',
                    onClick: async () => {
                        toast.dismiss(id);
                        try {
                            await updateServiceWorker(true);
                        } catch (e) {
                            console.error("Update error:", e);
                        }
                        // Force reload to ensure new SW takes over
                        window.location.reload();
                    }
                },
                duration: Infinity, // Keep open until clicked
                onDismiss: () => setUpdateToastId(null), // Allows finding it again if dismissed without updating
                icon: <RefreshCw className="w-5 h-5 animate-spin" />,
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
