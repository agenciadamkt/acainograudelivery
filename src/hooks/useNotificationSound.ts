import { useEffect, useState } from 'react';

// Singleton para controlar o som globalmente
let globalAudioRef: HTMLAudioElement | null = null;
let globalBeepInterval: number | null = null;
let globalIsPlaying = false;
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach(fn => fn());
};

const playBeep = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  gainNode.gain.value = 0.3;
  
  oscillator.start();
  setTimeout(() => oscillator.stop(), 300);
};

const playBeepLoop = () => {
  if (globalBeepInterval) return;
  
  playBeep();
  globalBeepInterval = window.setInterval(playBeep, 1000);
  globalIsPlaying = true;
  notifyListeners();
  console.log('🔊 Beep contínuo iniciado (global)');
};

export function useNotificationSound() {
  const [isPlayingSound, setIsPlayingSound] = useState(globalIsPlaying);

  useEffect(() => {
    const listener = () => setIsPlayingSound(globalIsPlaying);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const playSound = () => {
    if (globalIsPlaying) return;
    
    if (!globalAudioRef) {
      globalAudioRef = new Audio('/sounds/new-order.mp3');
      globalAudioRef.loop = true;
    }
    
    globalAudioRef.play()
      .then(() => {
        globalIsPlaying = true;
        notifyListeners();
        console.log('🔊 Som de notificação iniciado (global)');
      })
      .catch((error) => {
        console.warn('⚠️ Não foi possível tocar o som:', error);
        playBeepLoop();
      });
  };

  const stopSound = () => {
    // Parar MP3
    if (globalAudioRef) {
      globalAudioRef.pause();
      globalAudioRef.currentTime = 0;
    }
    
    // Parar beep loop
    if (globalBeepInterval) {
      clearInterval(globalBeepInterval);
      globalBeepInterval = null;
    }
    
    globalIsPlaying = false;
    notifyListeners();
    console.log('🔇 Som parado (global)');
  };

  return { isPlayingSound, playSound, stopSound };
}
