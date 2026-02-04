// ========================================
// SCRIPT DE LIMPEZA TOTAL DO PWA
// Execute este script no Console do navegador
// ========================================

(async function clearAllPWAData() {
    console.log('🧹 Iniciando limpeza total do PWA...');

    try {
        // 1. Limpar todos os caches
        const cacheNames = await caches.keys();
        console.log('📦 Caches encontrados:', cacheNames);

        for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            console.log('✅ Cache deletado:', cacheName);
        }

        // 2. Desregistrar todos os Service Workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log('🔧 Service Workers encontrados:', registrations.length);

        for (const registration of registrations) {
            await registration.unregister();
            console.log('✅ Service Worker desregistrado');
        }

        // 3. Limpar localStorage
        localStorage.clear();
        console.log('✅ localStorage limpo');

        // 4. Limpar sessionStorage
        sessionStorage.clear();
        console.log('✅ sessionStorage limpo');

        // 5. Limpar IndexedDB (se houver)
        if (window.indexedDB) {
            const databases = await indexedDB.databases();
            for (const db of databases) {
                if (db.name) {
                    indexedDB.deleteDatabase(db.name);
                    console.log('✅ IndexedDB deletado:', db.name);
                }
            }
        }

        console.log('✅ Limpeza completa! Recarregando página...');

        // 6. Forçar reload completo (hard reload)
        setTimeout(() => {
            window.location.reload(true);
        }, 1000);

    } catch (error) {
        console.error('❌ Erro na limpeza:', error);
    }
})();
