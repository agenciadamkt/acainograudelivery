import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Plus, Check, Loader2, Heart, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProduct } from "@/hooks/useProducts";
import { useProductSizes } from "@/hooks/useProductSizes";
import { useProductToppingCategories } from "@/hooks/useProductToppingCategories";
import { useToppings } from "@/hooks/useToppings";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { FeedbackModal } from '@/components/common/FeedbackModal';

const FormattedText = ({ text }: { text: string }) => {
  if (!text) return null;

  // Split logic to handle **bold** and *italic*
  // Regex captures: (**...**) OR (*...*)
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

  return (
    <span>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={index} className="italic text-gray-700">{part.slice(1, -1)}</em>;
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

const ProductDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addItem, getStoreAwareRoute } = useCart();

  // Load data with safe hooks (hooks that don't crash on error)
  const { data: product, isLoading: loadingProduct } = useProduct(id!);
  const { data: sizes } = useProductSizes(id!);
  const { data: productToppingCategories } = useProductToppingCategories(id);

  // Busca o store_id da categoria do produto para filtrar os toppings corretos
  const productStoreId = (product?.category as any)?.store_id || null;
  const { data: allToppings } = useToppings(undefined, false, productStoreId);

  const [selectedSizeId, setSelectedSizeId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedToppings, setSelectedToppings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTitle, setAddModalTitle] = useState<React.ReactNode>('');

  // Auto-select first size
  useEffect(() => {
    if (sizes && sizes.length > 0 && !selectedSizeId) {
      setSelectedSizeId(sizes[0].id);
    }
  }, [sizes]);

  // Combine rules with items safely
  const toppingsWithRules = useMemo(() => {
    if (!productToppingCategories || !allToppings) return [];

    try {
      return productToppingCategories
        .filter(cat => cat.active && cat.topping_category)
        .map(cat => ({
          ...cat,
          items: allToppings.filter(t => t.category_id === cat.topping_category_id && t.active)
        }));
    } catch (e) {
      console.error("Error matching toppings:", e);
      return [];
    }
  }, [productToppingCategories, allToppings]);

  const handleIncrementTopping = (category: any, toppingId: string) => {
    const currentCategoryCount = category.items.reduce((acc: number, item: any) => acc + (selectedToppings[item.id] || 0), 0);

    if (category.max_quantity > 0 && currentCategoryCount >= category.max_quantity) {
      toast.error(`Limite de ${category.max_quantity} opções atingido neste grupo.`);
      return;
    }

    setSelectedToppings(prev => ({
      ...prev,
      [toppingId]: (prev[toppingId] || 0) + 1
    }));
  };

  const handleDecrementTopping = (toppingId: string) => {
    setSelectedToppings(prev => {
      const newCount = (prev[toppingId] || 0) - 1;
      if (newCount <= 0) {
        const { [toppingId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [toppingId]: newCount };
    });
  };

  const calculateTotalPrice = () => {
    const size = sizes?.find(s => s.id === selectedSizeId);
    if (!size) return 0;

    const toppingsPrice = Object.entries(selectedToppings).reduce((sum, [id, qty]) => {
      const topping = allToppings?.find(t => t.id === id);
      return sum + ((topping?.price || 0) * qty);
    }, 0);

    return (size.price + toppingsPrice) * quantity;
  };

  const validateToppings = () => {
    for (const cat of toppingsWithRules) {
      if (cat.required) {
        const currentCategoryCount = cat.items.reduce((acc: number, item: any) => acc + (selectedToppings[item.id] || 0), 0);

        if (currentCategoryCount < cat.min_quantity) {
          toast.error(`Selecione pelo menos ${cat.min_quantity} opções em ${cat.topping_category.name}`);
          return false;
        }
      }
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!selectedSizeId) {
      toast.error('Por favor, selecione um tamanho');
      return;
    }

    if (!validateToppings()) return;

    const size = sizes?.find(s => s.id === selectedSizeId);
    if (!size) {
      toast.error('Tamanho inválido');
      return;
    }

    if (quantity < 1) {
      toast.error('Quantidade deve ser no mínimo 1');
      return;
    }

    // Flatten toppings based on quantity (e.g., stored as array of objects in cart)
    const selectedToppingList: any[] = [];
    Object.entries(selectedToppings).forEach(([id, qty]) => {
      const topping = allToppings?.find(t => t.id === id);
      if (topping) {
        for (let i = 0; i < qty; i++) {
          selectedToppingList.push({
            id: topping.id,
            name: topping.name,
            price: topping.price || 0
          });
        }
      }
    });

    addItem({
      product_id: product!.id,
      product_name: product!.name,
      product_image: product!.base_image_url,
      size_id: size.id,
      size_name: size.name,
      size_ml: size.ml_size,
      size_price: size.price,
      quantity,
      toppings: selectedToppingList,
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

  if (loadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFDFD] p-6 text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-2">Produto não encontrado</h2>
        <p className="text-gray-500 mb-6">Não foi possível carregar as informações deste produto.</p>
        <Button onClick={() => navigate(-1)} variant="outline">Voltar</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">
      {/* Product Image Header */}
      <div className="relative h-[40vh] w-full overflow-hidden rounded-b-[40px] shadow-sm bg-gray-100">
        {product.base_image_url ? (
          <img
            src={product.base_image_url}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-700 hover:scale-110 ${!product.active ? 'grayscale opacity-70' : ''}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🍓</div>
        )}

        {!product.active && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10 backdrop-blur-[2px]">
            <div className="bg-destructive text-destructive-foreground px-6 py-2 rounded-full font-bold shadow-lg transform -rotate-6 border-2 border-white/20">
              INDISPONÍVEL
            </div>
          </div>
        )}

        <div className="absolute left-4 right-4 flex items-center justify-between z-20 pt-safe" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full bg-white/40 backdrop-blur-md hover:bg-white/60 text-black shadow-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-white/40 backdrop-blur-md hover:bg-white/60 text-black shadow-sm"
          >
            <Heart className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="px-5 py-6 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        {/* Product Info */}
        <div className="space-y-2">
          {product.category && (
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-1 rounded-sm">
              {product.category.name}
            </span>
          )}
          <h1 className="text-2xl font-black text-gray-900 leading-tight">{product.name}</h1>
          {product.description && (
            <div className="text-gray-500 text-sm leading-relaxed">
              <FormattedText text={product.description} />
            </div>
          )}
        </div>

        {/* Sizes */}
        {sizes && sizes.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Escolha o tamanho</h2>
            <RadioGroup value={selectedSizeId} onValueChange={setSelectedSizeId} className="space-y-3">
              {sizes.map((size) => (
                <div
                  key={size.id}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${selectedSizeId === size.id
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  onClick={() => setSelectedSizeId(size.id)}
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={size.id} id={size.id} className="text-primary border-gray-300" />
                    <Label htmlFor={size.id} className="cursor-pointer font-semibold text-gray-700">
                      {size.name}
                      {size.ml_size && <span className="text-gray-400 font-normal text-xs ml-1">({size.ml_size}ml)</span>}
                    </Label>
                  </div>
                  <span className="font-bold text-gray-900">R$ {size.price.toFixed(2)}</span>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Dynamic Topping Groups */}
        {toppingsWithRules.map((category) => {
          // Calculate total selected in this category
          const currentCategoryCount = category.items.reduce((acc: number, item: any) => {
            return acc + (selectedToppings[item.id] || 0);
          }, 0);

          const isCategoryFinished = category.max_quantity > 0 && currentCategoryCount >= category.max_quantity;
          const isCategoryMinSatisfied = category.min_quantity > 0 && currentCategoryCount >= category.min_quantity;

          return (
            <div key={category.id} className="space-y-3">
              <div className="flex items-center justify-between sticky top-0 bg-[#FDFDFD] py-2 z-10">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{category?.topping_category?.name}</h2>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500">
                      {category.max_quantity > 0
                        ? `Escolha até ${category.max_quantity} opções`
                        : 'Sem limite'}
                    </p>
                    {isCategoryFinished && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Concluído</span>}
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  {category.required && !isCategoryMinSatisfied && (
                    <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-bold px-2 py-1 rounded-full uppercase mb-1">
                      Obrigatório
                    </span>
                  )}
                  {currentCategoryCount > 0 && (
                    <span className="text-xs font-medium text-gray-500">
                      {currentCategoryCount} / {category.max_quantity > 0 ? category.max_quantity : '∞'}
                    </span>
                  )}
                </div>
              </div>

              <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl bg-white overflow-hidden shadow-sm">
                {category.items.map((topping: any) => {
                  const qty = selectedToppings[topping.id] || 0;
                  // Disable adding more if bucket is full, unless we are adding to an existing item (if we allowed >1 per item, but here usually it is toggling unique items vs quantity, let's assume quantity per item allowed up to bucket limit)
                  // Actually usually iFood style allows multiple of same item if not boolean. Let's assume quantity allowed.

                  const canAdd = category.max_quantity === 0 || currentCategoryCount < category.max_quantity;

                  return (
                    <div
                      key={topping.id}
                      className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col flex-1" onClick={() => canAdd && handleIncrementTopping(category, topping.id)}>
                        <span className="font-medium text-sm text-gray-800">{topping.name}</span>
                        <span className="text-xs text-gray-500 mt-0.5">
                          {topping.price > 0 ? `+ R$ ${topping.price.toFixed(2)}` : 'Grátis'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {qty > 0 && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDecrementTopping(topping.id); }}
                              className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-bold w-4 text-center">{qty}</span>
                          </>
                        )}

                        <button
                          onClick={(e) => { e.stopPropagation(); handleIncrementTopping(category, topping.id); }}
                          disabled={!canAdd && qty === 0} // Only disable if can't add AND quantity is 0 (can always decrement)
                          className={`w-7 h-7 flex items-center justify-center rounded-full transition-all ${(!canAdd && qty === 0)
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : qty > 0
                              ? 'bg-primary text-white shadow-sm'
                              : 'border border-primary text-primary hover:bg-primary/5'
                            }`}
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        })}

        {/* Notes */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Observações</h2>
          <Textarea
            placeholder="Ex: Sem cebola, capricha no molho..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-white border-gray-200 resize-none h-24 rounded-xl focus:border-primary/50 focus:ring-primary/20 text-sm"
          />
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-40 pb-8 safe-area-bottom">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <div className="flex items-center justify-center bg-gray-100 rounded-full h-12 px-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-10 w-10 full rounded-full hover:bg-white text-gray-600"
              disabled={quantity <= 1}
            >
              <span className="text-xl font-bold">-</span>
            </Button>
            <span className="w-8 text-center font-bold text-gray-900">{quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
              className="h-10 w-10 full rounded-full hover:bg-white text-gray-600"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={handleAddToCart}
            disabled={!product.active}
            className={`flex-1 rounded-full h-12 font-bold text-base shadow-lg shadow-primary/20 transition-all active:scale-95 ${!product.active ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary/90'
              }`}
          >
            <span className="mr-auto">Adicionar</span>
            <span>R$ {calculateTotalPrice().toFixed(2)}</span>
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
    </div>
  );
};

export default ProductDetail;
