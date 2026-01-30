import { Order } from '@/hooks/useOrders';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Phone, User, CreditCard, Clock, MessageSquare, Wallet, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import { useCheckoutByOrderId } from '@/hooks/useInfinitePayCheckout';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WHATSAPP_MESSAGES, getWhatsAppUrl } from '@/utils/whatsappMessages';
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface OrderDetailsProps {
  order: Order;
}

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-yellow-500' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500' },
  preparing: { label: 'Em Preparo', color: 'bg-orange-500' },
  ready: { label: 'Pronto', color: 'bg-green-500' },
  delivered: { label: 'Entregue', color: 'bg-gray-500' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500' },
};

export function OrderDetails({ order }: OrderDetailsProps) {
  const status = statusConfig[order.status as keyof typeof statusConfig];
  const { data: infinitePayCheckout, isLoading: loadingCheckout, refetch: refetchCheckout } = useCheckoutByOrderId(order.id);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyPayment = async () => {
    setIsVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Sessão expirada. Faça login novamente.');
        return;
      }

      // Escolher endpoint baseado no método
      const endpoint = order.payment_method === 'pix' || order.payment_method === 'credit_card'
        ? 'mercadopago-payment-check'
        : 'infinitepay-payment-check';

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      const data = await response.json();

      if (data.paid) {
        toast.success('Pagamento confirmado!');
        if (order.payment_method === 'infinitepay') {
          refetchCheckout();
        } else {
          // Forçar reload da página ou invalidar query de orders
          window.location.reload();
        }
      } else {
        toast.info(`Status do pagamento: ${data.status || 'Não confirmado'}`);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Erro ao verificar pagamento');
    } finally {
      setIsVerifying(false);
    }
  };

  const infinitePayStatusConfig: Record<string, { label: string; color: string }> = {
    CREATED: { label: 'Criado', color: 'bg-gray-500' },
    LINK_GENERATED: { label: 'Link Gerado', color: 'bg-blue-500' },
    REDIRECTED: { label: 'Redirecionado', color: 'bg-yellow-500' },
    PAID: { label: 'Pago', color: 'bg-green-500' },
    FAILED: { label: 'Falhou', color: 'bg-red-500' },
    CANCELED: { label: 'Cancelado', color: 'bg-red-500' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">#{order.order_number}</h2>
          <Badge className={status.color}>{status.label}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </div>

      <Separator />

      {/* Customer Info */}
      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <User className="w-4 h-4" />
          Cliente
        </h3>
        <div className="pl-6 space-y-1 text-sm">
          <p>{order.customer?.name}</p>
          {order.customer?.phone && (
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3 h-3" />
                {order.customer.phone}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 text-white bg-[#25D366] border-[#25D366] hover:bg-[#128C7E] hover:border-[#128C7E] transition-all shadow-md"
                onClick={() => {
                  const message = WHATSAPP_MESSAGES[order.status as keyof typeof WHATSAPP_MESSAGES]?.(order) || '';
                  if (message && order.customer?.phone) {
                    window.open(getWhatsAppUrl(order.customer.phone, message), '_blank');
                  }
                }}
              >
                <WhatsAppIcon className="w-4 h-4" />
                Notificar Status
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delivery Address */}
      {order.order_type === 'delivery' && order.delivery_address && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Endereço de Entrega
            </h3>
            <div className="pl-6 text-sm">
              <p>{order.delivery_address.street}, {order.delivery_address.number}</p>
              {order.delivery_address.complement && <p>{order.delivery_address.complement}</p>}
              <p>{order.delivery_address.neighborhood}</p>
              <p>{order.delivery_address.city} - {order.delivery_address.state}</p>
              <p>{order.delivery_address.zipcode}</p>
            </div>
          </div>
        </>
      )}

      {/* Items */}
      <Separator />
      <div className="space-y-3">
        <h3 className="font-semibold">Itens do Pedido</h3>
        <div className="space-y-3">
          {order.items?.map((item: any) => (
            <div key={item.id} className="flex gap-3 p-3 bg-muted rounded-lg">
              {item.product?.base_image_url && (
                <img
                  src={item.product.base_image_url}
                  alt={item.product.name}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{item.product?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.size?.name} {item.size?.ml_size && `(${item.size.ml_size}ml)`}
                    </p>
                  </div>
                  <p className="font-medium">
                    {item.quantity}x R$ {Number(item.unit_price).toFixed(2)}
                  </p>
                </div>
                {item.toppings && item.toppings.length > 0 && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <p className="font-medium">Adicionais:</p>
                    <ul className="list-disc list-inside">
                      {item.toppings.map((t: any) => (
                        <li key={t.id}>{t.topping?.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.notes && (
                  <p className="mt-2 text-sm text-muted-foreground italic">
                    Obs: {item.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment & Total */}
      <Separator />
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          <span className="font-semibold">Pagamento</span>
        </div>
        <div className="pl-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Forma de pagamento:</span>
            <span className="font-medium">{order.payment_method === 'credit_card' ? 'Cartão de Crédito' : order.payment_method === 'pix' ? 'Pix' : order.payment_method}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span>Status do pagamento:</span>
            <Badge className={
              order.payment_status === 'paid' ? 'bg-green-500 hover:bg-green-600' :
                order.payment_status === 'pending' ? 'bg-yellow-500 hover:bg-yellow-600' :
                  'bg-gray-500'
            }>
              {order.payment_status === 'paid' ? 'Pago' :
                order.payment_status === 'pending' ? 'Pendente' :
                  order.payment_status || 'Não informado'}
            </Badge>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>R$ {Number(order.subtotal).toFixed(2)}</span>
          </div>
          {order.delivery_fee > 0 && (
            <div className="flex justify-between">
              <span>Taxa de entrega:</span>
              <span>R$ {Number(order.delivery_fee).toFixed(2)}</span>
            </div>
          )}
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Desconto:</span>
              <span>- R$ {Number(order.discount_amount).toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>R$ {Number(order.total_amount).toFixed(2)}</span>
          </div>

          {/* InfinitePay Section */}
          {(order.payment_method === 'infinitepay' || infinitePayCheckout) && (
            <>
              <Separator className="my-3" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  <span className="font-semibold text-sm">InfinitePay</span>
                  {loadingCheckout ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : infinitePayCheckout ? (
                    <Badge className={infinitePayStatusConfig[infinitePayCheckout.status]?.color || 'bg-gray-500'}>
                      {infinitePayStatusConfig[infinitePayCheckout.status]?.label || infinitePayCheckout.status}
                    </Badge>
                  ) : null}
                </div>

                {infinitePayCheckout && (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {infinitePayCheckout.order_nsu && (
                      <div className="flex justify-between">
                        <span>NSU do Pedido:</span>
                        <span className="font-mono">{infinitePayCheckout.order_nsu.slice(0, 8)}...</span>
                      </div>
                    )}
                    {infinitePayCheckout.transaction_nsu && (
                      <div className="flex justify-between">
                        <span>NSU da Transação:</span>
                        <span className="font-mono">{infinitePayCheckout.transaction_nsu}</span>
                      </div>
                    )}
                    {infinitePayCheckout.capture_method && (
                      <div className="flex justify-between">
                        <span>Método:</span>
                        <span className="capitalize">{infinitePayCheckout.capture_method === 'pix' ? 'PIX' : 'Cartão de Crédito'}</span>
                      </div>
                    )}
                    {infinitePayCheckout.paid_amount && (
                      <div className="flex justify-between">
                        <span>Valor Pago:</span>
                        <span>R$ {(infinitePayCheckout.paid_amount / 100).toFixed(2)}</span>
                      </div>
                    )}
                    {infinitePayCheckout.installments && infinitePayCheckout.installments > 1 && (
                      <div className="flex justify-between">
                        <span>Parcelas:</span>
                        <span>{infinitePayCheckout.installments}x</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {infinitePayCheckout?.status !== 'PAID' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVerifyPayment}
                      disabled={isVerifying}
                      className="flex-1"
                    >
                      {isVerifying ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3 mr-1" />
                      )}
                      Verificar
                    </Button>
                  )}
                  {infinitePayCheckout?.receipt_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <a href={infinitePayCheckout.receipt_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Comprovante
                      </a>
                    </Button>
                  )}
                  {infinitePayCheckout?.checkout_url && infinitePayCheckout.status === 'LINK_GENERATED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <a href={infinitePayCheckout.checkout_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Link de Pagamento
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Botão de Verificação Manual para Pix e Cartão */}
      {order.payment_status !== 'paid' && ['pix', 'credit_card'].includes(order.payment_method) && (
        <div className="pl-6 pb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerifyPayment}
            disabled={isVerifying}
            className="w-full sm:w-auto"
          >
            {isVerifying ? (
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3 mr-1" />
            )}
            Verificar Status Pagamento
          </Button>
        </div>
      )}

      {/* Customer Notes */}
      {order.customer_notes && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Observações do Cliente
            </h3>
            <p className="pl-6 text-sm text-muted-foreground">{order.customer_notes}</p>
          </div>
        </>
      )}

      {/* Timeline */}
      {order.confirmed_at && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Histórico
            </h3>
            <div className="pl-6 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Criado:</span>
                <span>{format(new Date(order.created_at), 'HH:mm', { locale: ptBR })}</span>
              </div>
              {order.confirmed_at && (
                <div className="flex justify-between">
                  <span>Confirmado:</span>
                  <span>{format(new Date(order.confirmed_at), 'HH:mm', { locale: ptBR })}</span>
                </div>
              )}
              {order.prepared_at && (
                <div className="flex justify-between">
                  <span>Em preparo:</span>
                  <span>{format(new Date(order.prepared_at), 'HH:mm', { locale: ptBR })}</span>
                </div>
              )}
              {order.ready_at && (
                <div className="flex justify-between">
                  <span>Pronto:</span>
                  <span>{format(new Date(order.ready_at), 'HH:mm', { locale: ptBR })}</span>
                </div>
              )}
              {order.delivered_at && (
                <div className="flex justify-between">
                  <span>Entregue:</span>
                  <span>{format(new Date(order.delivered_at), 'HH:mm', { locale: ptBR })}</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
