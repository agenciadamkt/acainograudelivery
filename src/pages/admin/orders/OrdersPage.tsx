import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useOrders, useUpdateOrderStatus, useCancelOrder, useOrderStats } from '@/hooks/useOrders';
import { useStore } from '@/contexts/StoreContext';
import { OrderCard } from '@/components/admin/OrderCard';
import { OrderDetails } from '@/components/admin/OrderDetails';
import { SelectDriverDialog } from '@/components/admin/delivery/SelectDriverDialog';
import { OrderFilters } from '@/components/admin/OrderFilters';
import { OrderStats } from '@/components/admin/OrderStats';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { usePrinter } from '@/contexts/PrinterContext';
import { generateEscPosCommand } from '@/utils/printing/escpos';
import { toast } from 'sonner';
import { useEffect } from 'react';

export default function OrdersPage() {
  const [filters, setFilters] = useState({});
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; orderId: string | null }>({
    open: false,
    orderId: null,
  });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; orderId: string | null }>({
    open: false,
    orderId: null,
  });
  const [cancelReason, setCancelReason] = useState('');

  const { data: orders = [], isLoading } = useOrders(filters);
  const { data: stats } = useOrderStats();
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();
  const { currentStore } = useStore();
  const { printRaw, isConnected } = usePrinter();

  // Automatic Printing Logic removed per user request (only print on accept)
  // Realtime updates are handled by useOrders hook
  useEffect(() => {
    // Keep toast for feedback if desired, or relying on global handler
  }, []);

  const selectedOrderData = orders.find((o) => o.id === selectedOrder);

  const ordersByStatus = {
    pending: orders.filter((o) => o.status === 'pending'),
    confirmed: orders.filter((o) => o.status === 'confirmed'),
    preparing: orders.filter((o) => o.status === 'preparing'),
    ready: orders.filter((o) => o.status === 'ready'),
    delivered: orders.filter((o) => o.status === 'delivered'),
    cancelled: orders.filter((o) => o.status === 'cancelled'),
  };

  const handleUpdateStatus = (orderId: string, status: string) => {
    updateStatus.mutate({ orderId, status });
  };

  const handleCancelOrder = () => {
    if (cancelDialog.orderId && cancelReason) {
      cancelOrder.mutate(
        { orderId: cancelDialog.orderId, reason: cancelReason },
        {
          onSuccess: () => {
            setCancelDialog({ open: false, orderId: null });
            setCancelReason('');
            setSelectedOrder(null);
          },
        }
      );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pedidos</h1>
            <p className="text-muted-foreground">Gerencie todos os pedidos da loja</p>
          </div>
        </div>

        {stats && <OrderStats stats={stats} />}

        <OrderFilters onFilterChange={setFilters} />

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              Todos
              <Badge variant="secondary" className="ml-2">
                {orders.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending">
              Novos
              <Badge variant="secondary" className="ml-2 bg-yellow-500">
                {ordersByStatus.pending.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Confirmados
              <Badge variant="secondary" className="ml-2 bg-blue-500">
                {ordersByStatus.confirmed.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="preparing">
              Em Preparo
              <Badge variant="secondary" className="ml-2 bg-orange-500">
                {ordersByStatus.preparing.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="ready">
              Prontos
              <Badge variant="secondary" className="ml-2 bg-green-500">
                {ordersByStatus.ready.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">Carregando pedidos...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhum pedido encontrado
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onViewDetails={() => setSelectedOrder(order.id)}
                    onUpdateStatus={(status) => handleUpdateStatus(order.id, status)}
                    onCancelOrder={() => setCancelDialog({ open: true, orderId: order.id })}
                    onAssignDriver={() => setAssignDialog({ open: true, orderId: order.id })}
                    stopSound={() => { }}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {(['pending', 'confirmed', 'preparing', 'ready'] as const).map((status) => (
            <TabsContent key={status} value={status} className="space-y-4">
              {ordersByStatus[status].length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum pedido neste status
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ordersByStatus[status].map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onViewDetails={() => setSelectedOrder(order.id)}
                      onUpdateStatus={(newStatus) => handleUpdateStatus(order.id, newStatus)}
                      onCancelOrder={() => setCancelDialog({ open: true, orderId: order.id })}
                      stopSound={() => { }}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Pedido</DialogTitle>
            </DialogHeader>
            {selectedOrderData && (
              <div className="space-y-4">
                <OrderDetails order={selectedOrderData} />
                <div className="flex gap-2 pt-4 border-t">
                  {selectedOrderData.status !== 'cancelled' &&
                    selectedOrderData.status !== 'delivered' && (
                      <Button
                        variant="destructive"
                        onClick={() =>
                          setCancelDialog({ open: true, orderId: selectedOrderData.id })
                        }
                      >
                        Cancelar Pedido
                      </Button>
                    )}
                  <Button variant="outline" onClick={() => setSelectedOrder(null)} className="ml-auto">
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Cancel Order Dialog */}
        <AlertDialog
          open={cancelDialog.open}
          onOpenChange={(open) => setCancelDialog({ open, orderId: null })}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Pedido</AlertDialogTitle>
              <AlertDialogDescription>
                Por favor, informe o motivo do cancelamento:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motivo do cancelamento..."
              rows={3}
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCancelReason('')}>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancelOrder}
                disabled={!cancelReason}
                className="bg-destructive hover:bg-destructive/90"
              >
                Confirmar Cancelamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <SelectDriverDialog
        open={assignDialog.open}
        onOpenChange={(open) => setAssignDialog({ ...assignDialog, open })}
        onSelectDriver={(driverId) => {
          if (assignDialog.orderId) {
            updateStatus.mutate({
              orderId: assignDialog.orderId,
              status: 'ready',
              driverId
            });
            setAssignDialog({ open: false, orderId: null });
          }
        }}
        isAssigning={updateStatus.isPending}
      />
    </AdminLayout>
  );
}
