import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, Clock, ExternalLink, ArrowLeft, RefreshCw } from 'lucide-react';
import { useInfinitePayCheckout, useCheckoutByOrderNsu } from '@/hooks/useInfinitePayCheckout';
import { toast } from 'sonner';

export default function InfinitePaySuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkPayment, isLoading } = useInfinitePayCheckout();
  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'paid' | 'pending' | 'error'>('checking');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  // Get params from URL (sent by InfinitePay redirect)
  const receipt_url = searchParams.get('receipt_url');
  const order_nsu = searchParams.get('order_nsu');
  const slug = searchParams.get('slug');
  const capture_method = searchParams.get('capture_method');
  const transaction_nsu = searchParams.get('transaction_nsu');

  // Query local checkout status
  const { data: checkout, refetch: refetchCheckout } = useCheckoutByOrderNsu(order_nsu || undefined);

  useEffect(() => {
    // If we already have a PAID checkout locally, show success immediately
    if (checkout?.status === 'PAID') {
      setPaymentStatus('paid');
      setPaymentDetails({
        receipt_url: checkout.receipt_url || receipt_url,
        order_nsu: checkout.order_nsu,
        transaction_nsu: checkout.transaction_nsu || transaction_nsu,
        capture_method: checkout.capture_method || capture_method,
        paid_amount: checkout.paid_amount,
        installments: checkout.installments,
      });
      return;
    }

    // Otherwise, check payment status via API
    if (order_nsu) {
      handleCheckPayment();
    } else {
      setPaymentStatus('error');
    }
  }, [checkout?.status]);

  const handleCheckPayment = async () => {
    if (!order_nsu) {
      toast.error('Parâmetros de pagamento não encontrados');
      setPaymentStatus('error');
      return;
    }

    setPaymentStatus('checking');

    try {
      const result = await checkPayment({
        order_nsu,
        slug: slug || undefined,
        transaction_nsu: transaction_nsu || undefined,
      });

      if (result.paid) {
        setPaymentStatus('paid');
        setPaymentDetails({
          receipt_url: result.receipt_url || receipt_url,
          order_nsu: result.order_nsu,
          transaction_nsu: result.transaction_nsu,
          capture_method: result.capture_method || capture_method,
          paid_amount: result.paid_amount,
          installments: result.installments,
        });
        toast.success('Pagamento confirmado!');
      } else {
        setPaymentStatus('pending');
        setPaymentDetails({
          order_nsu: result.order_nsu,
          status: result.status,
        });
      }

      // Refetch local checkout data
      refetchCheckout();

    } catch (error: any) {
      console.error('Error checking payment:', error);
      // Don't show error, might be timing issue - check local status
      if (checkout?.status === 'PAID') {
        setPaymentStatus('paid');
      } else {
        setPaymentStatus('pending');
      }
    }
  };

  const handleGoToOrders = () => {
    navigate('/orders');
  };

  const formatAmount = (cents: number | undefined) => {
    if (!cents) return '';
    return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        {paymentStatus === 'checking' && (
          <div className="flex flex-col items-center text-center space-y-4">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
            <h1 className="text-xl font-semibold">Processando pagamento...</h1>
            <p className="text-muted-foreground">
              Aguarde enquanto verificamos o status do seu pagamento.
            </p>
          </div>
        )}

        {paymentStatus === 'paid' && (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-green-100 p-4">
              <CheckCircle2 className="h-16 w-16 text-green-600" />
            </div>
            <h1 className="text-xl font-semibold text-green-600">Pagamento Confirmado!</h1>
            <p className="text-muted-foreground">
              Seu pagamento foi processado com sucesso.
            </p>

            {paymentDetails && (
              <div className="w-full text-left bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                {paymentDetails.paid_amount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor pago:</span>
                    <span className="font-medium">{formatAmount(paymentDetails.paid_amount)}</span>
                  </div>
                )}
                {paymentDetails.capture_method && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Método:</span>
                    <span className="font-medium capitalize">
                      {paymentDetails.capture_method === 'pix' ? 'PIX' : 
                       paymentDetails.capture_method === 'credit_card' ? 'Cartão de Crédito' :
                       paymentDetails.capture_method}
                    </span>
                  </div>
                )}
                {paymentDetails.installments && paymentDetails.installments > 1 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Parcelas:</span>
                    <span className="font-medium">{paymentDetails.installments}x</span>
                  </div>
                )}
                {paymentDetails.transaction_nsu && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NSU:</span>
                    <span className="font-mono text-xs">{paymentDetails.transaction_nsu}</span>
                  </div>
                )}
              </div>
            )}

            <div className="w-full space-y-2 pt-4">
              {paymentDetails?.receipt_url && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(paymentDetails.receipt_url, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver Comprovante
                </Button>
              )}
              <Button className="w-full" onClick={handleGoToOrders}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ver Meus Pedidos
              </Button>
            </div>
          </div>
        )}

        {paymentStatus === 'pending' && (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-yellow-100 p-4">
              <Clock className="h-16 w-16 text-yellow-600" />
            </div>
            <h1 className="text-xl font-semibold text-yellow-600">Pagamento Pendente</h1>
            <p className="text-muted-foreground">
              Seu pagamento ainda não foi confirmado. Isso pode levar alguns instantes.
            </p>

            <div className="w-full space-y-2 pt-4">
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleCheckPayment}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Atualizar Status
              </Button>
              <Button className="w-full" onClick={handleGoToOrders}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ver Meus Pedidos
              </Button>
            </div>
          </div>
        )}

        {paymentStatus === 'error' && (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-red-100 p-4">
              <Clock className="h-16 w-16 text-red-600" />
            </div>
            <h1 className="text-xl font-semibold text-red-600">Erro ao Verificar Pagamento</h1>
            <p className="text-muted-foreground">
              Não foi possível verificar o status do seu pagamento. Por favor, verifique seus pedidos.
            </p>

            <div className="w-full space-y-2 pt-4">
              <Button className="w-full" onClick={handleGoToOrders}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ver Meus Pedidos
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
