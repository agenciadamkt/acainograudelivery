import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTelemetry } from './TelemetryContext';
import { getTabMetadata, isRoutePinnedByDefault } from '@/utils/workspaceRegistry';
import { toast } from 'sonner';

export interface WorkspaceTabsContextType {
  tabs: string[];
  activeTab: string;
  pinnedTabs: string[];
  mountedTabs: string[];
  dirtyTabs: Record<string, boolean>;
  isCommandLauncherOpen: boolean;
  setCommandLauncherOpen: (open: boolean) => void;
  openTab: (path: string) => void;
  closeTab: (path: string) => void;
  closeOthers: (path: string) => void;
  closeRight: (path: string) => void;
  pinTab: (path: string) => void;
  unpinTab: (path: string) => void;
  duplicateTab: (path: string) => void;
  setActiveTab: (path: string) => void;
  setTabs: (tabs: string[]) => void;
  setTabDirty: (path: string, isDirty: boolean) => void;
}

const WorkspaceTabsContext = createContext<WorkspaceTabsContextType | undefined>(undefined);

// Chaves de Armazenamento
const STORAGE_KEY_TABS = 'grauos_workspace_tabs';
const STORAGE_KEY_ACTIVE = 'grauos_workspace_active_tab';
const STORAGE_KEY_PINNED = 'grauos_workspace_pinned_tabs';

export const WorkspaceTabsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { track } = useTelemetry();
  const location = useLocation();
  const navigate = useNavigate();

  // ────────────────────────────────────────────────────────────────────────
  // 1. Estado Básico e Persistência (useWorkspacePersistence)
  // ────────────────────────────────────────────────────────────────────────
  
  const [tabs, setTabsState] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_TABS);
      return stored ? JSON.parse(stored) : ['/admin/dashboard'];
    } catch {
      return ['/admin/dashboard'];
    }
  });

  const [activeTab, setActiveTabState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_ACTIVE) || '/admin/dashboard';
    } catch {
      return '/admin/dashboard';
    }
  });

  const [pinnedTabs, setPinnedTabsState] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PINNED);
      return stored ? JSON.parse(stored) : ['/admin/dashboard'];
    } catch {
      return ['/admin/dashboard'];
    }
  });

  const [isCommandLauncherOpen, setCommandLauncherOpen] = useState(false);

  // Persistir alterações
  const setTabs = (newTabs: string[]) => {
    setTabsState(newTabs);
    try {
      localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(newTabs));
    } catch {}
  };

  const setActiveTab = (path: string) => {
    setActiveTabState(path);
    try {
      localStorage.setItem(STORAGE_KEY_ACTIVE, path);
    } catch {}
  };

  const setPinnedTabs = (newPinned: string[]) => {
    setPinnedTabsState(newPinned);
    try {
      localStorage.setItem(STORAGE_KEY_PINNED, JSON.stringify(newPinned));
    } catch {}
  };

  // ────────────────────────────────────────────────────────────────────────
  // 2. Fila LRU de Componentes Montados (useWorkspaceLRU)
  // ────────────────────────────────────────────────────────────────────────
  
  const [lruQueue, setLruQueue] = useState<string[]>(() => [activeTab]);

  // Atualiza a fila de uso recente sempre que a aba ativa mudar
  useEffect(() => {
    if (activeTab) {
      setLruQueue(prev => {
        const next = prev.filter(p => p !== activeTab);
        next.push(activeTab);
        return next;
      });
    }
  }, [activeTab]);

  // Calcula quais abas devem permanecer montadas em memória (Max 5, priorizando fixadas e ativa)
  const mountedTabs = useMemo(() => {
    const mounted = new Set<string>();

    // 1. Pinned tabs sempre montados (se abertos)
    pinnedTabs.forEach(p => {
      if (tabs.includes(p)) mounted.add(p);
    });

    // 2. Aba ativa sempre montada
    if (activeTab) mounted.add(activeTab);

    // 3. Preenche as vagas restantes com as abas mais recentes do LRU
    const reversedLru = [...lruQueue].reverse();
    for (const path of reversedLru) {
      if (mounted.size >= 5) break;
      if (tabs.includes(path)) {
        mounted.add(path);
      }
    }

    // 4. Fallback caso as filas de LRU estejam vazias ou dessincronizadas
    for (const path of tabs) {
      if (mounted.size >= 5) break;
      mounted.add(path);
    }

    return Array.from(mounted);
  }, [tabs, activeTab, pinnedTabs, lruQueue]);

  // Telemetria de Despejo LRU
  const prevMountedRef = useRef<string[]>([]);
  useEffect(() => {
    const prevMounted = prevMountedRef.current;
    prevMounted.forEach(path => {
      if (tabs.includes(path) && !mountedTabs.includes(path)) {
        track('TabLRUEvicted', { path });
      }
    });
    prevMountedRef.current = mountedTabs;
  }, [mountedTabs, tabs, track]);

  // ────────────────────────────────────────────────────────────────────────
  // 3. Controle de Alterações Pendentes (useWorkspaceDirty)
  // ────────────────────────────────────────────────────────────────────────
  
  const [dirtyTabs, setDirtyTabs] = useState<Record<string, boolean>>({});

  const setTabDirty = (path: string, isDirty: boolean) => {
    setDirtyTabs(prev => {
      if (prev[path] === isDirty) return prev;
      if (isDirty) {
        track('DirtyStateTriggered', { path });
      }
      return { ...prev, [path]: isDirty };
    });
  };

  const confirmClose = (path: string): boolean => {
    if (dirtyTabs[path]) {
      const confirm = window.confirm(
        `Deseja fechar esta aba? As alterações pendentes no módulo serão perdidas.`
      );
      if (confirm) {
        // Limpa o estado dirty
        setTabDirty(path, false);
      }
      return confirm;
    }
    return true;
  };

  // ────────────────────────────────────────────────────────────────────────
  // 4. Operações Básicas de Abas (useWorkspaceTabsState)
  // ────────────────────────────────────────────────────────────────────────
  
  const openTab = (path: string) => {
    if (tabs.includes(path)) {
      setActiveTab(path);
      navigate(path);
      return;
    }

    // Checar limite de 8 abas
    if (tabs.length >= 8) {
      toast.error('Limite de 8 telas abertas.', {
        description: 'Feche uma para abrir outra.',
        position: 'top-center'
      });
      // Mantém na aba ativa atual
      navigate(activeTab, { replace: true });
      return;
    }

    const newTabs = [...tabs, path];
    setTabs(newTabs);
    setActiveTab(path);
    track('TabOpened', { path });
    navigate(path);
  };

  const closeTab = (path: string) => {
    // Dashboard sempre fixado e não fecha se for a última aba ativa
    if (tabs.length === 1) return;
    if (pinnedTabs.includes(path) && path === '/admin/dashboard' && tabs.includes('/admin/dashboard')) {
      // Se tentar fechar o dashboard e for a última, impede
      return;
    }

    if (!confirmClose(path)) return;

    const index = tabs.indexOf(path);
    if (index === -1) return;

    const newTabs = tabs.filter(t => t !== path);
    setTabs(newTabs);
    
    // Remove do pinned se estivesse lá
    if (pinnedTabs.includes(path)) {
      setPinnedTabs(pinnedTabs.filter(p => p !== path));
    }

    track('TabClosed', { path });

    // Se a aba fechada era a ativa, ativa a anterior
    if (activeTab === path) {
      const newActiveIndex = Math.max(0, index - 1);
      const newActive = newTabs[newActiveIndex];
      setActiveTab(newActive);
      navigate(newActive);
    }
  };

  const closeOthers = (path: string) => {
    // Fecha todas exceto as fixadas e a clicada
    const toClose = tabs.filter(t => t !== path && !pinnedTabs.includes(t));
    const dirtyToClose = toClose.filter(t => dirtyTabs[t]);
    
    if (dirtyToClose.length > 0) {
      const confirm = window.confirm("Existem abas com alterações não salvas. Deseja fechar mesmo assim?");
      if (!confirm) return;
    }

    const newTabs = tabs.filter(t => t === path || pinnedTabs.includes(t));
    setTabs(newTabs);
    
    // Se a ativa foi fechada, ativa a selecionada
    if (!newTabs.includes(activeTab)) {
      setActiveTab(path);
      navigate(path);
    }

    track('TabClosed', { scope: 'others', retained: path });
  };

  const closeRight = (path: string) => {
    const index = tabs.indexOf(path);
    if (index === -1) return;

    const rightTabs = tabs.slice(index + 1);
    const toClose = rightTabs.filter(t => !pinnedTabs.includes(t));
    const dirtyToClose = toClose.filter(t => dirtyTabs[t]);

    if (dirtyToClose.length > 0) {
      const confirm = window.confirm("Existem abas à direita com alterações não salvas. Deseja fechar?");
      if (!confirm) return;
    }

    const newTabs = tabs.filter((t, idx) => idx <= index || pinnedTabs.includes(t));
    setTabs(newTabs);

    if (!newTabs.includes(activeTab)) {
      setActiveTab(path);
      navigate(path);
    }

    track('TabClosed', { scope: 'right', base: path });
  };

  const pinTab = (path: string) => {
    if (pinnedTabs.includes(path)) return;
    const newPinned = [...pinnedTabs, path];
    setPinnedTabs(newPinned);

    // Mover aba fixada para a esquerda
    const nonPinnedTabs = tabs.filter(t => !newPinned.includes(t));
    const orderedTabs = [...newPinned.filter(p => tabs.includes(p)), ...nonPinnedTabs];
    setTabs(orderedTabs);

    track('TabPinned', { path });
  };

  const unpinTab = (path: string) => {
    if (path === '/admin/dashboard') return; // Dashboard não desfixa
    if (!pinnedTabs.includes(path)) return;
    const newPinned = pinnedTabs.filter(p => p !== path);
    setPinnedTabs(newPinned);
    track('TabUnpinned', { path });
  };

  const duplicateTab = (path: string) => {
    const meta = getTabMetadata(path);
    if (!meta.capabilities.supportsDuplicate) {
      toast.warning('Este módulo não suporta duplicação de abas.');
      return;
    }

    // Como não permitimos rotas duplicadas de mesmo path no workspace simplificado,
    // apenas notificamos ou ativamos. (Futuro: suporte a caminhos com chaves randômicas)
    track('TabDuplicated', { path });
    toast.info('Modo de duplicação: Aba ativa já está aberta.');
  };

  // Sincronizar com mudanças de URL do navegador (sidebar, cliques, back/forward)
  useEffect(() => {
    const path = location.pathname;
    // Ignora rotas públicas ou fora do workspace admin
    const isWorkspaceRoute =
      path.startsWith('/admin/') &&
      !['/admin/hub', '/admin/login', '/admin/signup', '/admin/reset-password', '/admin/update-password', '/admin/hub-preview'].includes(path);

    if (isWorkspaceRoute) {
      if (tabs.includes(path)) {
        if (activeTab !== path) {
          setActiveTab(path);
          track('TabRestored', { path });
        }
      } else {
        // Tenta abrir a aba (checando limites)
        openTab(path);
      }
    }
  }, [location.pathname]);

  // ────────────────────────────────────────────────────────────────────────
  // 5. Atalhos de Teclado (useWorkspaceShortcuts)
  // ────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!location.pathname.startsWith('/admin/')) return;

      // Ctrl + Tab: próxima aba
      if (e.ctrlKey && !e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        const idx = tabs.indexOf(activeTab);
        if (idx !== -1) {
          const nextIdx = (idx + 1) % tabs.length;
          navigate(tabs[nextIdx]);
        }
      }
      
      // Ctrl + Shift + Tab: aba anterior
      if (e.ctrlKey && e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        const idx = tabs.indexOf(activeTab);
        if (idx !== -1) {
          const prevIdx = (idx - 1 + tabs.length) % tabs.length;
          navigate(tabs[prevIdx]);
        }
      }

      // Ctrl + W ou Alt + W: fechar aba ativa
      if ((e.ctrlKey && e.key === 'w') || (e.altKey && e.key.toLowerCase() === 'w')) {
        e.preventDefault();
        closeTab(activeTab);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTab, location.pathname]);

  return (
    <WorkspaceTabsContext.Provider
      value={{
        tabs,
        activeTab,
        pinnedTabs,
        mountedTabs,
        dirtyTabs,
        isCommandLauncherOpen,
        setCommandLauncherOpen,
        openTab,
        closeTab,
        closeOthers,
        closeRight,
        pinTab,
        unpinTab,
        duplicateTab,
        setActiveTab,
        setTabs,
        setTabDirty
      }}
    >
      {children}
    </WorkspaceTabsContext.Provider>
  );
};

export const useWorkspaceTabs = () => {
  const context = useContext(WorkspaceTabsContext);
  if (!context) {
    throw new Error('useWorkspaceTabs deve ser usado dentro de um WorkspaceTabsProvider');
  }
  return context;
};
