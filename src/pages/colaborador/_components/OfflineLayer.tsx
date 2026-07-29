/**
 * CheckGrau App — camada global de offline (montada em toda a área /colaborador):
 * banner de status + motor de sincronização da fila ao reconectar.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WifiOff, RefreshCw, CloudUpload } from 'lucide-react';
import { toast } from 'sonner';
import { useOnline } from '@/hooks/useOnline';
import { flushQueue, queueCount } from '@/lib/offline/completionQueue';

export function OfflineLayer() {
  const online = useOnline();
  const qc = useQueryClient();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const flushing = useRef(false);

  const refreshCount = useCallback(async () => {
    try { setPending(await queueCount()); } catch { /* ignore */ }
  }, []);

  const sync = useCallback(async () => {
    if (flushing.current || !navigator.onLine) return;
    flushing.current = true;
    setSyncing(true);
    try {
      const n = await flushQueue();
      if (n > 0) {
        toast.success(`${n} resposta(s) sincronizada(s).`);
        qc.invalidateQueries();
      }
    } finally {
      flushing.current = false;
      setSyncing(false);
      await refreshCount();
    }
  }, [qc, refreshCount]);

  // conta pendências ao montar e sincroniza quando (re)conecta
  useEffect(() => { refreshCount(); }, [refreshCount]);
  useEffect(() => { if (online) sync(); }, [online, sync]);
  // reconta periodicamente (novas conclusões offline entram na fila)
  useEffect(() => {
    const t = setInterval(refreshCount, 4000);
    return () => clearInterval(t);
  }, [refreshCount]);

  if (online && pending === 0 && !syncing) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[70] px-3 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto mt-2 max-w-md">
        {!online ? (
          <div className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm text-white shadow-lg">
            <WifiOff className="h-4 w-4 shrink-0" />
            <div className="leading-tight">
              <p className="font-semibold">Você está offline</p>
              <p className="text-[11px] opacity-90">Você pode continuar — as respostas são enviadas ao reconectar{pending > 0 ? ` (${pending} na fila)` : ''}.</p>
            </div>
          </div>
        ) : (
          <button onClick={sync} className="flex w-full items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm text-white shadow-lg">
            {syncing ? <RefreshCw className="h-4 w-4 shrink-0 animate-spin" /> : <CloudUpload className="h-4 w-4 shrink-0" />}
            <span className="font-semibold">{syncing ? 'Sincronizando…' : `Enviar ${pending} resposta(s) pendente(s)`}</span>
          </button>
        )}
      </div>
    </div>
  );
}
