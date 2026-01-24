import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Minus, Plus, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';

export function CartDrawer() {
  const { items, itemCount, subtotal, updateQuantity, removeItem, getStoreAwareRoute } = useCart();
  const navigate = useNavigate();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="w-5 h-5" />
          {itemCount > 0 && (
            <Badge className="absolute -top-2 -right-2 px-2 py-0.5 text-xs">
              {itemCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Meu Carrinho ({itemCount})</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Seu carrinho está vazio</p>
              <Button className="mt-4" onClick={() => navigate(getStoreAwareRoute())}>
                Ver Cardápio
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 bg-muted rounded-lg">
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt={item.product_name}
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.size_name}
                            {item.size_ml && ` (${item.size_ml}ml)`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      {item.toppings.length > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          + {item.toppings.map((t) => t.name).join(', ')}
                        </div>
                      )}

                      {item.notes && (
                        <p className="mt-1 text-xs text-muted-foreground italic">
                          Obs: {item.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-sm font-bold">
                          R$ {item.subtotal.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Subtotal:</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button className="w-full" onClick={() => navigate('/cart')}>
                  Ver Carrinho Completo
                </Button>
                <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>
                  Continuar Comprando
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
