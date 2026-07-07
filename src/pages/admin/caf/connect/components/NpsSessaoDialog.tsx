import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Loader2, Star } from 'lucide-react';
import { useNpsSessao } from '@/hooks/useCafConnect';

interface NpsSessaoDialogProps {
  sessionId: string | null;
  onClose: () => void;
}

export function NpsSessaoDialog({ sessionId, onClose }: NpsSessaoDialogProps) {
  const [nota, setNota] = useState<number | null>(null);
  const [resolvido, setResolvido] = useState<boolean | null>(null);
  const [comentario, setComentario] = useState('');
  const nps = useNpsSessao();

  const handleClose = () => {
    setNota(null);
    setResolvido(null);
    setComentario('');
    onClose();
  };

  const handleSubmit = () => {
    if (!sessionId || nota === null || resolvido === null) return;
    nps.mutate(
      { sessionId, nota, problemaResolvido: resolvido, comentario: comentario.trim() || undefined },
      { onSuccess: handleClose },
    );
  };

  return (
    <Dialog open={!!sessionId} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm bg-white border border-slate-200 shadow-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Star className="h-5 w-5 text-amber-500" />
            Avalie a Sessão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
            <div className="space-y-2">
              <Label>De 0 a 10, qual a chance de você recomendar esse atendimento?</Label>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: 11 }, (_, i) => i).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setNota(n)}
                    className={cn(
                      'h-8 w-8 rounded-lg text-xs font-bold border transition-colors',
                      nota === n ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-slate-200 hover:bg-slate-100',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>O problema foi resolvido?</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn('flex-1 border-slate-200', resolvido === true ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700' : 'bg-white')}
                  onClick={() => setResolvido(true)}
                >
                  Sim
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn('flex-1 border-slate-200', resolvido === false ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700' : 'bg-white')}
                  onClick={() => setResolvido(false)}
                >
                  Não
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Comentário (opcional)</Label>
              <Textarea
                value={comentario}
                onChange={e => setComentario(e.target.value)}
                placeholder="Conte como foi a experiência..."
                className="bg-white border-slate-200 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 min-h-[72px] resize-none text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={nps.isPending} className="rounded-xl border-slate-200">
            Pular
          </Button>
          <Button onClick={handleSubmit} disabled={nota === null || resolvido === null || nps.isPending} className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-md shadow-violet-600/20">
            {nps.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enviar Avaliação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
