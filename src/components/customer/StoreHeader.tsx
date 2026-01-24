import { MapPin, Clock, Phone } from "lucide-react";
import { Card } from "@/components/ui/card";

import { Store } from "@/hooks/useStores";

interface StoreHeaderProps {
  store: Store;
}

const StoreHeader = ({ store }: StoreHeaderProps) => {
  return (
    <Card className="mb-6 p-6 bg-card rounded-2xl shadow-card">
      <div className="flex items-start gap-4">
        {store.logo_url ? (
          <img 
            src={store.logo_url} 
            alt={store.name}
            className="w-20 h-20 object-cover rounded-xl"
          />
        ) : (
          <div className="w-20 h-20 bg-primary/10 rounded-xl flex items-center justify-center">
            <span className="text-4xl">🍓</span>
          </div>
        )}
        
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">{store.name}</h1>
          
          {(store.address || store.city) && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {store.address && `${store.address}, `}
                {store.city && store.state && `${store.city} - ${store.state}`}
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" />
              <span className="font-medium">40-60 min</span>
            </div>
            
            {store.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-primary" />
                <span className="font-medium">{store.phone}</span>
              </div>
            )}
          </div>
          
          {(store.delivery_fee !== null || store.min_order_value !== null) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              {store.delivery_fee !== null && (
                <span>
                  Taxa de entrega: {store.delivery_fee === 0 ? 'Grátis' : `R$ ${store.delivery_fee.toFixed(2)}`}
                </span>
              )}
              {store.min_order_value !== null && store.min_order_value > 0 && (
                <span>
                  Pedido mínimo: R$ {store.min_order_value.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default StoreHeader;
