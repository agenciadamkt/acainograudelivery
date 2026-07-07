import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RotaDoDia, useExcluirRotas } from '@/hooks/useRotaDoDia';

interface Props {
  rotas: RotaDoDia[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente',
  em_progresso: 'Em Rota',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export function ExcluirRotasDialog({ rotas, open, onOpenChange }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const excluir = useExcluirRotas();

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleClose = () => {
    setSelected([]);
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (selected.length === 0) return;
    excluir.mutate(selected, { onSuccess: handleClose });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Excluir Rotas
          </DialogTitle>
        </DialogHeader>

        {rotas.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma rota neste dia.
          </p>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-2 py-2">
            {rotas.map(r => {
              const checked = selected.includes(r.routeId);
              return (
                <label
                  key={r.routeId}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none ${
                    checked ? 'border-destructive bg-destructive/5' : 'hover:bg-muted/40'
                  }`}
                >
                  <Checkbox checked={checked} onCheckedChange={() => toggle(r.routeId)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{r.routeName}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {r.driver?.name ?? 'Sem motorista'} · {r.orders.length} pedido(s)
                      {r.startedAt && ` · saiu ${format(new Date(r.startedAt), 'HH:mm', { locale: ptBR })}`}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={excluir.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selected.length === 0 || excluir.isPending}
            variant="destructive"
          >
            {excluir.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Excluir {selected.length > 0 ? `(${selected.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
