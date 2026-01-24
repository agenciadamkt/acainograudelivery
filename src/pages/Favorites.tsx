import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import BottomNavigation from '@/components/BottomNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useFavorites, useToggleFavorite } from '@/hooks/useFavorites';
import { supabase } from '@/integrations/supabase/client';

const Favorites = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getStoreAwareRoute } = useCart();
  const [customerId, setCustomerId] = useState<string>();

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

  const { data: favorites, isLoading } = useFavorites(customerId);
  const toggleFavorite = useToggleFavorite();

  const getMinPrice = (product: any) => {
    if (!product.sizes || product.sizes.length === 0) return '0.00';
    const minPrice = Math.min(...product.sizes.map((s: any) => s.price));
    return minPrice.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-8">Favoritos</h1>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : favorites && favorites.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {favorites.map((favorite) => (
              <Card 
                key={favorite.id}
                className="bg-card rounded-2xl overflow-hidden shadow-card cursor-pointer transition-transform hover:scale-105"
                onClick={() => navigate(`/product/${favorite.product.id}`)}
              >
                <div className="relative aspect-square bg-gradient-to-b from-primary/10 to-transparent flex items-center justify-center">
                  {favorite.product.base_image_url ? (
                    <img 
                      src={favorite.product.base_image_url} 
                      alt={favorite.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl">🍓</span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 rounded-full bg-white/80 hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite.mutate({ 
                        customerId: customerId!, 
                        productId: favorite.product.id 
                      });
                    }}
                  >
                    <Heart className="w-5 h-5 fill-primary text-primary" />
                  </Button>
                </div>
                <div className="p-4">
                  <h3 className="font-bold mb-2 line-clamp-2 text-sm">
                    {favorite.product.name}
                  </h3>
                  {favorite.product.description && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                      {favorite.product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold">
                      A partir de R$ {getMinPrice(favorite.product)}
                    </div>
                    <Button 
                      size="icon" 
                      className="rounded-full bg-primary hover:bg-primary/90 h-8 w-8"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Heart className="w-20 h-20 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Você ainda não tem favoritos</p>
            <Button onClick={() => navigate(getStoreAwareRoute())}>
              Explorar Produtos
            </Button>
          </div>
        )}
      </div>
      <BottomNavigation />
    </div>
  );
};

export default Favorites;
