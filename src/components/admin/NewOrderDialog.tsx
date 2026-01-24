import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, MapPin, User, DollarSign } from 'lucide-react';
import motoIllustration from '@/assets/moto.png';

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  customer_notes?: string;
  items?: Array<{
    product?: { name: string };
    product_size?: { name: string };
    quantity: number;
    unit_price: number;
  }>;
  customer?: {
    name: string;
  };
  delivery_address?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

interface NewOrderDialogProps {
  order: Order | null;
  isOpen: boolean;
  onAccept: () => void;
  onClose: () => void;
}

export function NewOrderDialog({ order, isOpen, onAccept, onClose }: NewOrderDialogProps) {
  if (!order) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatAddress = () => {
    if (!order.delivery_address) return 'Retirada no local';
    const { street, number, neighborhood, city, state } = order.delivery_address;
    return `${street}, ${number} - ${neighborhood}, ${city}/${state}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-auto p-0 overflow-hidden animate-scale-in">
        <div className="bg-gradient-to-br from-background to-muted flex flex-col">
          {/* Header - Fixo no topo */}
          <div className="flex items-center gap-3 px-8 py-6 bg-green-500/10 border-b-4 border-green-500 flex-shrink-0">
            <CheckCircle2 className="w-12 h-12 text-green-500 animate-pulse" />
            <h2 className="text-3xl font-bold text-foreground">Aceitar pedido!</h2>
          </div>

          {/* Content - Com scroll */}
          <div className="grid md:grid-cols-2 gap-8 p-8 overflow-y-auto max-h-[60vh]">
            {/* Left: Illustration + Items + Notes */}
            <div className="flex flex-col gap-6 animate-fade-in">
              {/* Imagem da Moto - REDUZIDA */}
              <div className="flex items-center justify-center">
                <img 
                  src={motoIllustration} 
                  alt="Delivery" 
                  className="w-full max-w-[200px] animate-[float_3s_ease-in-out_infinite]"
                />
              </div>

              {/* Itens do Pedido */}
              <div className="bg-card p-4 rounded-lg border shadow-sm">
                <h3 className="text-lg font-bold mb-3">Itens do Pedido</h3>
                {order.items && order.items.length > 0 ? (
                  <div className="space-y-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="text-sm">
                        <p className="font-semibold">{item.product?.name || 'Produto'}</p>
                        <p className="text-muted-foreground">
                          {item.product_size?.name} {item.quantity}x {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum item</p>
                )}
              </div>

              {/* Observações do Cliente */}
              {order.customer_notes && (
                <div className="bg-card p-4 rounded-lg border shadow-sm">
                  <h3 className="text-lg font-bold mb-2">Observações do Cliente</h3>
                  <p className="text-sm">{order.customer_notes}</p>
                </div>
              )}
            </div>

            {/* Right: Order Details */}
            <div className="space-y-6 animate-fade-in">
              {/* Order Number */}
              <div className="bg-card p-4 rounded-lg border-2 border-primary/20 shadow-lg">
                <p className="text-sm text-muted-foreground mb-1">Pedido</p>
                <p className="text-2xl font-bold text-primary">#{order.order_number}</p>
              </div>

              {/* Customer Name */}
              {order.customer && (
                <div className="flex items-center gap-3 p-4 bg-card rounded-lg border shadow-sm">
                  <User className="w-6 h-6 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="text-lg font-semibold">{order.customer.name}</p>
                  </div>
                </div>
              )}

              {/* Total Value */}
              <div className="flex items-center gap-3 p-4 bg-card rounded-lg border shadow-sm">
                <DollarSign className="w-6 h-6 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(order.total_amount)}</p>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-start gap-3 p-4 bg-card rounded-lg border shadow-sm">
                <MapPin className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Endereço de Entrega</p>
                  <p className="text-sm font-medium">{formatAddress()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Fixo no rodapé */}
          <div className="px-8 pb-8 pt-4 border-t flex-shrink-0">
            <Button
              onClick={onAccept}
              className="w-full h-16 text-2xl font-bold bg-red-500 hover:bg-red-600 text-white shadow-xl animate-pulse-border"
            >
              Aceitar!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Floating animation
const style = document.createElement('style');
style.textContent = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
`;
document.head.appendChild(style);
