import { forwardRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Order } from '@/hooks/useOrders';
import type { Store } from '@/hooks/useStores';

interface PrintableOrderProps {
  order: Order;
  store: Store;
}

export const PrintableOrder = forwardRef<HTMLDivElement, PrintableOrderProps>(
  ({ order, store }, ref) => {
    useEffect(() => {
      console.log('🖨️ DEBUG PrintableOrder - order:', order);
      console.log('🖨️ DEBUG PrintableOrder - order.items:', order.items);
      console.log('🖨️ DEBUG PrintableOrder - order.customer:', order.customer);
      console.log('🖨️ DEBUG PrintableOrder - store:', store);
      
      if (!order.items || order.items.length === 0) {
        console.error('❌ ERRO: order.items está vazio ou undefined!');
      } else {
        console.log('✅ PrintableOrder: Temos', order.items.length, 'itens para imprimir');
        console.log('✅ Primeiro item:', order.items[0]);
      }
    }, [order, store]);

    const formatCurrency = (value: number) => {
      return `R$ ${value.toFixed(2).replace('.', ',')}`;
    };

    const separator = '='.repeat(48);
    const line = '-'.repeat(48);

    return (
      <div ref={ref} className="printable-content font-mono text-xs leading-tight">
          {/* Cabeçalho */}
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold mb-1">{store.name}</h1>
            {store.address && <p>{store.address}</p>}
            {store.phone && <p>Tel: {store.phone}</p>}
            <p className="mt-2">{separator}</p>
          </div>

          {/* Informações do Pedido */}
          <div className="mb-4">
            <p className="font-bold text-sm">PEDIDO #{order.order_number}</p>
            <p>Data: {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            <p>Status: {order.status === 'confirmed' ? 'CONFIRMADO' : order.status.toUpperCase()}</p>
            <p>{line}</p>
          </div>

          {/* Dados do Cliente */}
          <div className="mb-4">
            <p className="font-bold">CLIENTE:</p>
            <p>{order.customer?.name || 'Cliente'}</p>
            {order.customer?.phone && <p>Tel: {order.customer.phone}</p>}
            
            {order.order_type === 'delivery' && order.delivery_address && (
              <div className="mt-2">
                <p className="font-bold">ENDEREÇO DE ENTREGA:</p>
                <p>
                  {order.delivery_address.street}, {order.delivery_address.number}
                </p>
                {order.delivery_address.complement && (
                  <p>{order.delivery_address.complement}</p>
                )}
                <p>
                  {order.delivery_address.neighborhood} - {order.delivery_address.city}/{order.delivery_address.state}
                </p>
                <p>CEP: {order.delivery_address.zipcode}</p>
              </div>
            )}
            
            {order.order_type === 'dine_in' && order.table_number && (
              <p className="mt-2">MESA: {order.table_number}</p>
            )}
            
            <p>{line}</p>
          </div>

          {/* Itens do Pedido */}
          <div className="mb-4">
            <p className="font-bold mb-2">ITENS:</p>
            {!order.items || order.items.length === 0 ? (
              <p className="text-center">⚠️ Nenhum item encontrado</p>
            ) : (
              order.items.map((item, index) => (
              <div key={index} className="mb-3">
                <div className="flex justify-between">
                  <span>
                    {item.quantity}x {item.product?.name || 'Produto'}
                  </span>
                  <span>{formatCurrency(Number(item.subtotal))}</span>
                </div>
                
                {item.product_size && (
                  <p className="ml-4 text-muted-foreground">Tamanho: {item.product_size.name}</p>
                )}
                
                {item.toppings && item.toppings.length > 0 && (
                  <div className="ml-4">
                    <p className="text-muted-foreground">Adicionais:</p>
                    {item.toppings.map((topping, tIndex) => (
                      <p key={tIndex} className="ml-2">
                        + {topping.topping?.name || 'Adicional'}
                        {topping.unit_price > 0 && ` (${formatCurrency(Number(topping.unit_price))})`}
                      </p>
                    ))}
                  </div>
                )}
                
                {item.notes && (
                  <p className="ml-4 text-muted-foreground italic">Obs: {item.notes}</p>
                )}
              </div>
              ))
            )}
            <p>{line}</p>
          </div>

          {/* Totais */}
          <div className="mb-4">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(Number(order.subtotal))}</span>
            </div>
            
            {order.delivery_fee > 0 && (
              <div className="flex justify-between">
                <span>Taxa de Entrega:</span>
                <span>{formatCurrency(Number(order.delivery_fee))}</span>
              </div>
            )}
            
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-success">
                <span>Desconto:</span>
                <span>-{formatCurrency(Number(order.discount_amount))}</span>
              </div>
            )}
            
            <p className="my-2">{line}</p>
            
            <div className="flex justify-between text-lg font-bold">
              <span>TOTAL:</span>
              <span>{formatCurrency(Number(order.total_amount))}</span>
            </div>
          </div>

          {/* Pagamento */}
          <div className="mb-4">
            <p>{line}</p>
            <p className="font-bold">FORMA DE PAGAMENTO:</p>
            <p className="uppercase">
              {order.payment_method === 'credit_card' && 'Cartão de Crédito'}
              {order.payment_method === 'debit_card' && 'Cartão de Débito'}
              {order.payment_method === 'pix' && 'PIX'}
              {order.payment_method === 'cash' && 'Dinheiro'}
            </p>
            <p>Status: {order.payment_status === 'paid' ? 'PAGO' : 'PENDENTE'}</p>
          </div>

          {/* Observações */}
          {order.customer_notes && (
            <div className="mb-4">
              <p>{line}</p>
              <p className="font-bold">OBSERVAÇÕES:</p>
              <p className="whitespace-pre-wrap">{order.customer_notes}</p>
            </div>
          )}

          {/* Rodapé */}
          <div className="text-center mt-6">
            <p>{separator}</p>
            <p className="mt-2 font-bold">Obrigado pela preferência!</p>
            <p>Açaí no Grau</p>
          </div>
      </div>
    );
  }
);

PrintableOrder.displayName = 'PrintableOrder';
