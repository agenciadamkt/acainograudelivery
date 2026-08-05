import React from 'react';

// Estados visuais padronizados das abas
export type TabStatus = 'Idle' | 'Loading' | 'Dirty' | 'Syncing' | 'Error' | 'Locked';

// Capacidades do módulo para controle fino de comportamento
export interface WorkspaceCapabilities {
  supportsDuplicate?: boolean;
  supportsSplitView?: boolean;
  supportsBackgroundRefresh?: boolean;
  supportsExport?: boolean;
}

// Registro estruturado das abas do Workspace
export interface WorkspaceTabConfig {
  path: string;
  title: string;
  icon: React.ComponentType<any>;
  color: string; // Cor CSS/Tailwind (ex: "emerald-600", "indigo-600", "orange-500", etc.)
  capabilities: WorkspaceCapabilities;
  badgeHook?: () => number; // Ganho dinâmico para obter contagem (opcional)
}

// Conceito de Plugin para extensão futura de módulos
export interface WorkspacePlugin {
  id: string;
  name: string;
  register?: (registry: any) => void;
}
