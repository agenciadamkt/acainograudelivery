/**
 * CheckGrau App — alerta global de nova mensagem do gestor. Quando há mensagem
 * não lida (e não reconhecida), toca um som repetido e mostra um modal
 * bloqueante que só sai quando o colaborador clica em "OK, ler".
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCollaborator } from '@/contexts/CollaboratorContext';
import { useCollaboratorMessages } from '@/hooks/checkgrau/useMessages';
import { playAlertBeep } from '@/lib/sound';

const ACK_KEY = 'cg_msg_ack';
const readAck = (): string[] => { try { return JSON.parse(localStorage.getItem(ACK_KEY) || '[]'); } catch { return []; } };
const writeAck = (ids: string[]) => localStorage.setItem(ACK_KEY, JSON.stringify(ids.slice(-200)));

export function MessageAlert() {
  const navigate = useNavigate();
  const location = useLocation();
  const { collaborator, selectedStore, stores } = useCollaborator();
  const store = selectedStore ?? stores[0] ?? null;
  const { data } = useCollaboratorMessages(collaborator?.id, store?.id);

  const [ack, setAck] = useState<Set<string>>(() => new Set(readAck()));
  const loopRef = useRef<number | null>(null);

  const onMessagesRoute = location.pathname === '/colaborador/mensagens';
  const pending = (data ?? []).filter((m) => !m.read && !ack.has(m.id));
  const current = !onMessagesRoute ? pending[0] ?? null : null;

  // som repetido enquanto o modal estiver aberto
  useEffect(() => {
    const stop = () => { if (loopRef.current != null) { clearInterval(loopRef.current); loopRef.current = null; } };
    if (current) {
      playAlertBeep();
      loopRef.current = window.setInterval(playAlertBeep, 1800);
    } else {
      stop();
    }
    return stop;
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null;

  const confirm = () => {
    const ids = [...readAck(), current.id];
    writeAck(ids);
    setAck(new Set(ids));
    navigate('/colaborador/mensagens');
  };

  return (
    <Dialog open onOpenChange={() => { /* bloqueante: só fecha no OK */ }}>
      <DialogContent
        className="max-w-xs [&>button]:hidden"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-[#7C3AED] dark:bg-purple-500/15">
            <MessageSquare className="h-7 w-7" />
          </div>
          <DialogTitle className="text-lg">Nova mensagem do gestor</DialogTitle>
        </DialogHeader>
        <div className="text-center">
          <p className="font-semibold text-gray-900 dark:text-white">{current.title || 'Aviso'}</p>
          <p className="mt-1 line-clamp-3 text-sm text-gray-500 dark:text-white/60">{current.body}</p>
        </div>
        <DialogFooter>
          <Button className="w-full bg-[#7C3AED] hover:bg-[#6D28D9]" onClick={confirm}>OK, ler</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
