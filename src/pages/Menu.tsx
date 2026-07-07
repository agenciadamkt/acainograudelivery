import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Menu as MenuIcon, Search, SlidersHorizontal, Heart, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNavigation from "@/components/BottomNavigation";
import { CartDrawer } from "@/components/CartDrawer";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStore } from "@/contexts/StoreContext";
import StoreHeader from "@/components/customer/StoreHeader";

const Menu = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [customerId, setCustomerId] = useState<string>();

  const { data: categories, isLoading: loadingCategories } = useCategories(true, currentStore?.id, { excludePdvOnly: true });
  const { data: products, isLoading: loadingProducts } = useProducts(selectedCategoryId, true, currentStore?.id);
  const { data: favorites } = useFavorites(customerId);
  const toggleFavorite = useToggleFavorite();

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

  const favoriteIds = useMemo(() =>
    favorites?.map(f => f.product_id) || [],
    [favorites]
  );

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product => {
      const matchesSearch = searchQuery
        ? product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesSearch;
    });
  }, [products, searchQuery]);

  const getMinPrice = (product: any) => {
    if (!product.sizes || product.sizes.length === 0) {
      return (product.promotional_price || product.sale_price || 0).toFixed(2);
    }
    const minPrice = Math.min(...product.sizes.map((s: any) => s.price));
    return minPrice.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" className="rounded-full">
            <MenuIcon className="w-6 h-6" />
          </Button>
          <CartDrawer />
        </div>

        {/* Identificação da loja */}
        {currentStore ? (
          <StoreHeader store={currentStore as any} />
        ) : (
          <Card className="mb-6 p-4 bg-card rounded-2xl shadow-card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🍓</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Menu Geral</h1>
                <p className="text-xs text-muted-foreground">Todos os produtos disponíveis</p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex gap-2 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Pesquise seu açaí"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 bg-card border-none rounded-xl shadow-card"
            />
          </div>
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl bg-card border-none shadow-card">
            <SlidersHorizontal className="w-5 h-5" />
          </Button>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Categorias</h2>
          {loadingCategories ? (
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {categories?.map((category) => (
                <div
                  key={category.id}
                  className="text-center cursor-pointer"
                  onClick={() => setSelectedCategoryId(
                    selectedCategoryId === category.id ? undefined : category.id
                  )}
                >
                  <div className={`bg-card rounded-2xl p-3 mb-2 shadow-card aspect-square flex items-center justify-center transition-all ${selectedCategoryId === category.id ? 'ring-2 ring-primary' : ''
                    }`}>
                    <span className="text-4xl">{category.icon || '🍓'}</span>
                  </div>
                  <p className="text-xs leading-tight">{category.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">
              {selectedCategoryId ? 'Produtos' : 'Mais pedidos'}
            </h2>
            {selectedCategoryId && (
              <Button
                variant="link"
                className="text-primary"
                onClick={() => setSelectedCategoryId(undefined)}
              >
                Ver tudo
              </Button>
            )}
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {filteredProducts.map((product) => {
                const isFavorite = favoriteIds.includes(product.id);
                const isNew = product.created_at &&
                  new Date(product.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                return (
                  <Card
                    key={product.id}
                    className="bg-card rounded-2xl overflow-hidden shadow-card cursor-pointer transition-transform hover:scale-105"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    {isNew && (
                      <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-br-lg inline-block">
                        Novidade!
                      </div>
                    )}
                    <div className="relative aspect-square bg-gradient-to-b from-primary/10 to-transparent flex items-center justify-center">
                      {product.base_image_url ? (
                        <img
                          src={product.base_image_url}
                          alt={product.name}
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
                          if (!customerId) {
                            toast.error('Faça login para favoritar');
                            return;
                          }
                          toggleFavorite.mutate({ customerId, productId: product.id });
                        }}
                      >
                        <Heart
                          className={`w-5 h-5 ${isFavorite ? 'fill-primary text-primary' : 'text-primary'}`}
                        />
                      </Button>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold mb-2 line-clamp-2 text-sm">{product.name}</h3>
                      {product.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-bold">
                            A partir de R$ {getMinPrice(product)}
                          </div>
                        </div>
                        <Button
                          size="icon"
                          className="rounded-full bg-primary hover:bg-primary/90 h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/product/${product.id}`);
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="col-span-2 text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery
                  ? 'Nenhum produto encontrado'
                  : 'Nenhum produto cadastrado'}
              </p>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Menu;
