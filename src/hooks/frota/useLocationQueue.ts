import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PendingLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

const STORAGE_KEY_PREFIX = 'frota_location_queue_v1_';

function loadPending(motoristaId: string): PendingLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + motoristaId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function savePending(motoristaId: string, loc: PendingLocation | null) {
  try {
    if (loc) localStorage.setItem(STORAGE_KEY_PREFIX + motoristaId, JSON.stringify(loc));
    else localStorage.removeItem(STORAGE_KEY_PREFIX + motoristaId);
  } catch {
    // localStorage indisponível — segue sem persistência entre reloads
  }
}

// Resiliência a queda breve de rede: se a escrita de localização em
// fleet_drivers.current_location falhar, guarda aqui (memória + localStorage,
// sobrevive a reload) e tenta de novo quando a conexão voltar — em vez de
// perder o ponto em silêncio. Só guarda o ponto mais recente (não é
// histórico, é "o que ainda não conseguiu mandar").
export function useLocationQueue(motoristaId: string | null) {
  const [pendingCount, setPendingCount] = useState(0);
  const pendingRef = useRef<PendingLocation | null>(null);

  useEffect(() => {
    if (!motoristaId) return;
    const stored = loadPending(motoristaId);
    pendingRef.current = stored;
    setPendingCount(stored ? 1 : 0);
  }, [motoristaId]);

  const flush = useCallback(async () => {
    if (!motoristaId || !pendingRef.current) return;
    const loc = pendingRef.current;
    const { error } = await supabase
      .from('fleet_drivers' as any)
      .update({
        current_location: { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy, timestamp: loc.timestamp },
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', motoristaId);
    if (!error) {
      pendingRef.current = null;
      savePending(motoristaId, null);
      setPendingCount(0);
    }
  }, [motoristaId]);

  useEffect(() => {
    if (!motoristaId) return;
    const handleOnline = () => flush();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [motoristaId, flush]);

  const enqueue = useCallback((loc: PendingLocation) => {
    if (!motoristaId) return;
    pendingRef.current = loc;
    savePending(motoristaId, loc);
    setPendingCount(1);
  }, [motoristaId]);

  return { pendingCount, enqueue, flush };
}
