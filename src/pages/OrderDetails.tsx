import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrderById, useCancelOrder } from '@/hooks/useOrders';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import BottomNavigation from '@/components/BottomNavigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from '@/hooks/use-toast';

export default function OrderDetails() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { data: order, isLoading } = useOrderById(orderId!);
  const { mutateAsync: cancelOrder, isPending: isCancelling } = useCancelOrder();
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-yellow-500' },
    confirmed: { label: 'Confirmado', color: 'bg-blue-500' },
    preparing: { label: 'Em Preparo', color: 'bg-orange-500' },
    ready: { label: 'Pronto', color: 'bg-green-500' },
    delivered: { label: 'Entregue', color: 'bg-gray-500' },
    cancelled: { label: 'Cancelado', color: 'bg-red-500' },
  };

  const handleCancelOrder = async () => {
    if (!cancellationReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo do cancelamento.",
        variant: "destructive",
      });
      return;
    }

    try {
      await cancelOrder({ orderId: orderId!, reason: cancellationReason });

      setIsCancelDialogOpen(false);
      // O hook já faz o invalidateQueries, então o status deve atualizar sozinho
      // Mas se quisermos garantir ou dar feedback visual podemos manter o toast (que o hook já tem?)
      // O hook já tem toast de sucesso.
    } catch (error) {
      // O hook já tem toast de erro.
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="p-6 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background pb-20 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Pedido não encontrado</h2>
          <p className="text-muted-foreground mb-4">
            Este pedido não existe ou você não tem permissão para visualizá-lo.
          </p>
          <Button onClick={() => navigate('/orders')}>
            Voltar para Pedidos
          </Button>
        </Card>
      </div>
    );
  }

  const status = statusConfig[order.status as keyof typeof statusConfig];
  const canCancel = ['pending', 'confirmed'].includes(order.status);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b p-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">Detalhes do Pedido</h1>
      </div>

      <div className="p-6 space-y-6">
        {/* Status Card */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">#{order.order_number}</h2>
              <p className="text-sm text-muted-foreground">
                {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <Badge className={status.color}>
              {status.label}
            </Badge>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            {order.confirmed_at && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Confirmado em {format(new Date(order.confirmed_at), "HH:mm", { locale: ptBR })}</span>
              </div>
            )}
            {order.prepared_at && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Preparado em {format(new Date(order.prepared_at), "HH:mm", { locale: ptBR })}</span>
              </div>
            )}
            {order.ready_at && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Pronto em {format(new Date(order.ready_at), "HH:mm", { locale: ptBR })}</span>
              </div>
            )}
            {order.delivered_at && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-gray-500" />
                <span>Entregue em {format(new Date(order.delivered_at), "HH:mm", { locale: ptBR })}</span>
              </div>
            )}
            {order.status === 'cancelled' && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Cancelado</span>
              </div>
            )}
          </div>
        </Card>

        {/* Order Info */}
        <Card className="p-6">
          <h3 className="font-bold mb-4">Informações do Pedido</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tipo:</span>
              <span className="capitalize">
                {order.order_type === 'delivery' ? 'Delivery' :
                  order.order_type === 'pickup' ? 'Retirada' :
                    'No Local'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pagamento:</span>
              <span className="capitalize">{order.payment_method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status Pagamento:</span>
              <span className={order.payment_status === 'paid' ? 'text-success font-medium' : ''}>
                {order.payment_status === 'paid' ? '✓ Pago' : 'Pendente'}
              </span>
            </div>
            {order.table_number && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mesa:</span>
                <span>{order.table_number}</span>
              </div>
            )}
            {order.cancellation_reason && (
              <div className="pt-2 border-t mt-2">
                <span className="text-muted-foreground block mb-1">Motivo do Cancelamento:</span>
                <span className="text-red-500 block">{order.cancellation_reason}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Items */}
        <Card className="p-6">
          <h3 className="font-bold mb-4">Itens do Pedido</h3>
          <div className="space-y-4">
            {order.items?.map((item: any) => (
              <div key={item.id} className="border-b pb-4 last:border-0">
                <div className="flex justify-between mb-2">
                  <div>
                    <p className="font-medium">{item.quantity}x {item.product?.name}</p>
                    {item.product_size && (
                      <p className="text-sm text-muted-foreground">
                        {item.product_size.name} ({item.product_size.ml_size}ml)
                      </p>
                    )}
                  </div>
                  <p className="font-bold">R$ {item.subtotal.toFixed(2)}</p>
                </div>
                {item.toppings && item.toppings.length > 0 && (
                  <div className="ml-4">
                    <p className="text-xs text-muted-foreground mb-1">Complementos:</p>
                    {item.toppings.map((topping: any) => (
                      <p key={topping.id} className="text-sm">
                        • {topping.topping.name}
                        {topping.unit_price > 0 && ` (+R$ ${topping.unit_price.toFixed(2)})`}
                      </p>
                    ))}
                  </div>
                )}
                {item.notes && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Obs: {item.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Total */}
        <Card className="p-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>R$ {order.subtotal.toFixed(2)}</span>
            </div>
            {order.delivery_fee > 0 && (
              <div className="flex justify-between">
                <span>Taxa de entrega:</span>
                <span>R$ {order.delivery_fee.toFixed(2)}</span>
              </div>
            )}
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-success">
                <span>Desconto:</span>
                <span>- R$ {order.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-2 border-t">
              <span>Total:</span>
              <span>R$ {order.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        {/* Cancel Button */}
        {canCancel && (
          <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                Cancelar Pedido
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancelar Pedido</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja cancelar seu pedido? Por favor, informe o motivo.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">Motivo do cancelamento *</Label>
                  <Textarea
                    id="reason"
                    placeholder="Digite o motivo..."
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)} disabled={isCancelling}>
                  Voltar
                </Button>
                <Button variant="destructive" onClick={handleCancelOrder} disabled={isCancelling}>
                  {isCancelling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirmar Cancelamento
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
