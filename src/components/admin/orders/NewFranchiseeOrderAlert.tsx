import { PackageIcon, DollarSign, CreditCard, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatBRL } from '@/lib/utils';
import type { NewFranchiseeOrderAlertData } from '@/hooks/useRealtimeFranchiseeOrders';

interface Props {
  order: NewFranchiseeOrderAlertData | null;
  onAcknowledge: () => void;
}

// Modal customizado (não usa o <Dialog> compartilhado, que sempre renderiza
// um X de fechar) — garante que o alerta só desaparece quando o colaborador
// clica em "OK", nunca por ESC, clique fora ou um X escondido. Aparece em
// qualquer tela do admin (montado globalmente em AdminLayout) com o mesmo
// espírito do "Aceitar pedido!" do Delivery, mas só de reconhecimento — não
// aprova/despacha nada, isso continua em admin/orders/management.
export function NewFranchiseeOrderAlert({ order, onAcknowledge }: Props) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 px-6 py-5 bg-purple-500/10 border-b-4 border-purple-500">
          <PackageIcon className="w-10 h-10 text-purple-600 animate-pulse" />
          <h2 className="text-2xl font-bold">Novo Pedido de Franquia!</h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-card p-4 rounded-lg border-2 border-purple-200">
            <p className="text-xs text-muted-foreground mb-1">Franqueado</p>
            <p className="text-xl font-bold text-purple-700">{order.franchiseeName}</p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
            <DollarSign className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Valor Total</p>
              <p className="text-lg font-bold text-green-600">{formatBRL(order.totalAmount)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
            <CreditCard className="w-5 h-5 text-purple-600 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
              <p className="text-sm font-semibold">{order.paymentMethod}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-card rounded-lg border">
            <Clock className="w-5 h-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Recebido em</p>
              <p className="text-sm font-semibold">
                {format(new Date(order.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <Button
            onClick={onAcknowledge}
            className="w-full h-14 text-xl font-bold bg-purple-600 hover:bg-purple-700 text-white"
          >
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
