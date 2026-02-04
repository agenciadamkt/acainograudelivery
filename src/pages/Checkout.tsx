import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateOrder } from '@/hooks/useOrders';
// import { useInfinitePayCheckout } from '@/hooks/useInfinitePayCheckout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Wallet, Clock, X } from 'lucide-react';
import AddressSelector from '@/components/customer/AddressSelector';
import { PaymentForm } from '@/components/customer/PaymentForm';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';
import { FeedbackModal } from '@/components/common/FeedbackModal';
import { isStoreOpen, getTodayHoursString } from '@/utils/businessHours';

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clearCart, calculateDelivery, deliveryFee: cartDeliveryFee } = useCart();
  const createOrder = useCreateOrder();
  // Removed unused hook
  // const { createCheckout, isLoading: isCreatingCheckout } = useInfinitePayCheckout();

  const [orderType, setOrderType] = useState<'delivery' | 'pickup' | 'dine_in'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState('credit_card'); // Default to online
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerId, setCustomerId] = useState<string>();
  const [selectedAddressId, setSelectedAddressId] = useState<string>();
  const [tableNumber, setTableNumber] = useState<string>('');
  const [successModal, setSuccessModal] = useState<{ open: boolean, orderNumber: string, orderId: string, paymentId?: string, paymentType?: string }>({ open: false, orderNumber: '', orderId: '' });
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number>(0);
  const [isCalculatingFee, setIsCalculatingFee] = useState(false);
  const [deliveryAllowed, setDeliveryAllowed] = useState(true);
  const [hasDoneInitialFeeCalc, setHasDoneInitialFeeCalc] = useState(false);

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
          .select('id, delivery_fee, slug, business_hours, mercadopago_public_key')
          .eq('slug', storeSlug)
          .single();
        if (data) setStore(data);
      }
    };
    fetchStore();
  }, []);

  // Calculate delivery fee when address changes - defined before useEffects that use it
  const handleAddressSelect = useCallback(async (addressId: string) => {
    setSelectedAddressId(addressId);

    if (!store?.id || orderType !== 'delivery') return;

    setIsCalculatingFee(true);
    try {
      // Fetch address coordinates
      const { data: address } = await supabase
        .from('customer_addresses')
        .select('latitude, longitude')
        .eq('id', addressId)
        .single();

      if (address?.latitude && address?.longitude) {
        const result = await calculateDelivery(address.latitude, address.longitude, store.id);

        if (result.allowed) {
          setCalculatedDeliveryFee(result.fee);
          setDeliveryAllowed(true);
        } else {
          // Check if there are any delivery areas configured
          const { data: areas } = await supabase
            .from('delivery_areas' as any)
            .select('id')
            .eq('store_id', store.id)
            .eq('active', true)
            .limit(1);

          if (areas && areas.length > 0) {
            // Areas are configured but address is outside all of them
            setDeliveryAllowed(false);
            setCalculatedDeliveryFee(0);
            sonnerToast.error('Endereço fora da área de entrega');
          } else {
            // No areas configured, use store base fee
            setCalculatedDeliveryFee(store?.delivery_fee || 0);
            setDeliveryAllowed(true);
          }
        }
      } else {
        // No coordinates, use store base fee
        setCalculatedDeliveryFee(store?.delivery_fee || 0);
        setDeliveryAllowed(true);
      }
    } catch (error) {
      console.error('Error calculating delivery:', error);
      // Fallback to store base fee on error
      setCalculatedDeliveryFee(store?.delivery_fee || 0);
      setDeliveryAllowed(true);
    } finally {
      setIsCalculatingFee(false);
      setHasDoneInitialFeeCalc(true);
    }
  }, [store?.id, store?.delivery_fee, orderType, calculateDelivery]);

  // Auto-select default address and calculate delivery fee when customer loads
  useEffect(() => {
    const autoSelectDefaultAddress = async () => {
      if (!customerId || selectedAddressId) return;

      const { data: addresses } = await supabase
        .from('customer_addresses')
        .select('id, is_default, latitude, longitude')
        .eq('customer_id', customerId)
        .order('is_default', { ascending: false })
        .limit(1);

      if (addresses && addresses.length > 0) {
        const defaultAddress = addresses[0];
        setSelectedAddressId(defaultAddress.id);

        // Trigger delivery calculation if store is loaded
        if (store?.id && orderType === 'delivery') {
          handleAddressSelect(defaultAddress.id);
        }
      }
    };

    autoSelectDefaultAddress();
  }, [customerId, store?.id, orderType, handleAddressSelect]);

  // Recalculate when order type changes to delivery and address is already selected
  useEffect(() => {
    if (orderType === 'delivery' && selectedAddressId && store?.id && !hasDoneInitialFeeCalc && !isCalculatingFee) {
      handleAddressSelect(selectedAddressId);
      setHasDoneInitialFeeCalc(true);
    }
  }, [orderType, store?.id, selectedAddressId, hasDoneInitialFeeCalc, isCalculatingFee, handleAddressSelect]);

  // Use calculated fee if available, otherwise fallback to store base fee
  const deliveryFee = orderType === 'delivery' ? (calculatedDeliveryFee || store?.delivery_fee || 0) : 0;
  const total = subtotal + deliveryFee;

  // Função para criar o pedido APÓS o pagamento online ser aprovado
  const handleCreateOrderAfterPayment = async (paymentId: string, status: string, paymentType: string) => {
    setIsSubmitting(true);
    try {
      if (!user || !store) throw new Error("Dados de usuário ou loja faltando.");

      // 1. Garantir Customer
      let currentCustomerId = customerId;
      if (!currentCustomerId) {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            user_id: user.id,
            email: user.email,
            name: user.user_metadata?.name || user.email?.split('@')[0] || 'Cliente',
            phone: user.user_metadata?.phone || null
          })
          .select('id')
          .single();
        if (newCustomer) currentCustomerId = newCustomer.id;
      }

      if (!currentCustomerId) throw new Error("Falha ao identificar cliente.");

      // Map MP method to our method
      let dbPaymentMethod = 'credit_card';
      if (paymentType === 'pix') dbPaymentMethod = 'pix';
      if (paymentType !== 'pix' && paymentType !== 'account_money') dbPaymentMethod = 'credit_card';

      // 2. Criar Pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: '', // Generated by trigger
          customer_id: currentCustomerId,
          store_id: store.id,
          order_type: orderType,
          payment_method: dbPaymentMethod,
          payment_status: status === 'approved' ? 'paid' : 'pending',
          mercadopago_payment_id: paymentId, // Usando coluna legada que sabemos que existe
          // payment_id: paymentId, // Futuro: usar coluna padronizada payment_id
          delivery_address_id: orderType === 'delivery' ? selectedAddressId : null,
          table_number: orderType === 'dine_in' ? tableNumber : null,
          subtotal,
          delivery_fee: deliveryFee,
          discount_amount: 0,
          total_amount: total,
          customer_notes: (notes || '') + `\n[Pagamento ID: ${paymentId}]`,
          status: 'pending',
        }])
        .select('id, order_number')
        .single();

      if (orderError) throw orderError;

      // 3. Criar Itens
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

        for (const topping of item.toppings) {
          await supabase.from('order_item_toppings').insert({
            order_item_id: orderItem.id,
            topping_id: topping.id,
            quantity: 1,
            unit_price: topping.price,
          });
        }
      }

      clearCart();
      setSuccessModal({
        open: true,
        orderNumber: order.order_number,
        orderId: order.id,
        paymentId: paymentId, // Pass back to use in modal redirect or cleanup
        paymentType: paymentType
      });

    } catch (error: any) {
      console.error('Erro ao processar pedido pós-pagamento:', error);
      toast({
        title: 'Erro ao salvar pedido',
        description: error.message || 'Erro desconhecido. Tire um print e contate o suporte.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    // Validar horário
    if (store?.business_hours) {
      const isOpen = isStoreOpen(store.business_hours);
      if (!isOpen) {
        const todayHours = getTodayHoursString(store.business_hours);
        sonnerToast.error(`Loja Fechada. Horário hoje: ${todayHours || 'Fechado'}`);
        return;
      }
    }

    if (!user) {
      navigate('/profile');
      return;
    }

    if (items.length === 0) return;

    setIsSubmitting(true);

    try {
      // Safety timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tempo limite excedido. Verifique seus pedidos, pode ser que já tenha sido criado.')), 15000)
      );

      // Buscar ou criar customer (mesma lógica)
      let customerPromise = async () => {
        let { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!customer) {
          const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert({
              user_id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'Cliente',
              phone: user.user_metadata?.phone || null
            })
            .select('id')
            .single();

          if (createError || !newCustomer) {
            throw new Error('Falha ao criar cadastro de cliente.');
          }
          customer = newCustomer;
        }
        return customer;
      };

      const customer = await Promise.race([customerPromise(), timeoutPromise]) as any;
      if (!customer) return;

      // Buscar loja (simplificado pois já temos no state na maioria das vezes)
      if (!store) {
        toast({ title: 'Erro', description: 'Loja não encontrada', variant: 'destructive' });
        return;
      }

      // Criar pedido (Pagamento na Entrega)
      const createOrderPromise = async () => {
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert([{
            order_number: '', // Trigger generates this
            customer_id: customer.id,
            store_id: store.id,
            order_type: orderType,
            payment_method: paymentMethod, // dinheiro, cartao, pix
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
          .select('id, order_number')
          .single();

        if (orderError) throw orderError;

        // Itens
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

          for (const topping of item.toppings) {
            await supabase.from('order_item_toppings').insert({
              order_item_id: orderItem.id,
              topping_id: topping.id,
              quantity: 1,
              unit_price: topping.price,
            });
          }
        }
        return order;
      };

      const order = await Promise.race([createOrderPromise(), timeoutPromise]) as any;

      clearCart();
      setSuccessModal({
        open: true,
        orderNumber: order.order_number,
        orderId: order.id
      });

    } catch (error: any) {
      console.error('Erro:', error);
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
            onSelectAddress={handleAddressSelect}
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
              <RadioGroupItem value="credit_card" id="credit_card" />
              <Label htmlFor="credit_card" className="flex-1 cursor-pointer flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Pagar Online (Cartão / Pix)
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

        {paymentMethod === 'credit_card' && store?.id && (
          <PaymentForm
            amount={total}
            email={user?.email || 'cliente@email.com'}
            storeId={store.id}
            publicKey={store.mercadopago_public_key}
            onSuccess={(paymentId, status, paymentType) => {
              console.log('Payment successful:', paymentId, status);
              // O pedido já é criado no backend quando o pagamento é processado? 
              // Não, o PaymentForm apenas processa o pagamento.
              // Precisamos criar o pedido aqui ou garantir que o fluxo de criação aconteça.

              // Como estamos usando o Brick, o botão de submit do brick disparou o onSubmit interno.
              // Se deu sucesso, precisamos CRIAR O PEDIDO no nosso banco agora.
              // Mas o handleSubmit original criava o pedido E processava o infinitepay.

              // Precisamos de uma função para criar o pedido APÓS o pagamento aprovado.
              // Vamos reaproveitar o handleSubmit mas forçar a criação?
              // Melhor extrair a lógica de criar pedido.

              // HACK: Simular o createOrder aqui com os dados do pagamento?
              // Ou melhor: O usuário preenche tudo, e o PaymentForm só aparece no final?
              // O ideal seria: Criar pedido (Pendente) -> Pagar -> Atualizar pedido (Pago).

              // Dado o código atual do PaymentForm, ele chama /process-payment.
              // Vamos assumir que se o callback onSuccess vier, o pagamento foi feito.
              // Agora criamos o pedido no Supabase com status 'pending' (ou 'paid' se quisermos confiar direto).

              handleCreateOrderAfterPayment(paymentId, status, paymentType);
            }}
            onError={(error) => {
              console.error('Payment error:', error);
            }}
          />
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
            <div className="flex justify-between items-center">
              <span>Taxa de entrega:</span>
              {isCalculatingFee ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Calculando...
                </span>
              ) : orderType === 'delivery' && !deliveryAllowed ? (
                <span className="text-destructive font-medium">Fora da área</span>
              ) : (
                <span className={deliveryFee === 0 ? 'text-green-600 font-medium' : ''}>
                  {deliveryFee === 0 && orderType === 'delivery' ? 'Grátis' : `R$ ${deliveryFee.toFixed(2)}`}
                </span>
              )}
            </div>
          </div>
          <Separator className="my-4" />
          <div className="flex justify-between text-lg font-bold mb-6">
            <span>Total:</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>

          {/* Warning for out of area */}
          {orderType === 'delivery' && !deliveryAllowed && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4 text-sm text-destructive">
              ⚠️ Infelizmente não entregamos neste endereço. Escolha outro endereço ou retire na loja.
            </div>
          )}

          {paymentMethod !== 'credit_card' && (
            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting || isCalculatingFee || (orderType === 'delivery' && !deliveryAllowed)}
            >
              {(isSubmitting) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar Pedido'
              )}
            </Button>
          )}
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
          onClick={() => navigate(`/order-confirmation/${successModal.orderId}`, { state: { paymentId: successModal.paymentId } })}
          className="w-full rounded-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
        >
          {successModal.paymentType === 'pix' ? 'Pagar agora com Pix' : 'Acompanhar Pedido'}
        </Button>
      </FeedbackModal>
    </div>
  );
}
