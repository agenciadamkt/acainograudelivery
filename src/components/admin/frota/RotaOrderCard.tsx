import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Clock, MapPin, MessageSquare, Phone, Package, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RotaOrdem } from '@/hooks/useRotaDoDia';
import { formatBRL } from '@/lib/utils';

interface RotaOrderCardProps {
  ordem: RotaOrdem;
  onRegistrarEntrega: (orderId: string, observation: string, isFranchiseeOrder?: boolean, isManualOrder?: boolean) => void;
  onSalvarObservacao: (orderId: string, obs: string) => void;
  onRemover: (ordem: RotaOrdem) => void;
  onEditar?: (ordem: RotaOrdem) => void;
  isLoading?: boolean;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending:           { label: 'Pendente',    className: 'bg-yellow-500/10 text-yellow-600 border-yellow-200' },
  confirmed:         { label: 'Confirmado',  className: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  preparing:         { label: 'Preparando',  className: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  ready:             { label: 'Pronto',      className: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  out_for_delivery:  { label: 'Em Rota',     className: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  delivered:         { label: 'Entregue',    className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  cancelled:         { label: 'Cancelado',   className: 'bg-gray-500/10 text-gray-500 border-gray-200' },
};

function Ts({ label, value, icon }: { label: string; value: string | null; icon: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{icon} {label}</span>
      <span className={`text-sm font-semibold ${value ? 'text-foreground' : 'text-muted-foreground/40'}`}>
        {value ? format(new Date(value), 'HH:mm', { locale: ptBR }) : '—'}
      </span>
    </div>
  );
}

export function RotaOrderCard({ ordem, onRegistrarEntrega, onSalvarObservacao, onRemover, onEditar, isLoading }: RotaOrderCardProps) {
  const [obs, setObs]           = useState(ordem.deliveryObservation ?? '');
  const [showObs, setShowObs]   = useState(!!ordem.deliveryObservation);
  const statusInfo = STATUS_MAP[ordem.status] ?? STATUS_MAP.pending;
  const isDelivered = ordem.status === 'delivered';
  const isCancelled = ordem.status === 'cancelled';
  const hasRuleViolation = ordem.ruleViolations.length > 0;

  const handleEntrega = () => {
    onRegistrarEntrega(ordem.orderId, obs, ordem.isFranchiseeOrder, ordem.isManualOrder);
  };

  const handleSaveObs = () => {
    onSalvarObservacao(ordem.orderId, obs);
  };

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-all ${isDelivered ? 'opacity-70' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
          isDelivered ? 'bg-emerald-500' : ordem.status === 'out_for_delivery' ? 'bg-blue-500' : 'bg-orange-500'
        }`}>
          {isDelivered ? <CheckCircle2 className="h-4 w-4" /> : ordem.sequencia}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm">#{ordem.orderNumber}</span>
            {ordem.isManualOrder && (
              <Badge className="text-[10px] h-4 px-1.5 bg-orange-100 text-orange-700 border-orange-200">
                Manual
              </Badge>
            )}
            {!ordem.isManualOrder && ordem.isFranchiseeOrder && (
              <Badge className="text-[10px] h-4 px-1.5 bg-purple-100 text-purple-700 border-purple-200">
                Franquia
              </Badge>
            )}
            {hasRuleViolation && (
              <Badge
                className="text-[10px] h-4 px-1.5 gap-1 bg-red-100 text-red-700 border-red-200"
                title={ordem.ruleViolations[0].message}
              >
                <AlertTriangle className="h-2.5 w-2.5" /> Abaixo do mínimo
              </Badge>
            )}
            <span className="text-sm text-muted-foreground truncate">{ordem.customer.name}</span>
          </div>
          <span className={`text-xs font-mono ${hasRuleViolation ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
            {formatBRL(ordem.totalAmount)}
          </span>
        </div>
        <Badge variant="outline" className={`text-xs shrink-0 ${statusInfo.className}`}>
          {statusInfo.label}
        </Badge>
      </div>

      {/* Ações da entrega — sempre visíveis, com texto (não só ícone), pra
          não ficarem escondidas/perdidas no card. */}
      <div className="flex gap-2 px-4 py-2 border-b bg-muted/10">
        {ordem.isManualOrder && onEditar && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditar(ordem)}
            className="flex-1 h-8 text-xs gap-1.5"
          >
            <Edit2 className="h-3.5 w-3.5" /> Editar
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRemover(ordem)}
          className="flex-1 h-8 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Remover da Rota
        </Button>
      </div>

      {/* Endereço */}
      {ordem.address && (
        <div className="flex items-start gap-2 px-4 py-2 border-b">
          <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {ordem.address.street}, {ordem.address.number}
            {ordem.address.complement ? ` — ${ordem.address.complement}` : ''}
            <br />
            {ordem.address.neighborhood} · {ordem.address.city}
          </p>
        </div>
      )}

      {/* Telefone + Obs cliente */}
      {(ordem.customer.phone || ordem.customerNotes) && (
        <div className="flex items-center gap-4 px-4 py-2 border-b text-xs text-muted-foreground">
          {ordem.customer.phone && (
            <a href={`tel:${ordem.customer.phone}`} className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Phone className="h-3 w-3" />
              {ordem.customer.phone}
            </a>
          )}
          {ordem.customerNotes && (
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {ordem.customerNotes}
            </span>
          )}
        </div>
      )}

      {/* Timeline de horários */}
      <div className="grid grid-cols-4 gap-2 px-4 py-3 border-b">
        <Ts label="Chegou"   value={ordem.createdAt}          icon="📥" />
        <Ts label="Aprovado" value={ordem.confirmedAt}        icon="✅" />
        <Ts label="Saiu"     value={ordem.outForDeliveryAt}   icon="🛵" />
        <Ts label="Entregue" value={ordem.deliveredAt}        icon="📦" />
      </div>

      {/* Observação da entrega */}
      {!isCancelled && (
        <div className="px-4 py-3 space-y-2">
          <button
            onClick={() => setShowObs(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            {showObs ? 'Ocultar observação' : obs ? 'Ver observação' : 'Adicionar observação'}
            {obs && !showObs && (
              <span className="ml-1 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[10px]">
                ⚠️ há observação
              </span>
            )}
          </button>

          {showObs && (
            <div className="space-y-2">
              <Textarea
                value={obs}
                onChange={e => setObs(e.target.value)}
                placeholder="Ex: cliente ausente, portão fechado, entregue para vizinho..."
                className="text-sm min-h-[72px] resize-none"
                disabled={isDelivered}
              />
              {!isDelivered && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveObs}
                  disabled={isLoading}
                  className="h-7 text-xs"
                >
                  Salvar observação
                </Button>
              )}
            </div>
          )}

          {/* Botão registrar entrega */}
          {!isDelivered && !isCancelled && (
            <Button
              onClick={handleEntrega}
              disabled={isLoading}
              size="sm"
              className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white mt-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Registrar Entrega
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
