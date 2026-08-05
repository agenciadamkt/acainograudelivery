import { useCallback, useState } from 'react';
import {
  STORAGE, MAX_FAVORITES, MAX_RECENT,
  readArray, writeArray,
  moveInArray, toggleInArray,
} from './prefsStorage';

export interface SidebarPrefs {
  openSections: string[];
  favorites: string[];
  recent: string[];
  toggleSection: (id: string) => void;
  toggleFavorite: (url: string) => void;
  moveFavorite: (from: number, to: number) => void;
  pushRecent: (url: string) => void;
}

/**
 * Único ponto do app que escreve preferências da sidebar em LocalStorage.
 * Nenhum componente deve chamar localStorage diretamente.
 *
 * O estado expandido/recolhido NÃO mora aqui: quem manda nele é o
 * `SidebarProvider` do shadcn (é ele que também decide o Sheet no mobile).
 * O AdminLayout usa `readBool`/`writeBool` para semear e persistir esse
 * estado — ter duas fontes de verdade para "recolhida" daria dessincronia.
 */
export function useSidebarPrefs(): SidebarPrefs {
  const [openSections, setOpenSections] = useState(() => {
    const saved = readArray(STORAGE.open);
    return saved.length > 0 ? saved : ['operacao', 'cardapio'];
  });
  const [favorites, setFavorites] = useState(() => readArray(STORAGE.favorites));
  const [recent, setRecent] = useState(() => readArray(STORAGE.recent));

  const toggleSection = useCallback((id: string) => {
    setOpenSections(prev => {
      const next = toggleInArray(prev, id);
      writeArray(STORAGE.open, next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((url: string) => {
    setFavorites(prev => {
      const next = toggleInArray(prev, url, MAX_FAVORITES);
      writeArray(STORAGE.favorites, next);
      return next;
    });
  }, []);

  const moveFavorite = useCallback((from: number, to: number) => {
    setFavorites(prev => {
      const next = moveInArray(prev, from, to);
      writeArray(STORAGE.favorites, next);
      return next;
    });
  }, []);

  const pushRecent = useCallback((url: string) => {
    setRecent(prev => {
      if (prev[0] === url) return prev;
      const next = [url, ...prev.filter(u => u !== url)].slice(0, MAX_RECENT);
      writeArray(STORAGE.recent, next);
      return next;
    });
  }, []);

  return {
    openSections, favorites, recent,
    toggleSection, toggleFavorite, moveFavorite, pushRecent,
  };
}
