import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderById } from '@/hooks/useOrders';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Clock, Home, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function OrderConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { getStoreAwareRoute } = useCart();
  const { data: order, isLoading } = useOrderById(orderId!);
  const [storeSlug, setStoreSlug] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      navigate(getStoreAwareRoute());
    }
  }, [orderId, navigate, getStoreAwareRoute]);

  useEffect(() => {
    if (order?.store_id) {
      supabase
        .from('stores')
        .select('slug')
        .eq('id', order.store_id)
        .single()
        .then(({ data }) => {
          if (data?.slug) {
            setStoreSlug(data.slug);
          }
        });
    }
  }, [order]);

  const getCorrectRoute = () => {
    return storeSlug ? `/delivery/${storeSlug}` : '/menu';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Pedido não encontrado</p>
          <Button onClick={() => navigate(getStoreAwareRoute())}>Voltar ao Cardápio</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Pedido Confirmado!</h1>
          <p className="text-muted-foreground">
            Seu pedido foi recebido e será preparado em breve
          </p>
        </div>

        <div className="bg-muted p-4 rounded-lg mb-6">
          <p className="text-sm text-muted-foreground mb-1">Número do pedido</p>
          <p className="text-2xl font-bold">#{order.order_number}</p>
        </div>

        <div className="flex items-center justify-center gap-2 text-muted-foreground mb-8">
          <Clock className="w-5 h-5" />
          <p>Tempo estimado: 30-45 minutos</p>
        </div>

        <div className="space-y-3">
          <Button className="w-full" onClick={() => navigate(`/orders`)}>
            <FileText className="w-4 h-4 mr-2" />
            Acompanhar Pedido
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate(getCorrectRoute())}>
            <Home className="w-4 h-4 mr-2" />
            Voltar ao Início
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t text-sm text-muted-foreground">
          <p>Você receberá notificações sobre o status do seu pedido</p>
        </div>
      </Card>
    </div>
  );
}
