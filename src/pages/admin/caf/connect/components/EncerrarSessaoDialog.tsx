import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckSquare } from 'lucide-react';
import { useEncerrarSessao, type CafSession } from '@/hooks/useCafConnect';

interface EncerrarSessaoDialogProps {
  sessao: CafSession | null;
  ticketId: string;
  currentUserId?: string | null;
  onClose: () => void;
  onEncerrada: (sessionId: string) => void;
}

export function EncerrarSessaoDialog({ sessao, ticketId, currentUserId, onClose, onEncerrada }: EncerrarSessaoDialogProps) {
  const [summary, setSummary] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [recordingProvider, setRecordingProvider] = useState('manual');
  const [recordingDurationMin, setRecordingDurationMin] = useState('');
  const [recordingSizeMb, setRecordingSizeMb] = useState('');
  const encerrar = useEncerrarSessao();

  const reset = () => {
    setSummary('');
    setNextSteps('');
    setRecordingUrl('');
    setRecordingProvider('manual');
    setRecordingDurationMin('');
    setRecordingSizeMb('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!sessao || !summary.trim()) return;
    encerrar.mutate(
      {
        sessionId: sessao.id,
        ticketId,
        summary: summary.trim(),
        nextSteps: nextSteps.trim() || undefined,
        recordingUrl: recordingUrl.trim() || undefined,
        recordingProvider: recordingUrl.trim() ? recordingProvider : undefined,
        recordingDurationSeg: recordingDurationMin ? Number(recordingDurationMin) * 60 : undefined,
        recordingSizeBytes: recordingSizeMb ? Math.round(Number(recordingSizeMb) * 1024 * 1024) : undefined,
        startedAt: sessao.started_at,
        createdBy: currentUserId,
      },
      {
        onSuccess: () => {
          onEncerrada(sessao.id);
          handleClose();
        },
      },
    );
  };

  return (
    <Dialog open={!!sessao} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md bg-white border border-slate-200 shadow-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <CheckSquare className="h-5 w-5 text-emerald-600" />
            Finalizar Sessão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
            <div className="space-y-2">
              <Label>Resumo da Sessão <span className="text-red-500">*</span></Label>
              <Textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                placeholder="O que foi explicado/resolvido nessa sessão?"
                className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 min-h-[80px] resize-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Próximos Passos (opcional)</Label>
              <Textarea
                value={nextSteps}
                onChange={e => setNextSteps(e.target.value)}
                placeholder="Ex: franqueado vai testar e retornar até..."
                className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 min-h-[60px] resize-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Link da Gravação (opcional)</Label>
              <Input
                value={recordingUrl}
                onChange={e => setRecordingUrl(e.target.value)}
                placeholder="Cole o link do Drive/gravação..."
                className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500"
              />
            </div>

            {recordingUrl.trim() && (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label className="text-xs">Origem</Label>
                  <Select value={recordingProvider} onValueChange={setRecordingProvider}>
                    <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google_meet">Google Meet</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Duração (min)</Label>
                  <Input type="number" min="0" value={recordingDurationMin} onChange={e => setRecordingDurationMin(e.target.value)} className="h-9 text-xs bg-white border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Tamanho (MB)</Label>
                  <Input type="number" min="0" value={recordingSizeMb} onChange={e => setRecordingSizeMb(e.target.value)} className="h-9 text-xs bg-white border-slate-200" />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={encerrar.isPending} className="rounded-xl border-slate-200">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!summary.trim() || encerrar.isPending} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20">
            {encerrar.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Finalizar Sessão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
