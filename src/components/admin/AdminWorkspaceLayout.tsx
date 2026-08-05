import React, { useState, useEffect } from 'react';
import { useOutlet, useLocation } from 'react-router-dom';
import { useWorkspaceTabs } from '@/contexts/WorkspaceTabsContext';
import { AdminLayout } from './AdminLayout';

export function AdminWorkspaceLayout() {
  const outlet = useOutlet();
  const location = useLocation();
  const { pathname } = location;
  const { mountedTabs } = useWorkspaceTabs();

  // Dicionário de componentes cacheados em memória: { path -> ReactNode }
  const [cachedTabs, setCachedTabs] = useState<Record<string, React.ReactNode>>({});

  // 1. Adiciona a tela ativa atual ao cache
  useEffect(() => {
    if (outlet) {
      setCachedTabs(prev => {
        // Se já está no cache, não gera nova referência para preservar estado do DOM
        if (prev[pathname]) return prev;
        return {
          ...prev,
          [pathname]: outlet
        };
      });
    }
  }, [pathname, outlet]);

  // 2. Limpeza (LRU Eviction): Desmonta páginas que foram expulsas do cache LRU
  useEffect(() => {
    setCachedTabs(prev => {
      let changed = false;
      const next = { ...prev };
      for (const path in next) {
        if (!mountedTabs.includes(path)) {
          delete next[path];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [mountedTabs]);

  return (
    <AdminLayout>
      <div className="w-full h-full relative">
        {Object.entries(cachedTabs).map(([path, element]) => {
          const isActive = path === pathname;
          return (
            <div
              key={path}
              style={{ display: isActive ? 'block' : 'none' }}
              className="w-full h-full"
            >
              {element}
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
}

export default AdminWorkspaceLayout;
