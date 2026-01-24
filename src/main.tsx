import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Registrar Service Worker customizado
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('[Main] 🔍 Iniciando registro do Service Worker...');
    
    // Desregistrar qualquer SW antigo primeiro
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      console.log('[Main] 📋 Service Workers encontrados:', registrations.length);
      
      // Registrar o novo SW
      navigator.serviceWorker
        .register('/sw-custom.js', { scope: '/' })
        .then((registration) => {
          console.log('[Main] ✅ Service Worker registrado com sucesso');
          console.log('[Main] 📍 Scope:', registration.scope);
          console.log('[Main] 📍 Active:', registration.active);
          console.log('[Main] 📍 Installing:', registration.installing);
          console.log('[Main] 📍 Waiting:', registration.waiting);
          
          // Forçar atualização se houver SW esperando
          if (registration.waiting) {
            console.log('[Main] 🔄 Forçando ativação do novo SW...');
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          
          // Listener para mudanças de estado
          registration.addEventListener('updatefound', () => {
            console.log('[Main] 🆕 Atualização do SW encontrada');
          });
        })
        .catch((error) => {
          console.error('[Main] ❌ Erro ao registrar Service Worker:', error);
        });
    });
  });
  
  // Listener para quando um novo SW assume o controle
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[Main] 🔄 Novo Service Worker assumiu o controle');
  });
}
