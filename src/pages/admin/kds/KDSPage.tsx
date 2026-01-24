import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders, useUpdateOrderStatus } from '@/hooks/useOrders';
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Maximize, Settings, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function KDSPage() {
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { data: orders = [] } = useOrders({ status: undefined });
  const updateStatus = useUpdateOrderStatus();

  useRealtimeOrders();

  const preparingOrders = orders.filter((o) => o.status === 'preparing' || o.status === 'confirmed');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const getTimeColor = (createdAt: string) => {
    const minutes = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60);
    if (minutes > 60) return 'bg-red-500';
    if (minutes > 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleMarkReady = (orderId: string) => {
    updateStatus.mutate({ orderId, status: 'ready' });
    // Tocar som
    try {
      const audio = new Audio('/sounds/order-ready.mp3');
      audio.play().catch(() => { });
    } catch { }
  };

  const handleMarkDelivered = (orderId: string) => {
    updateStatus.mutate({ orderId, status: 'delivered' });
  };

  return (
    <div className={`min-h-screen bg-background p-6 ${isFullscreen ? 'text-2xl' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size={isFullscreen ? 'lg' : 'default'}
            onClick={() => navigate('/admin/dashboard')}
          >
            <ArrowLeft className={isFullscreen ? 'w-6 h-6' : 'w-4 h-4'} />
            <span className="ml-2">Voltar</span>
          </Button>
          <div>
            <h1 className={`font-bold ${isFullscreen ? 'text-5xl' : 'text-3xl'}`}>
              KDS - Cozinha
            </h1>
            <p className="text-muted-foreground">
              {preparingOrders.length} em preparo · {readyOrders.length} prontos
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size={isFullscreen ? 'lg' : 'default'}>
            <Settings className={isFullscreen ? 'w-6 h-6' : 'w-4 h-4'} />
          </Button>
          <Button
            variant="outline"
            size={isFullscreen ? 'lg' : 'default'}
            onClick={toggleFullscreen}
          >
            <Maximize className={isFullscreen ? 'w-6 h-6' : 'w-4 h-4'} />
          </Button>
        </div>
      </div>

      {/* KDS Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Em Preparo */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`font-bold ${isFullscreen ? 'text-3xl' : 'text-xl'}`}>
              Em Preparo
            </h2>
            <Badge className="bg-orange-500 text-lg px-4 py-1">
              {preparingOrders.length}
            </Badge>
          </div>

          <div className="space-y-4">
            {preparingOrders.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                Nenhum pedido em preparo
              </Card>
            ) : (
              preparingOrders.map((order) => (
                <Card
                  key={order.id}
                  className={`p-6 ${isFullscreen ? 'p-8' : ''}`}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`font-bold ${isFullscreen ? 'text-4xl' : 'text-2xl'}`}>
                          #{order.order_number}
                        </h3>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className={isFullscreen ? 'w-6 h-6' : 'w-4 h-4'} />
                          <span className={`${isFullscreen ? 'text-xl' : 'text-sm'}`}>
                            {formatDistanceToNow(new Date(order.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>
                      <Badge className={`${getTimeColor(order.created_at)} ${isFullscreen ? 'text-2xl px-6 py-2' : ''}`}>
                        {Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60))} min
                      </Badge>
                    </div>

                    {/* Items */}
                    <div className="space-y-3 border-t pt-4">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className={`${isFullscreen ? 'text-xl' : ''}`}>
                          <p className="font-bold">
                            {item.quantity}x {item.product?.name} - {item.size?.name}
                          </p>
                          {item.toppings && item.toppings.length > 0 && (
                            <ul className="ml-6 mt-1 space-y-1">
                              {item.toppings.map((t: any) => (
                                <li key={t.id} className="text-muted-foreground">
                                  + {t.topping?.name}
                                </li>
                              ))}
                            </ul>
                          )}
                          {item.notes && (
                            <p className="ml-6 mt-1 italic text-muted-foreground">
                              Obs: {item.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Observações */}
                    {order.customer_notes && (
                      <div className="border-t pt-4">
                        <p className={`font-medium ${isFullscreen ? 'text-2xl' : ''}`}>
                          ⚠️ Observações:
                        </p>
                        <p className={`${isFullscreen ? 'text-xl' : ''} text-muted-foreground mt-1`}>
                          {order.customer_notes}
                        </p>
                      </div>
                    )}

                    {/* Action */}
                    <Button
                      onClick={() => handleMarkReady(order.id)}
                      className="w-full"
                      size={isFullscreen ? 'lg' : 'default'}
                    >
                      MARCAR COMO PRONTO
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Prontos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`font-bold ${isFullscreen ? 'text-3xl' : 'text-xl'}`}>
              Prontos
            </h2>
            <Badge className="bg-green-500 text-lg px-4 py-1">
              {readyOrders.length}
            </Badge>
          </div>

          <div className="space-y-4">
            {readyOrders.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                Nenhum pedido pronto
              </Card>
            ) : (
              readyOrders.map((order) => (
                <Card
                  key={order.id}
                  className={`p-6 bg-green-50 dark:bg-green-950/20 ${isFullscreen ? 'p-8' : ''}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`font-bold ${isFullscreen ? 'text-4xl' : 'text-2xl'}`}>
                          #{order.order_number}
                        </h3>
                        <p className={`${isFullscreen ? 'text-xl' : ''} text-green-600 font-bold mt-2`}>
                          ✅ PRONTO PARA ENTREGA
                        </p>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <p className={`${isFullscreen ? 'text-xl' : ''}`}>
                        {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'itens'}
                      </p>
                      <p className={`${isFullscreen ? 'text-xl' : ''} text-muted-foreground`}>
                        {order.order_type === 'delivery'
                          ? '🛵 Delivery'
                          : order.order_type === 'pickup'
                            ? '🏃 Retirada'
                            : '🍽️ Mesa ' + order.table_number}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => handleMarkDelivered(order.id)}
                      className="w-full"
                      size={isFullscreen ? 'lg' : 'default'}
                    >
                      MARCAR COMO ENTREGUE
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
