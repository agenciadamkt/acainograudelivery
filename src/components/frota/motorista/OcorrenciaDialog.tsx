import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  UserX, MapPinOff, Wrench, PackageX, MessageSquare, MoreHorizontal, Loader2, AlertTriangle, X,
} from 'lucide-react';
import { useCriarEvento, type FleetEventTipo } from '@/hooks/frota/useRouteEvents';

interface OcorrenciaDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  routeId: string;
  driverId: string;
  orderId?: string | null;
  orderType?: 'order' | 'manual' | 'franchisee' | null;
}

const TIPOS: { value: FleetEventTipo; label: string; icon: any }[] = [
  { value: 'cliente_ausente', label: 'Cliente ausente', icon: UserX },
  { value: 'endereco_incorreto', label: 'Endereço incorreto', icon: MapPinOff },
  { value: 'veiculo_problema', label: 'Veículo com problema', icon: Wrench },
  { value: 'pedido_recusado', label: 'Pedido recusado', icon: PackageX },
  { value: 'observacao', label: 'Observação', icon: MessageSquare },
  { value: 'outro', label: 'Outro', icon: MoreHorizontal },
];

// Modal nativo customizado (não usa o <Dialog> compartilhado) — referência
// 002.png: fundo com blur, cards grandes em grid 2 colunas com boa área de
// toque, seleção destacada inline (sem substituir a grade), Cancelar com
// largura total. Self-contained pra não alterar o overlay do Dialog
// compartilhado (usado em todo o resto do admin).
//
// REGRA: este modal NUNCA deve renderizar mapa (RotaPreviewMap ou
// equivalente). Registro de ocorrência é só texto/categoria — qualquer
// preview de mapa aqui é, por definição, um bug de layout.
export function OcorrenciaDialog({ open, onOpenChange, routeId, driverId, orderId, orderType }: OcorrenciaDialogProps) {
  const [tipo, setTipo] = useState<FleetEventTipo | null>(null);
  const [observacao, setObservacao] = useState('');
  const criarEvento = useCriarEvento();

  if (!open) return null;

  const handleClose = () => {
    setTipo(null);
    setObservacao('');
    onOpenChange(false);
  };

  const handleSubmit = () => {
    if (!tipo) return;
    criarEvento.mutate(
      { routeId, driverId, tipo, observacao: observacao.trim() || undefined, orderId, orderType },
      { onSuccess: handleClose },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full sm:max-w-md max-h-[90vh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
        {/* Cabeçalho fixo */}
        <div className="shrink-0 flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="font-bold text-base">Registrar Ocorrência</h2>
          </div>
          <button
            onClick={handleClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Conteúdo rolável — só categorias + observação, nunca mapa */}
        <div className="flex-1 overflow-y-auto px-5 min-h-0">
          <div className="pb-2 grid grid-cols-2 gap-2.5">
            {TIPOS.map(({ value, label, icon: Icon }) => {
              const selected = tipo === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTipo(value)}
                  className={`flex flex-col items-center gap-2 p-4 min-h-[96px] rounded-2xl border-2 transition-colors ${
                    selected
                      ? 'border-violet-600 bg-violet-50'
                      : 'border-muted hover:border-violet-200 hover:bg-violet-50/50'
                  }`}
                >
                  <Icon className={`h-6 w-6 ${selected ? 'text-violet-600' : 'text-violet-500'}`} />
                  <span className={`text-xs font-semibold text-center leading-tight ${selected ? 'text-violet-700' : 'text-foreground'}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {tipo && (
            <div className="pt-3 pb-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <Label className="text-xs">Observação (opcional)</Label>
              <Textarea
                autoFocus
                placeholder="Detalhes do que aconteceu..."
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                className="min-h-[72px] resize-none text-sm"
              />
            </div>
          )}
        </div>

        {/* Área de ação fixa */}
        <div className="shrink-0 p-5 pt-4 space-y-2 border-t safe-area-bottom">
          {tipo && (
            <Button
              className="w-full h-12 bg-violet-600 hover:bg-violet-700 text-white font-semibold"
              onClick={handleSubmit}
              disabled={criarEvento.isPending}
            >
              {criarEvento.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Registrar
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full h-12 font-semibold"
            onClick={handleClose}
            disabled={criarEvento.isPending}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
