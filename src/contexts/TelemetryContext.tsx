import React, { createContext, useContext } from 'react';

// Tipagem estrita de eventos do Workspace
export type WorkspaceEvent =
  | 'TabOpened'
  | 'TabClosed'
  | 'TabPinned'
  | 'TabUnpinned'
  | 'TabMoved'
  | 'TabRestored'
  | 'TabLRUEvicted'
  | 'DirtyStateTriggered'
  | 'TabDuplicated'
  | 'CommandLauncherOpened'
  | 'CommandLauncherSelected';

export interface TelemetryContextType {
  track: (event: WorkspaceEvent, payload?: Record<string, any>) => void;
}

const TelemetryContext = createContext<TelemetryContextType>({
  track: (event, payload) => {
    console.log(`[TELEMETRIA-FALLBACK] ${event}:`, payload);
  }
});

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const track = (event: WorkspaceEvent, payload?: Record<string, any>) => {
    // Adapter simples que loga no console em desenvolvimento.
    // Pronto para plugar Analytics externo (ex: PostHog, Mixpanel, OpenTelemetry)
    console.log(`%c[TELEMETRIA] ${event}`, 'color: #8b5cf6; font-weight: bold;', {
      timestamp: new Date().toISOString(),
      ...payload
    });
  };

  return (
    <TelemetryContext.Provider value={{ track }}>
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = () => useContext(TelemetryContext);
