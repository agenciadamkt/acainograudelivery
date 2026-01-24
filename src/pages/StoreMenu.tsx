import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Search, Heart, Plus, ArrowLeft, MapPin, Bell, Star, Clock, Phone, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNavigation from "@/components/BottomNavigation";
import { CartDrawer } from "@/components/CartDrawer";
import { useStoreBySlug } from "@/hooks/useStores";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useFavorites, useToggleFavorite } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import acaiBanner from "@/assets/logo-acai.png"; // Fallback or use generated if available

const StoreMenu = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [customerId, setCustomerId] = useState<string>();

  const { data: store, isLoading: loadingStore, error: storeError } = useStoreBySlug(slug);
  const { data: categories, isLoading: loadingCategories } = useCategories(true, store?.id);
  const { data: allProducts, isLoading: loadingProducts } = useProducts(selectedCategoryId, true);
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

  // Filter products by store
  const storeProducts = useMemo(() => {
    if (!allProducts || !store || !categories) return [];

    // Get category IDs that belong to this store
    const storeCategoryIds = categories.map(cat => cat.id);

    // Filter products by store categories
    return allProducts.filter(product =>
      storeCategoryIds.includes(product.category_id)
    );
  }, [allProducts, store, categories]);

  const filteredProducts = useMemo(() => {
    if (!storeProducts) return [];
    return storeProducts.filter(product => {
      const matchesSearch = searchQuery
        ? product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesSearch;
    });
  }, [storeProducts, searchQuery]);

  const getMinPrice = (product: any) => {
    if (!product.sizes || product.sizes.length === 0) return '0.00';
    const minPrice = Math.min(...product.sizes.map((s: any) => s.price));
    return minPrice.toFixed(2);
  };

  if (loadingStore) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-8 w-48 mx-auto mb-4" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (storeError || !store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loja não encontrada</h1>
          <p className="text-muted-foreground mb-6">
            A loja que você está procurando não existe ou está inativa.
          </p>
          <Button onClick={() => navigate('/')}>
            Voltar para início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">
      {/* Search and Cart Header */}
      <div className="px-6 pt-8 pb-2 flex items-center justify-between sticky top-0 bg-[#FDFDFD]/80 backdrop-blur-md z-40">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full bg-white shadow-sm border border-gray-100 h-10 w-10">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="bg-white shadow-sm border border-gray-100 rounded-full h-10 w-10">
            <Search className="w-5 h-5 text-gray-500" />
          </Button>
          <CartDrawer />
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* Premium Store Header Section */}
        {/* Premium Store Header Section */}
        <div className="space-y-6 pt-2">
          {/* Top Info Row */}
          <div className="flex items-start justify-between relative px-2">
            <div className="space-y-1 pr-20">
              <h1 className="text-2xl font-black text-[#2D2D2D] tracking-tight leading-none">{store.name}</h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1 bg-orange-50 px-1.5 py-0.5 rounded-md">
                  <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                  <span className="text-[#2D2D2D] font-bold">4.9</span>
                </span>
                <span>•</span>
                <span>Açaí & Gelados</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {store.city}
                </span>
              </div>
            </div>

            {/* Floating Logo - Top Right */}
            <div className="absolute right-0 top-0">
              {store.logo_url ? (
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white shrink-0 flex items-center justify-center">
                  <img src={store.logo_url} alt={store.name} className="w-[90%] h-[90%] object-contain mix-blend-multiply" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/5 border-4 border-white flex items-center justify-center shrink-0 shadow-lg">
                  <span className="text-3xl">🍦</span>
                </div>
              )}
            </div>
          </div>

          {/* Info Chips Row */}
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100 shrink-0">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-gray-700">
                {store.preparation_time && store.delivery_time // Usando campos que talvez não existam, mas mantendo compatibilidade
                  ? `${store.preparation_time}-${store.delivery_time} min`
                  : '30-40 min'}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100 shrink-0">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-gray-700">
                {store.delivery_fee && store.delivery_fee > 0 ? `R$ ${store.delivery_fee.toFixed(2)}` : 'R$ 10.00'}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-100 shrink-0">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-gray-700">
                Mínimo <span className="text-black">R$ {store.min_order_value?.toFixed(2) || '15.00'}</span>
              </span>
            </div>
          </div>

          {/* Big Banner Section */}
          <div className="w-full aspect-[21/9] rounded-[24px] overflow-hidden shadow-lg relative bg-gray-100 mt-4">
            {(store as any).banner_url ? (
              <img
                src={(store as any).banner_url}
                alt="Store Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              // Fallback Banner Default (Imagem 2 que o user mandou)
              <img
                src="/banner-loja-padrao.png"
                alt="Store Banner Default"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback se a imagem não carregar
                  e.currentTarget.src = "https://images.unsplash.com/photo-1594911772125-07cf7a2d8d9f?q=80&w=2670&auto=format&fit=crop";
                }}
              />
            )}
          </div>
        </div>

        {/* Categories Pills */}
        <div className="relative">
          <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
            <button
              onClick={() => setSelectedCategoryId(undefined)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap shadow-sm border ${!selectedCategoryId
                ? 'bg-primary text-white border-primary shadow-primary/20'
                : 'bg-white text-muted-foreground border-gray-100'
                }`}
            >
              Todos
            </button>
            {categories
              ?.filter(cat => cat.store_id === store.id)
              .map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap shadow-sm border flex items-center gap-2 ${selectedCategoryId === category.id
                    ? 'bg-primary text-white border-primary shadow-primary/20 scale-105'
                    : 'bg-white text-muted-foreground border-gray-100 opacity-80'
                    }`}
                >
                  <span className="text-lg">{category.icon || '🍓'}</span>
                  {category.name}
                </button>
              ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="pb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-extrabold text-[#2D2D2D]">
              {selectedCategoryId ? 'Produtos' : 'Mais Pedidos'}
            </h2>
            <Button variant="ghost" className="text-primary font-bold text-xs p-0 h-auto hover:bg-transparent hover:text-primary/80">Ver Todos</Button>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 gap-5">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-64 rounded-[28px] bg-gray-100" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-5">
              {filteredProducts.map((product) => {
                const isFavorite = favoriteIds.includes(product.id);
                const isNew = product.created_at &&
                  new Date(product.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                return (
                  <div
                    key={product.id}
                    className="group relative cursor-pointer"
                    onClick={() => navigate(`/product/${product.id}`)}
                  >
                    <div className="aspect-[4/5] rounded-[28px] overflow-hidden bg-gray-50 relative shadow-md shadow-gray-200/50">
                      {product.base_image_url ? (
                        <img
                          src={product.base_image_url}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                          <span className="text-6xl grayscale opacity-20">🍓</span>
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute top-3 right-3 rounded-full h-8 w-8 shadow-sm backdrop-blur-md transition-all ${isFavorite ? 'bg-white text-red-500' : 'bg-white/40 text-black hover:bg-white/80'
                          }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!customerId) {
                            toast.error('Faça login para favoritar');
                            return;
                          }
                          toggleFavorite.mutate({ customerId, productId: product.id });
                        }}
                      >
                        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                      </Button>

                      {isNew && (
                        <div className="absolute top-3 left-3 bg-white/80 backdrop-blur-md text-[#2D2D2D] text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                          NOVO
                        </div>
                      )}

                      <div className="absolute bottom-3 left-3 right-3 py-2 px-3 backdrop-blur-xl bg-white/20 border border-white/20 rounded-2xl flex items-center justify-between">
                        <span className="text-white text-xs font-bold leading-none">R$ {getMinPrice(product)}</span>
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    <div className="mt-3 px-1">
                      <h3 className="font-bold text-sm text-[#2D2D2D] line-clamp-1 group-hover:text-primary transition-colors">{product.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                        <Star className="w-3 h-3 fill-orange-400 text-orange-400" />
                        <span className="text-[10px] font-light text-muted-foreground">4.8 (120+)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 flex flex-col items-center gap-4">
              <div className="p-6 rounded-full bg-gray-50">
                <Search className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-muted-foreground font-light">Nenhum resultado encontrado</p>
            </div>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default StoreMenu;
