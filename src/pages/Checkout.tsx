import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateOrder } from '@/hooks/useOrders';
import { useInfinitePayCheckout } from '@/hooks/useInfinitePayCheckout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Wallet } from 'lucide-react';
import AddressSelector from '@/components/customer/AddressSelector';
import { PaymentForm } from '@/components/customer/PaymentForm';
import { toast } from '@/hooks/use-toast';
import { FeedbackModal } from '@/components/common/FeedbackModal';
import { isStoreOpen, getTodayHoursString } from '@/utils/businessHours';

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const createOrder = useCreateOrder();
  const { createCheckout, isLoading: isCreatingCheckout } = useInfinitePayCheckout();

  const [orderType, setOrderType] = useState<'delivery' | 'pickup' | 'dine_in'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState('dinheiro');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState<string>();
  const [selectedAddressId, setSelectedAddressId] = useState<string>();
  const [tableNumber, setTableNumber] = useState<string>('');
  const [successModal, setSuccessModal] = useState<{ open: boolean, orderNumber: string, orderId: string }>({ open: false, orderNumber: '', orderId: '' });

  const [store, setStore] = useState<any>(null);

  useEffect(() => {
    if (user) {
      supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => setCustomerId(data?.id));
    }
  }, [user]);

  useEffect(() => {
    const fetchStore = async () => {
      const storeSlug = localStorage.getItem('last-visited-store');
      if (storeSlug) {
        const { data } = await supabase
          .from('stores')
          .select('id, delivery_fee, slug, business_hours')
          .eq('slug', storeSlug)
          .single();
        if (data) setStore(data);
      }
    };
    fetchStore();
  }, []);

  const deliveryFee = orderType === 'delivery' ? (store?.delivery_fee || 0) : 0;
  const total = subtotal + deliveryFee;

  const handleSubmit = async () => {
    // Validar horário de funcionamento
    if (store?.business_hours) {
      const isOpen = isStoreOpen(store.business_hours);
      if (!isOpen) {
        const todayHours = getTodayHoursString(store.business_hours);
        toast({
          title: 'Loja Fechada',
          description: `Não é possível realizar pedidos no momento. Horário de hoje: ${todayHours || 'Fechado'}.`,
          variant: 'destructive',
        });
        return;
      }
    }

    if (!user) {
      toast({
        title: 'Faça login',
        description: 'Você precisa estar logado para fazer um pedido',
        variant: 'destructive',
      });
      navigate('/profile');
      return;
    }

    if (items.length === 0) {
      toast({
        title: 'Carrinho vazio',
        description: 'Adicione items ao carrinho antes de finalizar',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Buscar ou criar customer
      let { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!customer) {
        // Tenta criar o perfil de cliente automaticamente se não existir
        // Isso é comum para contas Admins que estão tentando fazer pedido
        console.log("Perfil de cliente ausente. Tentando criar automaticamente...");

        const { data: newCustomer, error: createError } = await supabase
          .from('customers')
          .insert({
            user_id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente',
            phone: user.user_metadata?.phone || null // Se falhar por falta de telefone, o catch abaixo trata
          })
          .select('id')
          .single();

        if (createError || !newCustomer) {
          console.error("Falha ao criar perfil de cliente:", createError);
          toast({
            title: 'Cadastro incompleto',
            description: 'Precisamos de mais alguns dados seus (como telefone) para finalizar o pedido.',
            variant: 'default', // Mudado para default/info para ser menos agressivo
          });
          navigate('/profile'); // Redireciona para completar o cadastro
          setIsSubmitting(false);
          return;
        }

        customer = newCustomer;

        // Toast amigável avisando que criamos o perfil
        toast({
          title: 'Perfil criado!',
          description: 'Seu perfil de cliente foi configurado automaticamente.',
        });
      }

      // Buscar loja pela slug armazenada no localStorage (ou usar do state)
      const storeSlug = localStorage.getItem('last-visited-store');

      if (!storeSlug && !store) {
        toast({
          title: 'Erro',
          description: 'Loja não identificada. Por favor, acesse a loja novamente.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Se já temos a loja no state, usamos ela. Caso contrário (improvável), buscamos.
      let currentStoreId = store?.id;
      if (!currentStoreId && storeSlug) {
        const { data: fetchedStore } = await supabase
          .from('stores')
          .select('id')
          .eq('slug', storeSlug)
          .eq('active', true)
          .maybeSingle();

        if (fetchedStore) currentStoreId = fetchedStore.id;
      }

      if (!currentStoreId) {
        toast({
          title: 'Erro',
          description: 'Loja não encontrada ou inativa',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      // Criar pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: '', // Será gerado pelo trigger
          customer_id: customer.id,
          store_id: currentStoreId,
          order_type: orderType,
          payment_method: paymentMethod === 'infinitepay' ? 'credit_card' : paymentMethod,
          payment_status: 'pending',
          delivery_address_id: orderType === 'delivery' ? selectedAddressId : null,
          table_number: orderType === 'dine_in' ? tableNumber : null,
          subtotal,
          delivery_fee: deliveryFee,
          discount_amount: 0,
          total_amount: total,
          customer_notes: notes || null,
          status: 'pending',
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      // Criar order items
      for (const item of items) {
        const { data: orderItem, error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: item.product_id,
            product_size_id: item.size_id,
            quantity: item.quantity,
            unit_price: item.size_price,
            subtotal: item.subtotal,
            notes: item.notes || null,
          })
          .select()
          .single();

        if (itemError) throw itemError;

        // Criar toppings do item
        for (const topping of item.toppings) {
          await supabase.from('order_item_toppings').insert({
            order_item_id: orderItem.id,
            topping_id: topping.id,
            quantity: 1,
            unit_price: topping.price,
          });
        }
      }

      // Se pagamento é InfinitePay, criar checkout e redirecionar
      if (paymentMethod === 'infinitepay') {
        try {
          const checkoutResult = await createCheckout(order.id);

          if (checkoutResult.success && checkoutResult.checkoutUrl) {
            // Limpar carrinho antes de redirecionar
            clearCart();

            toast({
              title: 'Redirecionando...',
              description: 'Você será redirecionado para a página de pagamento.',
            });

            // Redirecionar para InfinitePay
            window.location.href = checkoutResult.checkoutUrl;
            return;
          } else {
            throw new Error('Não foi possível criar o link de pagamento');
          }
        } catch (checkoutError: any) {
          console.error('Erro ao criar checkout InfinitePay:', checkoutError);
          toast({
            title: 'Erro no pagamento',
            description: checkoutError.message || 'Erro ao processar pagamento. Tente novamente.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Limpar carrinho (para outros métodos de pagamento)
      clearCart();

      setSuccessModal({
        open: true,
        orderNumber: order.order_number,
        orderId: order.id
      });
    } catch (error: any) {
      console.error('Erro ao criar pedido:', error);
      toast({
        title: 'Erro ao criar pedido',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background border-b safe-area-top" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Finalizar Pedido</h1>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Tipo de Pedido */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Tipo de Pedido</h3>
          <RadioGroup value={orderType} onValueChange={(v: any) => setOrderType(v)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="delivery" id="delivery" />
              <Label htmlFor="delivery" className="flex-1 cursor-pointer">
                🛵 Delivery
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pickup" id="pickup" />
              <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                🏃 Retirar na Loja
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dine_in" id="dine_in" />
              <Label htmlFor="dine_in" className="flex-1 cursor-pointer">
                🍽️ Consumir no Local
              </Label>
            </div>
          </RadioGroup>
        </Card>

        {/* Address Selection for Delivery */}
        {orderType === 'delivery' && customerId && (
          <AddressSelector
            customerId={customerId}
            selectedAddressId={selectedAddressId}
            onSelectAddress={setSelectedAddressId}
          />
        )}

        {/* Table Number for Dine In */}
        {orderType === 'dine_in' && (
          <Card className="p-6">
            <h3 className="font-bold text-lg mb-4">Número da Mesa</h3>
            <Input
              type="text"
              placeholder="Ex: 15"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="max-w-xs"
            />
          </Card>
        )}

        {/* Forma de Pagamento */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Forma de Pagamento</h3>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="infinitepay" id="infinitepay" />
              <Label htmlFor="infinitepay" className="flex-1 cursor-pointer flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Pagar Online (Cartão/PIX)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="credit_card" id="credit_card" />
              <Label htmlFor="credit_card" className="flex-1 cursor-pointer">
                💳 Cartão de Crédito (MercadoPago)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dinheiro" id="dinheiro" />
              <Label htmlFor="dinheiro" className="flex-1 cursor-pointer">
                💵 Dinheiro na Entrega
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cartao" id="cartao" />
              <Label htmlFor="cartao" className="flex-1 cursor-pointer">
                💳 Cartão na Entrega
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pix" id="pix" />
              <Label htmlFor="pix" className="flex-1 cursor-pointer">
                📱 PIX na Entrega
              </Label>
            </div>
          </RadioGroup>
        </Card>

        {/* Payment Form for Credit Card (MercadoPago) */}
        {paymentMethod === 'credit_card' && user?.email && (
          <PaymentForm
            amount={total}
            email={user.email}
            onSuccess={(paymentId, status) => {
              console.log('Payment successful:', paymentId, status);
              // Create order with payment info
            }}
            onError={(error) => {
              console.error('Payment error:', error);
            }}
          />
        )}

        {/* InfinitePay Info */}
        {paymentMethod === 'infinitepay' && (
          <Card className="p-6 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <Wallet className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-primary">Pagamento Seguro</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Ao confirmar, você será redirecionado para a página de pagamento seguro da InfinitePay,
                  onde poderá pagar com cartão de crédito ou PIX.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Observações */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Observações (Opcional)</h3>
          <Textarea
            placeholder="Ex: Sem cebola, bater bem batido..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </Card>

        {/* Resumo */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Resumo do Pedido</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Subtotal ({items.length} itens):</span>
              <span>R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa de entrega:</span>
              <span>R$ {deliveryFee.toFixed(2)}</span>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between text-lg font-bold mb-6">
            <span>Total:</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting || isCreatingCheckout}
          >
            {(isSubmitting || isCreatingCheckout) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {paymentMethod === 'infinitepay' ? 'Gerando link de pagamento...' : 'Processando...'}
              </>
            ) : paymentMethod === 'infinitepay' ? (
              'Pagar com InfinitePay'
            ) : (
              'Confirmar Pedido'
            )}
          </Button>
        </Card>
      </div>

      <FeedbackModal
        isOpen={successModal.open}
        onOpenChange={(open) => {
          if (!open && successModal.orderId) {
            navigate(`/order-confirmation/${successModal.orderId}`);
          }
          setSuccessModal(prev => ({ ...prev, open }));
        }}
        title={<>Pedido realizado!<div className="text-base font-normal mt-2 text-muted-foreground">Seu pedido <span className="font-bold text-foreground">#{successModal.orderNumber}</span> foi enviado</div></>}
      >
        <Button
          onClick={() => navigate(`/order-confirmation/${successModal.orderId}`)}
          className="w-full rounded-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
        >
          Acompanhar Pedido
        </Button>
      </FeedbackModal>
    </div>
  );
}
