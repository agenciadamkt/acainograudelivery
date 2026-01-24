import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Plus, Minus, Trash2, Check, Loader2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import BottomNavigation from "@/components/BottomNavigation";
import { useProducts } from "@/hooks/useProducts";
import { useProductSizes } from "@/hooks/useProductSizes";
import { useToppingCategories } from "@/hooks/useToppingCategories";
import { useToppings } from "@/hooks/useToppings";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { FeedbackModal } from '@/components/common/FeedbackModal';

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addItem, getStoreAwareRoute } = useCart();

  const { data: allProducts, isLoading: loadingProduct } = useProducts(undefined, true);
  const product = allProducts?.find(p => p.id === id);

  const { data: sizes, isLoading: loadingSizes } = useProductSizes(id!);
  const { data: toppingCategories, isLoading: loadingCategories } = useToppingCategories();
  const { data: allToppings } = useToppings();

  const [selectedSizeId, setSelectedSizeId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTitle, setAddModalTitle] = useState<React.ReactNode>('');

  const toppingsByCategory = useMemo(() => {
    if (!toppingCategories || !allToppings) return [];

    return toppingCategories.map(category => ({
      ...category,
      items: allToppings.filter(t => t.category_id === category.id)
    }));
  }, [toppingCategories, allToppings]);

  useEffect(() => {
    if (sizes && sizes.length > 0 && !selectedSizeId) {
      setSelectedSizeId(sizes[0].id);
    }
  }, [sizes]);

  const handleToggleTopping = (category: any, toppingId: string) => {
    const isSelected = selectedToppings.includes(toppingId);

    if (isSelected) {
      setSelectedToppings(prev => prev.filter(id => id !== toppingId));
    } else {
      const categoryToppings = selectedToppings.filter(id =>
        category.items.some((t: any) => t.id === id)
      );

      if (category.max_selections && categoryToppings.length >= category.max_selections) {
        toast.error(
          `Você pode escolher apenas ${category.max_selections} ${category.name.toLowerCase()}`
        );
        return;
      }

      setSelectedToppings(prev => [...prev, toppingId]);
    }
  };

  const calculateTotalPrice = () => {
    const size = sizes?.find(s => s.id === selectedSizeId);
    if (!size) return 0;

    const toppingsPrice = selectedToppings.reduce((sum, toppingId) => {
      const topping = allToppings?.find(t => t.id === toppingId);
      return sum + (topping?.price || 0);
    }, 0);

    return (size.price + toppingsPrice) * quantity;
  };

  const handleAddToCart = () => {
    if (!selectedSizeId) {
      toast.error('Por favor, selecione um tamanho');
      return;
    }

    const size = sizes?.find(s => s.id === selectedSizeId);
    if (!size) {
      toast.error('Tamanho inválido');
      return;
    }

    if (quantity < 1) {
      toast.error('Quantidade deve ser no mínimo 1');
      return;
    }

    if (quantity > 99) {
      toast.error('Quantidade máxima é 99');
      return;
    }

    const selectedToppingData = selectedToppings
      .map(id => allToppings?.find(t => t.id === id))
      .filter(Boolean)
      .map(t => ({ id: t!.id, name: t!.name, price: t!.price || 0 }));

    addItem({
      product_id: product!.id,
      product_name: product!.name,
      product_image: product!.base_image_url,
      size_id: size.id,
      size_name: size.name,
      size_ml: size.ml_size,
      size_price: size.price,
      quantity,
      toppings: selectedToppingData,
      notes: notes || undefined,
    });

    setAddModalTitle(
      <>
        {quantity}x {product!.name}
        {size.ml_size && ` ${size.ml_size}ml`}
        <br />
        <span className="font-bold">adicionado ao carrinho!</span>
      </>
    );
    setIsAddModalOpen(true);
  };

  if (loadingProduct || loadingSizes || loadingCategories) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!product || !product.active) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Produto não disponível</h2>
          <p className="text-muted-foreground mb-4">
            Este produto não foi encontrado ou não está mais disponível.
          </p>
          <Button onClick={() => navigate(getStoreAwareRoute())}>
            Voltar ao Menu
          </Button>
        </Card>
      </div>
    );
  }

  if (!sizes || sizes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Tamanhos indisponíveis</h2>
          <p className="text-muted-foreground mb-4">
            Este produto não possui tamanhos cadastrados no momento.
          </p>
          <Button onClick={() => navigate(getStoreAwareRoute())}>
            Voltar ao Menu
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-40">
      {/* Product Image Header */}
      <div className="relative h-[45vh] w-full overflow-hidden rounded-b-[48px] shadow-lg">
        {product.base_image_url ? (
          <img
            src={product.base_image_url}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-primary/5 flex items-center justify-center">
            <span className="text-9xl grayscale opacity-10">🍓</span>
          </div>
        )}

        {/* Header Controls */}
        <div className="absolute top-8 left-6 right-6 flex items-center justify-between z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full bg-white/40 backdrop-blur-xl border border-white/20 h-11 w-11 shadow-sm text-black hover:bg-white/80"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-white/40 backdrop-blur-xl border border-white/20 h-11 w-11 shadow-sm text-red-500 hover:bg-white/80"
          >
            <Heart className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="px-6 py-8 space-y-8">
        {/* Product Info */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Copo de Açaí</span>
            <div className="flex items-center bg-gray-100 rounded-full px-3 py-1.5 gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="text-gray-400 hover:text-black transition-colors"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="text-sm font-extrabold w-4 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(99, quantity + 1))}
                className="text-gray-900"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-[#2D2D2D] leading-tight pr-10">{product.name}</h1>
          {product.description && (
            <p className="text-gray-400 text-sm leading-relaxed mt-2">{product.description}</p>
          )}
        </div>

        <Card className="p-6 bg-card">
          <h2 className="text-lg font-bold mb-2">Tamanho *</h2>
          <p className="text-sm text-muted-foreground mb-4">Escolha o tamanho ideal para você</p>
          <RadioGroup value={selectedSizeId} onValueChange={setSelectedSizeId}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {sizes.map((size) => (
                <div key={size.id} className="relative">
                  <RadioGroupItem
                    value={size.id}
                    id={size.id}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={size.id}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-gray-100 bg-white p-4 h-full hover:border-primary/30 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/[0.02] cursor-pointer transition-all duration-300 shadow-sm"
                  >
                    <div className="text-3xl mb-3 transform transition-transform peer-data-[state=checked]:scale-110">🥤</div>
                    <div className="text-sm font-bold text-[#2D2D2D] mb-1">{size.name}</div>
                    {size.ml_size && (
                      <div className="text-[10px] text-muted-foreground font-medium mb-2">{size.ml_size}ml</div>
                    )}
                    <div className="text-primary font-black text-sm">
                      R$ {size.price.toFixed(2)}
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </Card>

        {toppingsByCategory.map((category) => (
          <Card key={category.id} className="p-6 bg-card">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold">{category.name}</h2>
              {category.max_selections && (
                <span className="text-xs text-muted-foreground">
                  {selectedToppings.filter(id =>
                    category.items.some(t => t.id === id)
                  ).length} / {category.max_selections}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {category.max_selections
                ? `Escolha até ${category.max_selections} opções`
                : 'Escolha quantas opções quiser'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {category.items.map((topping) => {
                const isSelected = selectedToppings.includes(topping.id);
                const categorySelectedCount = selectedToppings.filter(id =>
                  category.items.some(t => t.id === id)
                ).length;
                const isLimitReached = category.max_selections
                  ? categorySelectedCount >= category.max_selections
                  : false;
                const isDisabled = !isSelected && isLimitReached;

                return (
                  <div key={topping.id} className="relative">
                    <button
                      onClick={() => handleToggleTopping(category, topping.id)}
                      disabled={isDisabled}
                      className={`w-full flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all ${isSelected
                        ? "border-primary bg-primary/5"
                        : isDisabled
                          ? "border-muted bg-muted/50 opacity-50 cursor-not-allowed"
                          : "border-muted bg-background hover:bg-accent cursor-pointer"
                        }`}
                    >
                      {topping.image_url ? (
                        <img
                          src={topping.image_url}
                          alt={topping.name}
                          className="w-12 h-12 object-cover rounded-full mb-2"
                        />
                      ) : (
                        <div className="text-3xl mb-2">🍓</div>
                      )}
                      <div className="text-xs font-medium text-center">{topping.name}</div>
                      {topping.price > 0 && (
                        <div className="text-xs text-primary font-bold mt-1">
                          +R$ {topping.price.toFixed(2)}
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        <Card className="p-6 bg-card">
          <h2 className="text-lg font-bold mb-2">Observações</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Alguma observação especial? (opcional)
          </p>
          <Textarea
            placeholder="Ex: Sem gelo, bem batido..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </Card>
      </div>

      {/* Floating Add to Cart Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[500px] z-50">
        <div className="bg-white/80 backdrop-blur-2xl border border-gray-100 p-4 px-6 rounded-[32px] shadow-2xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Preço Total</span>
            <span className="text-2xl font-extrabold text-[#2D2D2D] leading-none">R$ {calculateTotalPrice().toFixed(2)}</span>
          </div>

          <Button
            onClick={handleAddToCart}
            className="rounded-[22px] px-8 h-14 bg-primary text-white font-extrabold text-sm gap-3 shadow-lg shadow-primary/30"
          >
            <div className="bg-white/20 p-2 rounded-lg">
              <Plus className="w-4 h-4" />
            </div>
            Adicionar
          </Button>
        </div>
      </div>

      <FeedbackModal
        isOpen={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        title={addModalTitle}
      >
        <div className="flex flex-col gap-3 w-full">
          <Button
            onClick={() => navigate('/cart')}
            className="w-full rounded-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
          >
            Ir para o carrinho
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setIsAddModalOpen(false);
              navigate(getStoreAwareRoute());
            }}
            className="w-full rounded-full h-12 text-base font-medium"
          >
            Continuar comprando
          </Button>
        </div>
      </FeedbackModal>

      <BottomNavigation />
    </div>
  );
};

export default ProductDetail;
