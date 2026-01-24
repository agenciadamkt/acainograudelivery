import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useOrders } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getStoreAwareRoute } = useCart();
  const [customerId, setCustomerId] = useState<string>();
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');

  useEffect(() => {
    if (user) {
      console.log('[Orders] Buscando customer para user:', user.id);
      supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data, error }) => {
          if (error) {
            console.error('[Orders] Erro ao buscar customer:', error);
          } else {
            console.log('[Orders] Customer encontrado:', data?.id);
            setCustomerId(data?.id);
          }
        });
    } else {
      console.log('[Orders] Usuário não autenticado');
    }
  }, [user]);

  const { data: orders, isLoading } = useOrders({ 
    customer_id: customerId 
  });

  useEffect(() => {
    console.log('[Orders] customerId:', customerId);
    console.log('[Orders] orders:', orders?.length || 0);
    console.log('[Orders] isLoading:', isLoading);
  }, [customerId, orders, isLoading]);

  const filteredOrders = orders?.filter(order => {
    if (activeTab === 'active') {
      return ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status);
    }
    if (activeTab === 'completed') {
      return order.status === 'delivered';
    }
    return order.status === 'cancelled';
  });

  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-yellow-500' },
    confirmed: { label: 'Confirmado', color: 'bg-blue-500' },
    preparing: { label: 'Em Preparo', color: 'bg-orange-500' },
    ready: { label: 'Pronto', color: 'bg-green-500' },
    delivered: { label: 'Entregue', color: 'bg-gray-500' },
    cancelled: { label: 'Cancelado', color: 'bg-red-500' },
  };

  const OrderCard = ({ order }: { order: any }) => {
    const status = statusConfig[order.status as keyof typeof statusConfig];

    return (
      <Card 
        className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => navigate(`/order-details/${order.id}`)}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-bold text-lg">#{order.order_number}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <Badge className={status.color}>
            {status.label}
          </Badge>
        </div>

        <div className="space-y-2 mb-3">
          <p className="text-sm">
            <span className="font-medium">{order.items?.length || 0}</span> items
          </p>
          <p className="text-sm text-muted-foreground capitalize">
            {order.order_type === 'delivery' ? '🛵 Delivery' : 
             order.order_type === 'pickup' ? '🏃 Retirada' : 
             '🍽️ No Local'}
          </p>
          {order.payment_status === 'paid' && (
            <p className="text-sm text-success font-medium">✓ Pago Online</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-xl font-bold text-primary">
            R$ {order.total_amount.toFixed(2)}
          </span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Pedidos</h1>

        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'active' ? 'default' : 'outline'}
            onClick={() => setActiveTab('active')}
            size="sm"
          >
            Ativos
          </Button>
          <Button
            variant={activeTab === 'completed' ? 'default' : 'outline'}
            onClick={() => setActiveTab('completed')}
            size="sm"
          >
            Finalizados
          </Button>
          <Button
            variant={activeTab === 'cancelled' ? 'default' : 'outline'}
            onClick={() => setActiveTab('cancelled')}
            size="sm"
          >
            Cancelados
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : filteredOrders && filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map(order => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <Clock className="w-20 h-20 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              {activeTab === 'active' && 'Você não tem pedidos ativos'}
              {activeTab === 'completed' && 'Você não tem pedidos finalizados'}
              {activeTab === 'cancelled' && 'Você não tem pedidos cancelados'}
            </p>
            <Button onClick={() => navigate(getStoreAwareRoute())} className="mt-4">
              Fazer um Pedido
            </Button>
          </div>
        )}
      </div>
      <BottomNavigation />
    </div>
  );
};

export default Orders;
