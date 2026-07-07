import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Calendar, Video, ExternalLink } from 'lucide-react';
import { useCriarSessao, type CafSessionType, type CafSessionParticipante } from '@/hooks/useCafConnect';
import { gerarSalaExcalidraw } from '@/lib/excalidrawRoom';

interface CriarSessaoDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticketId: string;
  ticketProtocolo: string;
  currentUserId?: string | null;
  currentUserNome?: string | null;
}

const SESSION_TYPE_LABELS: Record<CafSessionType, string> = {
  suporte: 'Suporte',
  treinamento: 'Treinamento',
  demonstracao: 'Demonstração',
  outro: 'Outro',
};

export function CriarSessaoDialog({ open, onOpenChange, ticketId, ticketProtocolo, currentUserId, currentUserNome }: CriarSessaoDialogProps) {
  const [title, setTitle] = useState(`Sessão — Atendimento ${ticketProtocolo}`);
  const [description, setDescription] = useState('');
  const [sessionType, setSessionType] = useState<CafSessionType>('suporte');
  const [scheduledAt, setScheduledAt] = useState('');
  const [meetUrl, setMeetUrl] = useState('');
  const criarSessao = useCriarSessao();

  const reset = () => {
    setTitle(`Sessão — Atendimento ${ticketProtocolo}`);
    setDescription('');
    setSessionType('suporte');
    setScheduledAt('');
    setMeetUrl('');
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const abrirNovoMeet = () => {
    window.open('https://meet.new', '_blank');
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;

    // Abre a aba em branco AINDA dentro do gesto de clique do usuário (antes
    // do await da criação) e só depois redireciona pra URL da sala — assim o
    // navegador não tem motivo pra bloquear como pop-up. Se nem isso for
    // permitido, cai pro botão manual "Abrir Quadro" no painel.
    const janela = window.open('', '_blank');
    const { roomId, roomUrl } = gerarSalaExcalidraw();

    const participantes: CafSessionParticipante[] = currentUserNome
      ? [{ nome: currentUserNome, tipo: 'atendente' }]
      : [];

    criarSessao.mutate(
      {
        ticketId,
        title: title.trim(),
        description: description.trim() || undefined,
        sessionType,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        participantes,
        excalidrawRoomId: roomId,
        excalidrawRoomUrl: roomUrl,
        googleMeetUrl: meetUrl.trim() || undefined,
        createdBy: currentUserId,
      },
      {
        onSuccess: () => {
          if (janela) janela.location.href = roomUrl;
          else window.open(roomUrl, '_blank');
          handleClose();
        },
        onError: () => janela?.close(),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Video className="h-5 w-5 text-violet-600" />
            Criar Sessão
          </DialogTitle>
          <p className="text-sm text-slate-500">Atendimento {ticketProtocolo}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500" />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Sessão</Label>
              <Select value={sessionType} onValueChange={(v) => setSessionType(v as CafSessionType)}>
                <SelectTrigger className="bg-white border-slate-200 focus:ring-violet-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="O que vai ser explicado/demonstrado..."
                className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 min-h-[60px] resize-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Agendar para (opcional)
              </Label>
              <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500" />
              <p className="text-[11px] text-slate-400">Deixe em branco para iniciar agora.</p>
            </div>

            <div className="space-y-2">
              <Label>Link do Google Meet (opcional, pode definir depois)</Label>
              <div className="flex gap-2">
                <Input value={meetUrl} onChange={e => setMeetUrl(e.target.value)} placeholder="Cole o link gerado..." className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500" />
                <Button type="button" variant="outline" size="sm" onClick={abrirNovoMeet} className="gap-1.5 shrink-0 bg-white border-slate-200">
                  <ExternalLink className="h-3.5 w-3.5" /> meet.new
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={criarSessao.isPending} className="rounded-xl border-slate-200">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || criarSessao.isPending} className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-600/20">
            {criarSessao.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Criar Sessão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
