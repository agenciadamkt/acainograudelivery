import { useState, useMemo, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useOrders, useUpdateOrderStatus, useCancelOrder } from '@/hooks/useOrders';
import { useStore } from '@/contexts/StoreContext';
import { OrderCard } from '@/components/admin/OrderCard';
import { OrderDetails } from '@/components/admin/OrderDetails';
import { SelectDriverDialog } from '@/components/admin/delivery/SelectDriverDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LayoutGrid, Truck, ShoppingBag, Utensils, Search, CalendarIcon,
  Inbox, Timer, CheckCircle2, CheckCheck,
} from 'lucide-react';

type OrderType = 'all' | 'delivery' | 'pickup' | 'dine_in';

const TYPE_FILTERS: { value: OrderType; label: string; icon: any }[] = [
  { value: 'all', label: 'Todos', icon: LayoutGrid },
  { value: 'delivery', label: 'Delivery', icon: Truck },
  { value: 'pickup', label: 'Retirada', icon: ShoppingBag },
  { value: 'dine_in', label: 'Balcão / Mesa', icon: Utensils },
];

// Colunas do Kanban → status do pedido que caem em cada uma
const COLUMNS: { id: string; label: string; statuses: string[]; icon: any; accent: string; badge: string }[] = [
  { id: 'recebidos', label: 'Recebidos',   statuses: ['pending', 'confirmed'], icon: Inbox,        accent: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  { id: 'producao',  label: 'Em produção', statuses: ['preparing'],            icon: Timer,        accent: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700' },
  { id: 'prontos',   label: 'Prontos',     statuses: ['ready'],                icon: CheckCircle2, accent: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  { id: 'rota',      label: 'Em rota',      statuses: ['out_for_delivery'],     icon: Truck,        accent: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700' },
];

export default function OrdersPage() {
  const { currentStore } = useStore();
  const [typeFilter, setTypeFilter] = useState<OrderType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState<Date>(() => new Date()); // padrão: hoje

  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });
  const [cancelReason, setCancelReason] = useState('');

  // Filtro por data: SEMPRE parte do dia selecionado (padrão hoje) e aplica
  // automaticamente — os filters derivam do state, então a query refaz sozinha
  // quando a data muda. Sem botão "Filtrar".
  const filters = useMemo(() => ({
    date_from: startOfDay(date).toISOString(),
    date_to: endOfDay(date).toISOString(),
  }), [date]);

  const { data: orders = [], isLoading } = useOrders(filters);
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();

  const selectedOrderData = orders.find((o) => o.id === selectedOrder);

  // Busca client-side (cliente ou número do pedido)
  const searched = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((o: any) =>
      o.customer?.name?.toLowerCase().includes(term) ||
      String(o.order_number || '').toLowerCase().includes(term)
    );
  }, [orders, searchTerm]);

  // Contagem por tipo (para os pills), respeitando a busca
  const typeCounts = useMemo(() => ({
    all: searched.length,
    delivery: searched.filter((o: any) => o.order_type === 'delivery').length,
    pickup: searched.filter((o: any) => o.order_type === 'pickup').length,
    dine_in: searched.filter((o: any) => o.order_type === 'dine_in').length,
  }), [searched]);

  // Pedidos visíveis (aplicando o filtro de tipo)
  const visible = useMemo(() =>
    typeFilter === 'all' ? searched : searched.filter((o: any) => o.order_type === typeFilter),
    [searched, typeFilter]
  );

  const countByStatuses = (statuses: string[]) => visible.filter((o: any) => statuses.includes(o.status)).length;
  const deliveredCount = visible.filter((o: any) => o.status === 'delivered').length;

  const handleUpdateStatus = (orderId: string, status: string) => updateStatus.mutate({ orderId, status });

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

  const statCards = [
    { label: 'Recebidos',   value: countByStatuses(['pending', 'confirmed']), icon: Inbox,        color: 'bg-indigo-100 text-indigo-600' },
    { label: 'Em produção', value: countByStatuses(['preparing']),            icon: Timer,        color: 'bg-amber-100 text-amber-600' },
    { label: 'Prontos',     value: countByStatuses(['ready']),                icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-600' },
    { label: 'Em rota',     value: countByStatuses(['out_for_delivery']),     icon: Truck,        color: 'bg-blue-100 text-blue-600' },
    { label: 'Entregues',   value: deliveredCount,                            icon: CheckCheck,   color: 'bg-green-100 text-green-600' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">Gerencie todos os pedidos da sua loja.</p>
        </div>

        {/* Filtros de tipo (pills) */}
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((t) => {
            const active = typeFilter === t.value;
            return (
              <button
                key={t.value}
                onClick={() => setTypeFilter(t.value)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-muted/50 border-border text-foreground'
                )}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                <span className={cn(
                  'text-xs font-bold rounded-full px-1.5 min-w-[20px] text-center',
                  active ? 'bg-white/20' : 'bg-muted text-muted-foreground'
                )}>
                  {typeCounts[t.value]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {statCards.map((c) => (
            <div key={c.label} className="rounded-xl border bg-card p-4 flex items-center gap-3">
              <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', c.color)}>
                <c.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold leading-none">{c.value}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Busca + data */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por cliente ou número do pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal sm:w-56">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {isToday(date) ? 'Hoje' : format(date, 'dd/MM/yyyy', { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
                locale={ptBR}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Kanban */}
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Carregando pedidos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {COLUMNS.map((col) => {
              const colOrders = visible.filter((o: any) => col.statuses.includes(o.status));
              return (
                <div key={col.id} className="rounded-xl border bg-muted/20 flex flex-col min-h-[200px]">
                  <div className="flex items-center gap-2 p-3 border-b bg-card rounded-t-xl">
                    <col.icon className={cn('w-4 h-4', col.accent)} />
                    <span className="font-semibold text-sm">{col.label}</span>
                    <span className={cn('ml-auto text-xs font-bold rounded-full px-2 py-0.5', col.badge)}>
                      {colOrders.length}
                    </span>
                  </div>
                  <div className="p-3 space-y-3 flex-1">
                    {colOrders.length === 0 ? (
                      <div className="text-center text-xs text-muted-foreground py-10">
                        Nenhum pedido aqui.
                      </div>
                    ) : (
                      colOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onViewDetails={() => setSelectedOrder(order.id)}
                          onUpdateStatus={(status) => handleUpdateStatus(order.id, status)}
                          onCancelOrder={() => setCancelDialog({ open: true, orderId: order.id })}
                          onAssignDriver={() => setAssignDialog({ open: true, orderId: order.id })}
                          stopSound={() => { }}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detalhes do Pedido */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Pedido</DialogTitle>
            </DialogHeader>
            {selectedOrderData && (
              <div className="space-y-4">
                <OrderDetails order={selectedOrderData} />
                <div className="flex gap-2 pt-4 border-t">
                  {selectedOrderData.status !== 'cancelled' && selectedOrderData.status !== 'delivered' && (
                    <Button variant="destructive" onClick={() => setCancelDialog({ open: true, orderId: selectedOrderData.id })}>
                      Cancelar Pedido
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setSelectedOrder(null)} className="ml-auto">Fechar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Cancelar Pedido */}
        <AlertDialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, orderId: null })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar Pedido</AlertDialogTitle>
              <AlertDialogDescription>Por favor, informe o motivo do cancelamento:</AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Motivo do cancelamento..." rows={3} />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCancelReason('')}>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelOrder} disabled={!cancelReason} className="bg-destructive hover:bg-destructive/90">
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
            updateStatus.mutate({ orderId: assignDialog.orderId, status: 'ready', driverId });
            setAssignDialog({ open: false, orderId: null });
          }
        }}
        isAssigning={updateStatus.isPending}
      />
    </AdminLayout>
  );
}
